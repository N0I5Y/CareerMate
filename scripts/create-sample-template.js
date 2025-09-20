#!/usr/bin/env node

/**
 * Create a sample resume template with correct placeholders
 * This creates a DOCX template that matches the data structure from the optimize worker
 */

const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');

// Sample template content with correct placeholders
const templateContent = `
RESUME

Name: [[name]]
Email: [[contact.email]]
Phone: [[contact.phone]]

PROFESSIONAL SUMMARY
[[summary]]

WORK EXPERIENCE
[[#experience]]
[[title]] at [[company]]
[[dates]]
[[#bullets]]
• [[.]]
[[/bullets]]

[[/experience]]

EDUCATION
[[#education]]
[[degree]]
[[school]] - [[dates]]
[[/education]]

SKILLS
[[#skills]]
• [[.]]
[[/skills]]
`;

console.log('📄 Sample Resume Template Structure');
console.log('==================================');
console.log('This template uses the following placeholders:');
console.log('');
console.log('• [[name]] - Full name');
console.log('• [[contact.email]] - Email address');
console.log('• [[contact.phone]] - Phone number');
console.log('• [[summary]] - Professional summary');
console.log('• [[#experience]] - Work experience array');
console.log('  • [[title]] - Job title');
console.log('  • [[company]] - Company name');
console.log('  • [[dates]] - Employment dates');
console.log('  • [[#bullets]] - Achievement bullets');
console.log('• [[#education]] - Education array');
console.log('  • [[degree]] - Degree name');
console.log('  • [[school]] - School name');
console.log('  • [[dates]] - Education dates');
console.log('• [[#skills]] - Skills array');
console.log('');
console.log('📋 Template Content Preview:');
console.log('----------------------------');
console.log(templateContent);
console.log('');
console.log('💡 To create a proper DOCX template:');
console.log('1. Create a new Word document');
console.log('2. Add the placeholders above in your desired format');
console.log('3. Save as .docx');
console.log('4. Upload via POST /api/templates');
console.log('');
console.log('🔧 Data Structure Expected:');
console.log(JSON.stringify({
  name: "John Doe",
  contact: {
    email: "john@example.com",
    phone: "(555) 123-4567"
  },
  summary: "Experienced professional with...",
  experience: [
    {
      title: "Senior Developer",
      company: "Tech Corp",
      dates: "2020-2023",
      bullets: [
        "Developed scalable applications",
        "Led team of 5 developers"
      ]
    }
  ],
  education: [
    {
      degree: "Bachelor of Computer Science",
      school: "University of Technology",
      dates: "2016-2020"
    }
  ],
  skills: [
    "JavaScript",
    "React",
    "Node.js"
  ]
}, null, 2));