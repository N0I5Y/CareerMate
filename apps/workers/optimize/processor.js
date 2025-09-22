// apps/workers/optimize/processor.js
const { getObject, putObject } = require('./storage');
const { ResumeSchema } = require('./schema');
const { addNext } = require('./queue');
const baseLogger = require('./logger');
const getPrompt = require('./prompts');

const OpenAI = require('openai'); // OpenAI SDK v4 (CJS default export)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const OPT_TEXT_CHAR_LIMIT = Number(process.env.OPT_TEXT_CHAR_LIMIT) || 20000;
const JD_ANALYZE_MODEL = process.env.JD_ANALYZE_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';

const hasChild = typeof baseLogger?.child === 'function';
function makeLogger(bindings) {
  if (hasChild) return baseLogger.child({ service: 'optimize-processor', ...bindings });
  return { info: console.log, error: console.error, debug: console.debug, warn: console.warn };
}

function stripJsonFences(text = '') {
  // remove ```json ... ``` or ``` ... ``` if present
  return text.replace(/^\s*```(?:json)?\s*([\s\S]*?)\s*```\s*$/i, '$1').trim();
}

async function repairJson(content) {
  const resp = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0.0,
    messages: [
      { role: 'system', content: 'Fix the following to valid JSON only. Return ONLY valid JSON.' },
      { role: 'user', content },
    ],
  });
  return resp.choices?.[0]?.message?.content || '';
}

// --------- tiny quality metrics (bullets) ----------
function computeBulletMetrics(data, { role }) {
  const bullets = (data.experience || []).flatMap(x => x.bullets || []);
  const wordCounts = bullets.map(b => (b || '').trim().split(/\s+/).filter(Boolean).length);
  const withNums = bullets.filter(b => /\d/.test(b || '')).length;
  const roleHits = role ? new RegExp(role.split(/\W+/).filter(Boolean).join('|'), 'i') : null;
  const tailor = roleHits ? bullets.filter(b => roleHits.test(b)).length : 0;
  return {
    bullets_total: bullets.length,
    bullets_avg_words: bullets.length ? (wordCounts.reduce((a, b) => a + b, 0) / bullets.length) : 0,
    bullets_with_numbers_pct: bullets.length ? Math.round(100 * withNums / bullets.length) : 0,
    tailor_hit_count: tailor,
  };
}

// --------- JD coverage metrics ----------
function normalize(s = '') {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9+\-#\. ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function computeCoverage(resume, jdInfo = {}, { role }) {
  const combined = normalize(
    [
      resume.summary || '',
      ...(resume.skills || []),
      ...(resume.experience || []).flatMap(e => [e.title, e.company, ...(e.bullets || [])]),
      ...(resume.education || []).flatMap(e => [e.degree, e.school, e.dates || '']),
    ].join(' ')
  );

  const bucket = (arr) => (Array.isArray(arr) ? arr : []);
  const must = bucket(jdInfo.must);
  const skills = bucket(jdInfo.skills);
  const tools = bucket(jdInfo.tools);
  const keywords = bucket(jdInfo.keywords);

  const allWanted = Array.from(
    new Set(
      [...must, ...skills, ...tools, ...keywords]
        .map(x => normalize(String(x || '')))
        .filter(Boolean)
    )
  );

  const hit = (kw) => kw && (combined.includes(kw));
  const hits = allWanted.filter(hit);
  const misses = allWanted.filter(x => !hit(x));

  const checkBucket = (arr) => {
    const items = arr.map(x => normalize(x)).filter(Boolean);
    const h = items.filter(hit);
    const m = items.filter(x => !hit(x));
    return { matched: h.length, total: items.length, hits: h, misses: m };
  };

  const mustRes = checkBucket(must);
  const skillRes = checkBucket([...skills, ...tools]);
  const kwRes = checkBucket(keywords);

  return {
    has_jd: !!(jdInfo && (must.length || skills.length || tools.length || keywords.length)),
    coverage_pct: allWanted.length ? Math.round((100 * hits.length) / allWanted.length) : 0,
    matched: hits.length,
    total: allWanted.length,
    hits,
    misses,
    buckets: {
      must: mustRes,
      skills_tools: skillRes,
      keywords: kwRes,
    },
    role,
    jd_title: jdInfo.title || '',
    seniority: jdInfo.seniority || '',
  };
}

// --------- JD quick analysis (single pass) ----------
async function analyzeJD(jdRaw, logger) {
  if (!jdRaw || !jdRaw.trim()) return {};
  try {
    const messages = [
      {
        role: 'system',
        content:
          'Extract key elements from this job description. Return ONLY valid JSON:\n' +
          '{ "title":"", "seniority":"", "must":[], "nice":[], "skills":[], "tools":[], "certs":[], "keywords":[], "anti_patterns":[] }.\n' +
          '"must" are hard requirements; "nice" are preferred; "keywords" is a deduped union of salient phrases likely used by ATS.'
      },
      { role: 'user', content: jdRaw }
    ];
    const req = {
      model: JD_ANALYZE_MODEL,
      temperature: 0.0,
      messages,
      response_format: { type: 'json_object' },
    };
    const resp = await openai.chat.completions.create(req);
    const content = stripJsonFences(resp.choices?.[0]?.message?.content || '{}');
    try {
      return JSON.parse(content);
    } catch (err) {
      // try repair once
      const repaired = stripJsonFences(await repairJson(content));
      return JSON.parse(repaired);
    }
  } catch (err) {
    logger.warn({ err: String(err) }, 'JD analysis failed; continuing without JD');
    return {};
  }
}

module.exports = async function processor(job) {
  const {
    jobId = job.id,
    textKey,
    role,
    company,
    wantPdf,
    prompt,
    jdText, // optional raw JD string
    jdKey,  // optional object key where JD text is stored
    links = [], 
  } = job.data || {};

  const promptName = prompt || process.env.OPT_PROMPT || 'v1';
  const P = await getPrompt(promptName);
  const logger = makeLogger({ jobId, prompt: promptName });

  if (!textKey) throw new Error('Missing textKey in job payload');

  logger.info({ textKey, role, company, prompt: promptName, hasJdText: !!jdText, jdKey }, 'optimize: start');
  const t0 = Date.now();

  // 1) Load resume text (truncate if needed)
  let text = (await getObject(textKey)).toString('utf8');
  if (text.length > OPT_TEXT_CHAR_LIMIT) {
    text = text.slice(0, OPT_TEXT_CHAR_LIMIT);
    logger.warn({ charCount: text.length }, 'text truncated for OpenAI');
  }

  // 2) Load JD (if provided) and run quick analysis
  let jdRaw = '';
  if (jdText && String(jdText).trim()) jdRaw = String(jdText);
  else if (jdKey) jdRaw = (await getObject(jdKey)).toString('utf8');

  let jdInfo = {};
  if (jdRaw.trim()) {
    jdInfo = await analyzeJD(jdRaw, logger);
    // persist JD analysis for traceability
    try {
      await putObject(`jd/${jobId}.json`, Buffer.from(JSON.stringify(jdInfo, null, 2)), 'application/json');
    } catch (e) {
      logger.warn({ err: String(e) }, 'failed to persist JD analysis (non-fatal)');
    }
  }

  // 3) Build request to optimize (pass JD context if the prompt supports it)
  const messages = P.buildMessages
    ? P.buildMessages({ text, role, company, jdInfo, jdRaw, links })
    : [
        {
          role: 'system',
          content:
            'You are a world-class resume optimizer. Output ONLY valid JSON with keys: ' +
            'name, contact:{email,phone}, summary, ' +
            'experience:[{title,company,dates,bullets[]}], ' +
            'education:[{degree,school,dates}], skills[]. ' +
            'Rules: (1) bullets ≤ 15 words, start with action verbs; (2) quantify impact; ' +
            '(3) tailor to the target role/company; ' +
            '(4) DO NOT invent skills not evidenced in the source resume; avoid hallucinations.'
        },
        {
          role: 'user',
          content:
`Target Role: ${role || ''}
Target Company: ${company || ''}

Job Description (raw):
${jdRaw || '(none provided)'}
${links?.length ? `Links (portfolio/GitHub/LinkedIn/etc):\n${links.slice(0, 20).map(x => `- ${x}`).join('\n')}\n` : ''}
JD summary for prioritization (JSON):
${JSON.stringify({
  title: jdInfo.title || '',
  must: jdInfo.must || [],
  nice: jdInfo.nice || [],
  skills: jdInfo.skills || [],
  tools: jdInfo.tools || [],
  certs: jdInfo.certs || [],
  keywords: jdInfo.keywords || [],
})}

SOURCE RESUME:
${text}`
        }
      ];

  const req = {
    model: P.model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: (P.temperature ?? 0.2),
    messages,
  };
  if (P.useJsonMode) req.response_format = { type: 'json_object' };

  // 4) Call OpenAI to optimize
  let content;
  try {
    const resp = await openai.chat.completions.create(req);
    content = stripJsonFences(resp.choices?.[0]?.message?.content || '');
  } catch (err) {
    logger.error({ err: String(err) }, 'OpenAI call failed');
    throw err;
  }

  // 5) Parse/repair JSON
  let obj;
  try {
    obj = JSON.parse(content);
  } catch (err) {
    logger.warn({ err: String(err) }, 'initial JSON parse failed; attempting repair');
    const repaired = stripJsonFences(await repairJson(content));
    try {
      obj = JSON.parse(repaired);
    } catch (err2) {
      logger.error({ err2: String(err2) }, 'JSON repair failed');
      throw new Error('OpenAI did not return valid JSON');
    }
  }

  // 6) Validate with Zod
  const result = ResumeSchema.safeParse(obj);
  if (!result.success) {
    logger.error({ issues: result.error.issues }, 'resume schema validation failed');
    throw new Error('Resume schema validation failed: ' + JSON.stringify(result.error.issues));
  }

  // 7) Persist artifacts (include prompt name for A/B testing)
  const jsonKey = `json/${jobId}.${promptName}.json`;
  await putObject(jsonKey, Buffer.from(JSON.stringify(result.data, null, 2)), 'application/json');

  // 8) Metrics: bullets + JD coverage
  const bulletMetrics = computeBulletMetrics(result.data, { role, company });
  const coverage = computeCoverage(result.data, jdInfo, { role, company });
  const metrics = { ...bulletMetrics, jd: coverage };
  await putObject(
    `metrics/${jobId}.${promptName}.json`,
    Buffer.from(JSON.stringify(metrics, null, 2)),
    'application/json'
  );

  // 9) Enqueue templater (downstream reads the exact jsonKey we wrote)
  await addNext({ jobId, jsonKey, role, company, wantPdf: !!wantPdf, prompt: promptName });

  logger.info({ jsonKey, ms: Date.now() - t0 }, 'optimize: complete');
  return { jsonKey, prompt: promptName };
};
