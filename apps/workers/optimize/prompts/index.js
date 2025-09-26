// apps/workers/optimize/prompts/index.js
const fs = require('fs');
const path = require('path');
const prisma = require('../lib/database');

// Cache for dynamically loaded prompts
const promptCache = new Map();

async function fetchPromptFromDatabase(name) {
  if (!prisma) return null;
  
  try {
    const prompt = await prisma.prompt.findUnique({
      where: { name, isActive: true }
    });
    
    if (!prompt) return null;
    
    // Update usage stats
    prisma.prompt.update({
      where: { id: prompt.id },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date()
      }
    }).catch(err => console.warn('[prompts] Failed to update usage stats:', err.message));
    
    // Convert database prompt to module format
    return {
      name: prompt.name,
      model: prompt.model,
      temperature: prompt.temperature,
      useJsonMode: true,
      _formMetadata: prompt.formConfig,
      buildMessages({ text, role, company, jdInfo = {}, jdRaw = "", links = [] }) {
        const schema = `{
  "name": string | null,
  "contact": { "email": string | null, "phone": string | null },
  "summary": string | null,
  "experience": [
    { "title": string | null, "company": string | null, "dates": string | null, "bullets": string[] }
  ],
  "education": [
    { "degree": string | null, "school": string | null, "dates": string | null }
  ],
  "skills": string[]
}`;

        const baseRules = prompt.baseRules;
        const jdSummary = JSON.stringify({
          title: jdInfo.title || "",
          must: jdInfo.must || [],
          nice: jdInfo.nice || [],
          skills: jdInfo.skills || [],
          tools: jdInfo.tools || [],
          certs: jdInfo.certs || [],
          keywords: jdInfo.keywords || [],
        }, null, 2);

        const linksBlock = (Array.isArray(links) && links.length)
          ? "\nLinks (reference only; do NOT add to JSON):\n" + links.slice(0,20).map(x => "- " + x).join("\n") + "\n"
          : "";

        const system = baseRules.replace(/\${schema}/g, schema);
        const user = `
Target Role: ${role || ""}
Target Company: ${company || ""}

Job Description (raw, optional):
${jdRaw || "(none provided)"}

JD Summary (prioritize wording; do NOT invent facts):
${jdSummary}
${linksBlock}
---BEGIN RESUME TEXT---
${text}
---END RESUME TEXT---
`.trim();

        return [
          { role: "system", content: system },
          { role: "user", content: user },
        ];
      }
    };
  } catch (error) {
    console.warn(`[prompts] Database lookup failed for "${name}":`, error.message);
    return null;
  }
}

async function fetchPromptFromAPI(name) {
  try {
    const API_BASE = process.env.API_BASE || 'https://careermate-production.up.railway.app';
    const response = await fetch(`${API_BASE}/api/prompt-versions/${name}`);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    if (data.code) {
      // Evaluate the code to get the module
      const module = { exports: {} };
      eval(data.code);
      return module.exports;
    }
  } catch (error) {
    console.warn(`[prompts] Failed to fetch "${name}" from API: ${error.message}`);
  }
  return null;
}

module.exports = async function getPrompt(name = 'v1') {
  const dir = __dirname;
  const wanted = String(name).toLowerCase();

  // Check cache first
  if (promptCache.has(wanted)) {
    return promptCache.get(wanted);
  }

  // 1. Try database first (fastest for production)
  if (prisma) {
    const dbPrompt = await fetchPromptFromDatabase(wanted);
    if (dbPrompt) {
      console.log(`[prompts] Successfully loaded "${wanted}" from database`);
      promptCache.set(wanted, dbPrompt);
      return dbPrompt;
    }
  }

  // 2. Try local file system
  const candidate = path.join(dir, `${wanted}.js`);
  if (fs.existsSync(candidate)) {
    try { 
      // Clear require cache to get fresh version
      delete require.cache[require.resolve(candidate)];
      const filePrompt = require(candidate);
      console.log(`[prompts] Successfully loaded "${wanted}" from local file`);
      promptCache.set(wanted, filePrompt);
      return filePrompt;
    }
    catch (e) {
      console.warn(`[prompts] Failed to load local "${wanted}": ${e.message}`);
    }
  }

  // 3. Try API as fallback
  console.log(`[prompts] "${wanted}" not found locally, trying API...`);
  const apiPrompt = await fetchPromptFromAPI(wanted);
  if (apiPrompt) {
    console.log(`[prompts] Successfully loaded "${wanted}" from API`);
    promptCache.set(wanted, apiPrompt);
    return apiPrompt;
  }

  console.warn(`[prompts] Missing "${wanted}" in database, files, and API. Falling back to v1.`);

  // Fallback to v1
  const v1 = path.join(dir, 'v1.js');
  if (fs.existsSync(v1)) {
    const fallback = require(v1);
    console.log(`[prompts] Using v1 fallback for "${wanted}"`);
    return fallback;
  }

  // Last-ditch tiny default so the worker doesn't die
  console.warn('[prompts] Missing "v1". Using minimal built-in prompt.');
  return {
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0.2,
    useJsonMode: true,
    buildMessages: ({ text, role, company, jdText }) => ([
      { role: 'system',
        content: 'World-class resume coach. Return ONLY valid JSON: name, contact:{email,phone}, summary, experience:[{title,company,dates,bullets[]}], education:[{degree,school,dates}], skills[].' },
      { role: 'user',
        content: `Role: ${role||''}\nCompany: ${company||''}\n${jdText ? `JD:\n${jdText}\n` : ''}---RESUME---\n${text}` }
    ])
  };
};
