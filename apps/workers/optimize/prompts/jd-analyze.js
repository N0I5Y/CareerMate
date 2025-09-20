module.exports = {
  name: 'jd-analyze',
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  temperature: 0.0,
  useJsonMode: true,
  buildMessages: ({ jdRaw }) => ([
    {
      role: 'system',
      content:
        'Extract key elements from the job description. Return ONLY valid JSON: ' +
        '{ title, must:[], nice:[], skills:[], tools:[], certs:[], keywords:[], ' +
        'seniority:"", anti_patterns:[] }. ' +
        '"must" are hard requirements; "nice" are preferred; "keywords" is a deduped union ' +
        'of important phrases likely used by ATS.'
    },
    { role: 'user', content: jdRaw }
  ]),
};
