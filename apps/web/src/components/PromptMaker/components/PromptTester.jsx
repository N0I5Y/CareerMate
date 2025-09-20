import React, { useState } from 'react';
import { usePromptTest } from '../hooks/usePromptTest';

const PromptTester = ({ prompt, onClose }) => {
  const [testData, setTestData] = useState({
    resumeText: '',
    role: '',
    company: '',
    jdText: ''
  });

  const {
    testing,
    testResult,
    error,
    runDirectTest,
    clearTest,
    clearError
  } = usePromptTest();

  const handleInputChange = (field, value) => {
    setTestData(prev => ({ ...prev, [field]: value }));
  };

  const handleTest = async (e) => {
    e.preventDefault();
    
    if (!testData.resumeText.trim() || !testData.role.trim()) {
      return;
    }

    clearError();
    
    const testPayload = {
      promptLabel: prompt.label,
      resumeText: testData.resumeText.trim(),
      role: testData.role.trim(),
      company: testData.company.trim(),
      jdText: testData.jdText.trim()
    };

    await runDirectTest(testPayload);
  };

  const handleClearResults = () => {
    clearTest();
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const sampleResumeText = `John Doe
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

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Test Prompt: {prompt.label}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Test your prompt with sample resume data to see how it performs
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <div className="space-y-6">
            <h3 className="text-md font-medium text-gray-900">Test Input</h3>
            
            <form onSubmit={handleTest} className="space-y-4">
              {/* Resume Text */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="resumeText" className="block text-sm font-medium text-gray-700">
                    Resume Text *
                  </label>
                  <button
                    type="button"
                    onClick={() => handleInputChange('resumeText', sampleResumeText)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Use Sample
                  </button>
                </div>
                <textarea
                  id="resumeText"
                  rows={8}
                  value={testData.resumeText}
                  onChange={(e) => handleInputChange('resumeText', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Paste resume text here..."
                  required
                />
              </div>

              {/* Role */}
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                  Target Role *
                </label>
                <input
                  type="text"
                  id="role"
                  value={testData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Senior Software Engineer"
                  required
                />
              </div>

              {/* Company */}
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                  Target Company (optional)
                </label>
                <input
                  type="text"
                  id="company"
                  value={testData.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Google, Microsoft"
                />
              </div>

              {/* Job Description */}
              <div>
                <label htmlFor="jdText" className="block text-sm font-medium text-gray-700 mb-2">
                  Job Description (optional)
                </label>
                <textarea
                  id="jdText"
                  rows={4}
                  value={testData.jdText}
                  onChange={(e) => handleInputChange('jdText', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Paste job description for better optimization..."
                />
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-3">
                <button
                  type="submit"
                  disabled={testing || !testData.resumeText.trim() || !testData.role.trim()}
                  className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    testing || !testData.resumeText.trim() || !testData.role.trim()
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {testing ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Test Prompt</span>
                    </>
                  )}
                </button>
                
                {(testResult || error) && (
                  <button
                    type="button"
                    onClick={handleClearResults}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Clear Results
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Results */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-md font-medium text-gray-900">Test Results</h3>
              {testResult && (
                <button
                  onClick={() => copyToClipboard(JSON.stringify(testResult.result, null, 2))}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copy JSON</span>
                </button>
              )}
            </div>

            {/* Loading State */}
            {testing && (
              <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <p className="text-gray-600">Processing resume with your prompt...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-red-400 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-red-800">Test Failed</h4>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Success State */}
            {testResult && testResult.success && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-green-800">Test Completed</span>
                  </div>
                  {testResult.executionTime && (
                    <span className="text-sm text-green-600">
                      {testResult.executionTime}ms
                    </span>
                  )}
                </div>

                {/* JSON Output */}
                <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-96">
                  <pre className="text-sm text-gray-100">
                    {JSON.stringify(testResult.result, null, 2)}
                  </pre>
                </div>

                {/* Formatted Preview */}
                {testResult.result && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <h4 className="font-medium text-gray-900">Formatted Preview</h4>
                    
                    {testResult.result.name && (
                      <div>
                        <span className="font-semibold">{testResult.result.name}</span>
                      </div>
                    )}
                    
                    {testResult.result.contact && (
                      <div className="text-sm text-gray-600">
                        {testResult.result.contact.email} | {testResult.result.contact.phone}
                      </div>
                    )}
                    
                    {testResult.result.summary && (
                      <div>
                        <h5 className="font-medium text-gray-800">Summary</h5>
                        <p className="text-sm text-gray-700">{testResult.result.summary}</p>
                      </div>
                    )}
                    
                    {testResult.result.experience && testResult.result.experience.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-800">Experience</h5>
                        {testResult.result.experience.map((exp, index) => (
                          <div key={index} className="ml-2 mb-2">
                            <div className="text-sm font-medium">{exp.title} | {exp.company}</div>
                            <div className="text-xs text-gray-600">{exp.dates}</div>
                            {exp.bullets && exp.bullets.length > 0 && (
                              <ul className="text-sm text-gray-700 ml-4 mt-1">
                                {exp.bullets.map((bullet, bulletIndex) => (
                                  <li key={bulletIndex} className="list-disc">{bullet}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {testResult.result.skills && testResult.result.skills.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-800">Skills</h5>
                        <p className="text-sm text-gray-700">{testResult.result.skills.join(', ')}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {!testing && !testResult && !error && (
              <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-600">Fill in the test data and click "Test Prompt" to see results</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptTester;