// apps/workers/optimize/prompts/v2.js
module.exports = {
  name: "v2",
  model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  temperature: 0.1,
  useJsonMode: true, // keep JSON mode on
  buildMessages({ text, role, company, jdInfo = {}, jdRaw = "", links = [] }) {
    const system = `
You are a world-class resume optimizer.

Output: return ONLY valid JSON (no markdown, no comments) and include ALL keys exactly as below.
If a value is unknown, use "" (empty string) for strings and [] for arrays. Never use null.

Schema (exact keys and types):
{
  "name": "",
  "contact": { "email": "", "phone": "" },
  "summary": "",
  "experience": [
    { "title": "", "company": "", "dates": "", "bullets": [] }
  ],
  "education": [
    { "degree": "", "school": "", "dates": "" }
  ],
  "skills": []
}

Writing rules:
- Summary ≤ 35 words.
- Bullets: ≤ 12 words when possible; start with an action verb; quantify impact.
- At least 70% of bullets must contain a number (%, $, #).
- Prefer outcome-first phrasing (impact → how).
- Remove generic filler. Do not invent facts; only rephrase what’s present.
- Tailor to the target role/company and prioritize JD "must", "skills", and "tools" if provided.
`.trim();

    const jdFocus = {
      title: jdInfo.title || "",
      must: jdInfo.must || [],
      skills: jdInfo.skills || [],
      tools: jdInfo.tools || [],
      keywords: jdInfo.keywords || [],
    };

    const linksBlock = links.length
      ? `\nLinks:\n${links.slice(0, 20).map((u) => `- ${u}`).join("\n")}\n`
      : "";

    const user = `
Target Role: ${role || ""}
Target Company: ${company || ""}

Job Description (raw):
${jdRaw || "(none provided)"}

JD focus (JSON):
${JSON.stringify(jdFocus)}

${linksBlock}---BEGIN RESUME TEXT---
${text}
---END RESUME TEXT---
`.trim();

    return [{ role: "system", content: system }, { role: "user", content: user }];
  },
};
