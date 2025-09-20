const { z } = require('zod');

const ResumeSchema = z.object({
  name: z.string().min(1),
  contact: z.object({
    email: z.string().email(),
    phone: z.string().min(5),
  }),
  summary: z.string(),
  experience: z.array(z.object({
    title: z.string(),
    company: z.string(),
    dates: z.string(),
    bullets: z.array(z.string()),
  })),
  education: z.array(z.object({
    degree: z.string(),
    school: z.string(),
    dates: z.string(),
  })),
  skills: z.array(z.string()),
});

module.exports = { ResumeSchema };
