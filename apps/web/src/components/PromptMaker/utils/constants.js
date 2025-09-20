// AI Model options
export const AI_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Recommended)', description: 'Fast and cost-effective' },
  { value: 'gpt-4o', label: 'GPT-4o', description: 'Latest and most capable' },
  { value: 'gpt-4', label: 'GPT-4', description: 'High quality reasoning' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast and affordable' }
];

// Temperature presets
export const TEMPERATURE_PRESETS = [
  { value: 0, label: 'Deterministic', description: 'Always the same output' },
  { value: 0.2, label: 'Focused (Recommended)', description: 'Consistent with slight variation' },
  { value: 0.5, label: 'Balanced', description: 'Good balance of consistency and creativity' },
  { value: 0.8, label: 'Creative', description: 'More varied and creative outputs' },
  { value: 1.0, label: 'Very Creative', description: 'Highly varied outputs' }
];

// Default form values
export const DEFAULT_FORM_VALUES = {
  instructions: '',
  name: '',
  model: 'gpt-4o-mini',
  temperature: 0.2,
  force: false
};

// Validation patterns
export const VALIDATION_PATTERNS = {
  promptName: /^[a-z0-9_.-]+$/i
};

// Sample resume text for testing
export const SAMPLE_RESUME_TEXT = `John Doe
Software Engineer
john.doe@email.com | (555) 123-4567

EXPERIENCE
Senior Software Engineer | Tech Corp | 2020-Present
• Developed and maintained web applications using React and Node.js
• Led a team of 3 junior developers on multiple projects
• Improved application performance by 40% through code optimization
• Implemented CI/CD pipelines reducing deployment time by 60%

Software Engineer | StartupXYZ | 2018-2020
• Built RESTful APIs using Python and Django
• Collaborated with product team to define technical requirements
• Wrote comprehensive unit tests achieving 90% code coverage

EDUCATION
Bachelor of Science in Computer Science | University of Technology | 2014-2018

SKILLS
JavaScript, React, Node.js, Python, Django, AWS, Docker, Git`;

// Common job roles for quick selection
export const COMMON_JOB_ROLES = [
  'Software Engineer',
  'Senior Software Engineer',
  'Full Stack Developer',
  'Frontend Developer',
  'Backend Developer',
  'DevOps Engineer',
  'Data Scientist',
  'Product Manager',
  'UX Designer',
  'Marketing Manager'
];

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error: Unable to connect to the server',
  UNAUTHORIZED: 'Unauthorized: Please check your admin token',
  FORBIDDEN: 'Forbidden: Prompt writing is disabled or insufficient permissions',
  NOT_FOUND: 'Prompt not found',
  CONFLICT: 'Prompt already exists with this name',
  VALIDATION_INSTRUCTIONS: 'Instructions are required',
  VALIDATION_NAME: 'Name can only contain letters, numbers, underscores, dots, and hyphens',
  VALIDATION_TEMPERATURE: 'Temperature must be between 0 and 2',
  DELETE_BUILTIN: 'Cannot delete builtin prompts'
};