module.exports = {
  name: 'vjd1',
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  temperature: 0.2,
  useJsonMode: true,
  buildMessages: ({ text, role = '', company = '', jdInfo = {}, jdRaw = '' }) => {
    const jdSummary = JSON.stringify({
      title: jdInfo.title,
      must: jdInfo.must || [],
      nice: jdInfo.nice || [],
      skills: jdInfo.skills || [],
      tools: jdInfo.tools || [],
      certs: jdInfo.certs || [],
      keywords: jdInfo.keywords || []
    });
    return [
      {
        role: 'system',
        content:
          'You are a world-class resume optimizer. Output ONLY valid JSON with keys: ' +
          'name, contact:{email,phone}, summary, ' +
          'experience:[{title,company,dates,bullets[]}], ' +
          'education:[{degree,school,dates}], skills[]. ' +
          'Rules: (1) bullets ≤ 15 words, start with action verbs; (2) quantify impact; ' +
          '(3) tailor wording to JD must-have keywords; (4) DO NOT invent skills not evidenced ' +
          'in the source resume; if a JD keyword is missing, omit it from skills and reflect relevance ' +
          'indirectly in bullets only if plausible; avoid hallucinations.'
      },
      {
        role: 'user',
        content:
`Target Role: ${role}
Target Company: ${company}

JD (raw):
${jdRaw}

JD (extracted summary to prioritize):
${jdSummary}

SOURCE RESUME:
${text}`
      }
    ];
  },
};
