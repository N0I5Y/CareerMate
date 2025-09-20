import { useState, useCallback } from 'react';
import { testPrompt, pollJobResults } from '../utils/promptApi';

export const usePromptTest = () => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [polling, setPolling] = useState(false);

  // Test a prompt with sample data
  const runTest = useCallback(async (testData) => {
    setTesting(true);
    setError(null);
    setTestResult(null);
    setJobId(null);
    setPolling(false);

    try {
      // Submit the test job
      const response = await testPrompt(testData);
      const newJobId = response.jobId;
      setJobId(newJobId);

      // Start polling for results
      setPolling(true);
      const stopPolling = pollJobResults(newJobId, (result) => {
        if (result.status === 'completed') {
          setTestResult(result.data);
          setPolling(false);
          setTesting(false);
        } else if (result.status === 'failed') {
          setError(result.error || 'Test failed');
          setPolling(false);
          setTesting(false);
        }
        // Continue polling for 'processing' status
      });

      // Store the stop polling function for cleanup
      return stopPolling;
    } catch (err) {
      setError(err.message);
      setTesting(false);
      setPolling(false);
    }
  }, []);

  // Alternative test method that directly processes the prompt
  const runDirectTest = useCallback(async (testData) => {
    setTesting(true);
    setError(null);
    setTestResult(null);

    try {
      // For direct testing, we'll simulate the optimization process
      // This would typically call a dedicated test endpoint
      const startTime = Date.now();
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock result for now - in real implementation, this would call the API
      const mockResult = {
        name: "John Doe",
        contact: {
          email: "john.doe@email.com",
          phone: "+1-555-0123"
        },
        summary: "Experienced software engineer with expertise in full-stack development",
        experience: [
          {
            title: "Senior Software Engineer",
            company: "Tech Corp",
            dates: "2020-Present",
            bullets: [
              "Led development of microservices architecture",
              "Improved system performance by 40%",
              "Mentored junior developers"
            ]
          }
        ],
        education: [
          {
            degree: "Bachelor of Science in Computer Science",
            school: "University of Technology",
            dates: "2016-2020"
          }
        ],
        skills: ["JavaScript", "React", "Node.js", "Python", "AWS"]
      };

      setTestResult({
        success: true,
        result: mockResult,
        executionTime: Date.now() - startTime
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setTesting(false);
    }
  }, []);

  // Clear test results
  const clearTest = useCallback(() => {
    setTestResult(null);
    setError(null);
    setJobId(null);
    setPolling(false);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    testing,
    testResult,
    error,
    jobId,
    polling,
    runTest,
    runDirectTest,
    clearTest,
    clearError
  };
};