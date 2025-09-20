// apps/workers/optimize/prompts/index.js
const fs = require('fs');
const path = require('path');

module.exports = function getPrompt(name = 'v1') {
  const dir = __dirname;
  const wanted = String(name).toLowerCase();

  const candidate = path.join(dir, `${wanted}.js`);
  if (fs.existsSync(candidate)) {
    try { return require(candidate); }
    catch (e) {
      console.warn(`[prompts] Failed to load "${wanted}": ${e.message}. Falling back to v1.`);
    }
  } else {
    console.warn(`[prompts] Missing "${wanted}". Falling back to v1.`);
  }

  const v1 = path.join(dir, 'v1.js');
  if (fs.existsSync(v1)) return require(v1);

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
