// apps/workers/optimize/prompts/index.js
const fs = require('fs');
const path = require('path');

// Cache for dynamically loaded prompts
const promptCache = new Map();

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

  // First, try local file system
  const candidate = path.join(dir, `${wanted}.js`);
  if (fs.existsSync(candidate)) {
    try { 
      // Clear require cache to get fresh version
      delete require.cache[require.resolve(candidate)];
      return require(candidate); 
    }
    catch (e) {
      console.warn(`[prompts] Failed to load local "${wanted}": ${e.message}`);
    }
  }

  // If not found locally, try to fetch from API
  if (promptCache.has(wanted)) {
    return promptCache.get(wanted);
  }

  console.log(`[prompts] "${wanted}" not found locally, trying API...`);
  const apiPrompt = await fetchPromptFromAPI(wanted);
  if (apiPrompt) {
    console.log(`[prompts] Successfully loaded "${wanted}" from API`);
    promptCache.set(wanted, apiPrompt);
    return apiPrompt;
  }

  console.warn(`[prompts] Missing "${wanted}" both locally and via API. Falling back to v1.`);

  // Fallback to v1
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
