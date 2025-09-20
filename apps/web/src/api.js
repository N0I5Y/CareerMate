const API_BASE = import.meta.env.VITE_API_BASE || window.location.origin;

export async function uploadTemplate(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/api/templates`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error('Template upload failed');
  return res.json();
}

export async function submitResume({ file, role, company, prompt, jdText, templateKey }) {
  const form = new FormData();
  form.append('file', file);
  if (role) form.append('role', role);
  if (company) form.append('company', company);
  if (prompt) form.append('prompt', prompt);
  if (jdText) form.append('jdText', jdText);
  if (templateKey) form.append('templateKey', templateKey);
  const res = await fetch(`${API_BASE}/api/resumes`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error('Resume upload failed');
  return res.json();
}

export async function getStatus(jobId) {
  const res = await fetch(`${API_BASE}/api/resumes/${jobId}`);
  if (!res.ok) throw new Error('Status fetch failed');
  return res.json();
}

export async function urlExists(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}
