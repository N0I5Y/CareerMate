const API_BASE = import.meta.env.VITE_API_BASE || window.location.origin;

// Get admin token from environment or localStorage
const getAdminToken = () => {
  return import.meta.env.VITE_ADMIN_TOKEN || localStorage.getItem('adminToken') || '';
};

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // If JSON parsing fails, use the default error message
    }

    // Handle specific error codes
    if (response.status === 401) {
      throw new Error('Unauthorized: Please check your admin token');
    } else if (response.status === 403) {
      throw new Error('Forbidden: Prompt writing is disabled or insufficient permissions');
    } else if (response.status === 404) {
      throw new Error('Prompt not found');
    } else if (response.status === 409) {
      throw new Error('Prompt already exists with this name');
    }
    
    throw new Error(errorMessage);
  }
  return response.json();
};

// Helper function to handle network errors
const withErrorHandling = async (apiCall) => {
  try {
    return await apiCall();
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to the server');
    }
    throw error;
  }
};

// Get all prompts
export const getAllPrompts = async () => {
  return withErrorHandling(async () => {
    const response = await fetch(`${API_BASE}/api/prompt-versions`);
    const data = await handleResponse(response);
    
    // Handle both old format {prompts: [...]} and new format {items: [...]}
    if (data.prompts && Array.isArray(data.prompts)) {
      // Convert old format to new format
      const items = data.prompts.map(label => {
        // Determine source based on common patterns
        const isBuiltin = ['v1', 'v2', 'index', 'jd-analyze'].includes(label) || /^v\d+$/.test(label);
        return {
          label,
          source: isBuiltin ? 'builtin' : 'custom',
          path: `${label}.js`
        };
      });
      return { items };
    }
    
    return data; // Already in correct format
  });
};

// Get a specific prompt by label
export const getPrompt = async (label) => {
  return withErrorHandling(async () => {
    const response = await fetch(`${API_BASE}/api/prompt-versions/${label}`);
    return handleResponse(response);
  });
};

// Create a new prompt
export const createPrompt = async (promptData) => {
  return withErrorHandling(async () => {
    const token = getAdminToken();
    if (!token) {
      throw new Error('Admin token is required for creating prompts');
    }

    const response = await fetch(`${API_BASE}/api/prompt-versions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token,
      },
      body: JSON.stringify(promptData),
    });
    return handleResponse(response);
  });
};

// Update an existing prompt
export const updatePrompt = async (label, promptData) => {
  return withErrorHandling(async () => {
    const token = getAdminToken();
    if (!token) {
      throw new Error('Admin token is required for updating prompts');
    }

    const response = await fetch(`${API_BASE}/api/prompt-versions/${label}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token,
      },
      body: JSON.stringify(promptData),
    });
    return handleResponse(response);
  });
};

// Delete a prompt (if the API supports it)
export const deletePrompt = async (label) => {
  return withErrorHandling(async () => {
    const token = getAdminToken();
    if (!token) {
      throw new Error('Admin token is required for deleting prompts');
    }

    const response = await fetch(`${API_BASE}/api/prompt-versions/${label}`, {
      method: 'DELETE',
      headers: {
        'x-admin-token': token,
      },
    });
    return handleResponse(response);
  });
};

// Test a prompt with sample data
export const testPrompt = async (testData) => {
  // This will use the existing resume optimization endpoint
  // We'll create a temporary file from the text for testing
  const formData = new FormData();
  
  // Create a blob from the resume text to simulate file upload
  const resumeBlob = new Blob([testData.resumeText], { type: 'text/plain' });
  formData.append('file', resumeBlob, 'test-resume.txt');
  formData.append('role', testData.role);
  formData.append('company', testData.company || '');
  formData.append('prompt', testData.promptLabel);
  if (testData.jdText) {
    formData.append('jdText', testData.jdText);
  }

  const response = await fetch(`${API_BASE}/api/resumes`, {
    method: 'POST',
    body: formData,
  });

  return handleResponse(response);
};

// Check if URL exists (for polling results)
export const urlExists = async (url) => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};

// Poll for job results
export const pollJobResults = async (jobId, onUpdate) => {
  const pollInterval = setInterval(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/resumes/${jobId}`);
      if (response.ok) {
        const result = await response.json();
        onUpdate(result);
        if (result.status === 'completed' || result.status === 'failed') {
          clearInterval(pollInterval);
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
      clearInterval(pollInterval);
    }
  }, 1500);

  return () => clearInterval(pollInterval);
};