import React, { useState, useRef } from 'react';
import { uploadTemplate, submitResume, urlExists } from '../api';

const API_BASE = import.meta.env.VITE_API_BASE || window.location.origin;

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function ResumeOptimizer() {
  // Template upload state
  const [templateFile, setTemplateFile] = useState(null);
  const [templateKey, setTemplateKey] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [templateError, setTemplateError] = useState('');
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);

  // Resume upload state
  const [resumeFile, setResumeFile] = useState(null);
  const [role, setRole] = useState(localStorage.getItem('role') || '');
  const [company, setCompany] = useState(localStorage.getItem('company') || '');
  const [prompt, setPrompt] = useState(localStorage.getItem('prompt') || 'v1');
  const [jdText, setJdText] = useState('');
  const [resumeError, setResumeError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Results state
  const [jobId, setJobId] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [docxUrl, setDocxUrl] = useState('');
  const [polling, setPolling] = useState(false);
  const [pollError, setPollError] = useState('');
  const pollRef = useRef(null);

  // Handle template upload
  async function handleUploadTemplate(e) {
    e.preventDefault();
    setTemplateError('');
    setIsUploadingTemplate(true);
    setTemplateKey('');
    setTemplateId('');
    try {
      if (!templateFile) throw new Error('Select a .docx file');
      if (!templateFile.name.endsWith('.docx')) throw new Error('File must be .docx');
      const res = await uploadTemplate(templateFile);
      setTemplateKey(res.templateKey);
      setTemplateId(res.templateId);
    } catch (err) {
      setTemplateError(err.message);
    } finally {
      setIsUploadingTemplate(false);
    }
  }

  // Handle resume upload
  async function handleSubmit(e) {
    e.preventDefault();
    setResumeError('');
    setIsSubmitting(true);
    setJobId('');
    setPdfUrl('');
    setDocxUrl('');
    setPollError('');
    if (!resumeFile) {
      setResumeError('Select a resume file');
      setIsSubmitting(false);
      return;
    }
    if (!['.pdf', '.doc', '.docx', '.txt'].some(ext => resumeFile.name.endsWith(ext))) {
      setResumeError('File must be .pdf, .doc, .docx, or .txt');
      setIsSubmitting(false);
      return;
    }
    try {
      // Persist last-used values
      localStorage.setItem('role', role);
      localStorage.setItem('company', company);
      localStorage.setItem('prompt', prompt);
      const res = await submitResume({ file: resumeFile, role, company, prompt, jdText, templateKey });
      setJobId(res.jobId);
      startPolling(res.jobId);
    } catch (err) {
      setResumeError(err.message);
      setIsSubmitting(false);
    }
  }

  // Polling for artifacts
  async function startPolling(jobId) {
    setPolling(true);
    setPollError('');
    pollRef.current && clearInterval(pollRef.current);
    
    const startTime = Date.now();
    const maxWaitTime = 5 * 60 * 1000; // 5 minutes timeout
    
    pollRef.current = setInterval(async () => {
      try {
        const pdf = `${API_BASE}/api/resumes/${jobId}/pdf`;
        const docx = `${API_BASE}/api/resumes/${jobId}/docx`;
        const [pdfOk, docxOk] = await Promise.all([urlExists(pdf), urlExists(docx)]);
        if (pdfOk) setPdfUrl(pdf);
        if (docxOk) setDocxUrl(docx);
        
        // Check for timeout
        const elapsed = Date.now() - startTime;
        if (elapsed > maxWaitTime) {
          clearInterval(pollRef.current);
          setPolling(false);
          setIsSubmitting(false);
          if (!pdfOk && !docxOk) {
            setPollError('Timeout: Resume processing is taking longer than expected. Please try again.');
          } else {
            // At least one format is ready, so we can stop polling
            setPollError('');
          }
          return;
        }
        
        // Wait for both PDF and DOCX to be ready before stopping polling
        if (pdfOk && docxOk) {
          clearInterval(pollRef.current);
          setPolling(false);
          setIsSubmitting(false);
        }
      } catch (err) {
        setPollError('Polling error: ' + err.message);
        clearInterval(pollRef.current);
        setPolling(false);
        setIsSubmitting(false);
      }
    }, 1500);
  }

  // Cleanup polling on unmount
  React.useEffect(() => {
    return () => pollRef.current && clearInterval(pollRef.current);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-2 bg-gray-50">
      <div className="w-full max-w-xl space-y-6 mt-4">
        {/* Card 1: Upload Template */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-2">Upload Template (optional)</h2>
          <form className="flex flex-col gap-3" onSubmit={handleUploadTemplate}>
            <input
              type="file"
              accept=".docx"
              onChange={e => setTemplateFile(e.target.files[0])}
              disabled={isUploadingTemplate}
              className="file:mr-2 file:py-1 file:px-3 file:rounded file:border file:border-gray-300"
            />
            <button
              type="submit"
              disabled={isUploadingTemplate || !templateFile}
              className={classNames(
                'bg-blue-600 text-white rounded px-4 py-2 font-medium',
                isUploadingTemplate || !templateFile ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
              )}
            >
              {isUploadingTemplate ? 'Uploading...' : 'Upload Template'}
            </button>
            {templateError && <div className="text-red-600 text-sm">{templateError}</div>}
            {templateKey && templateId && (
              <div className="mt-2 text-sm">
                <div>templateKey: <span className="font-mono">{templateKey}</span></div>
                <a
                  href={`${API_BASE}/api/templates/${templateId}/preview.pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 underline mt-1 inline-block"
                >
                  Preview PDF
                </a>
              </div>
            )}
          </form>
        </div>

        {/* Card 2: Upload Resume & Options */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-2">Upload Resume & Options</h2>
          <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={e => setResumeFile(e.target.files[0])}
              disabled={isSubmitting}
              className="file:mr-2 file:py-1 file:px-3 file:rounded file:border file:border-gray-300"
            />
            <input
              type="text"
              placeholder="Role (e.g. Software Engineer)"
              value={role}
              onChange={e => setRole(e.target.value)}
              disabled={isSubmitting}
              className="border rounded px-3 py-2"
            />
            <input
              type="text"
              placeholder="Company (optional)"
              value={company}
              onChange={e => setCompany(e.target.value)}
              disabled={isSubmitting}
              className="border rounded px-3 py-2"
            />
            <input
              type="text"
              placeholder="Prompt (default: v1)"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              disabled={isSubmitting}
              className="border rounded px-3 py-2"
            />
            <textarea
              placeholder="Paste JD text (optional)"
              value={jdText}
              onChange={e => setJdText(e.target.value)}
              disabled={isSubmitting}
              className="border rounded px-3 py-2 min-h-[80px]"
            />
            <button
              type="submit"
              disabled={isSubmitting || !resumeFile}
              className={classNames(
                'bg-green-600 text-white rounded px-4 py-2 font-medium',
                isSubmitting || !resumeFile ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'
              )}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Resume'}
            </button>
            {resumeError && <div className="text-red-600 text-sm">{resumeError}</div>}
          </form>
        </div>

        {/* Card 3: Results */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-2">Results</h2>
          {jobId && <div className="mb-2 text-sm">Job ID: <span className="font-mono">{jobId}</span></div>}
          <div className="flex gap-3 mb-2">
            <a
              href={docxUrl}
              download
              className={classNames(
                'bg-blue-500 text-white px-3 py-2 rounded',
                !docxUrl ? 'opacity-50 pointer-events-none' : 'hover:bg-blue-600'
              )}
              tabIndex={docxUrl ? 0 : -1}
            >
              Download DOCX
            </a>
            <a
              href={pdfUrl}
              download
              className={classNames(
                'bg-red-500 text-white px-3 py-2 rounded',
                !pdfUrl ? 'opacity-50 pointer-events-none' : 'hover:bg-red-600'
              )}
              tabIndex={pdfUrl ? 0 : -1}
            >
              Download PDF
            </a>
          </div>
          {polling && (
            <div className="text-gray-500 text-sm flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-gray-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
              Waiting for results...
            </div>
          )}
          {pollError && <div className="text-red-600 text-sm">{pollError}</div>}
          {pdfUrl && (
            <div className="mt-4">
              <iframe
                src={pdfUrl}
                title="PDF Preview"
                className="w-full min-h-[500px] border rounded"
              />
            </div>
          )}
        </div>
      </div>
      <footer className="mt-8 text-xs text-gray-500">
        API base: <span className="font-mono">{API_BASE}</span>
      </footer>
    </div>
  );
}