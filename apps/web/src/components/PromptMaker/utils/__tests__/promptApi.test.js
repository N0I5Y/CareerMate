import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAllPrompts,
  getPrompt,
  createPrompt,
  updatePrompt,
  deletePrompt,
  testPrompt
} from '../promptApi';

// Mock fetch globally
global.fetch = vi.fn();

// Mock environment variables
vi.mock('import.meta', () => ({
  env: {
    VITE_API_BASE: 'http://localhost:3000',
    VITE_ADMIN_TOKEN: 'test-token'
  }
}));

describe('promptApi', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('getAllPrompts', () => {
    it('should fetch all prompts successfully', async () => {
      const mockResponse = {
        items: [
          { label: 'v1', source: 'builtin' },
          { label: 'v2', source: 'custom' }
        ]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await getAllPrompts();
      
      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/prompt-versions');
      expect(result).toEqual(mockResponse);
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new TypeError('fetch error'));

      await expect(getAllPrompts()).rejects.toThrow('Network error: Unable to connect to the server');
    });

    it('should handle API errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' })
      });

      await expect(getAllPrompts()).rejects.toThrow('Server error');
    });
  });

  describe('getPrompt', () => {
    it('should fetch a specific prompt', async () => {
      const mockPrompt = {
        label: 'v1',
        source: 'builtin',
        code: 'module.exports = {...}'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrompt
      });

      const result = await getPrompt('v1');
      
      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/prompt-versions/v1');
      expect(result).toEqual(mockPrompt);
    });

    it('should handle 404 errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Not found' })
      });

      await expect(getPrompt('nonexistent')).rejects.toThrow('Prompt not found');
    });
  });

  describe('createPrompt', () => {
    it('should create a new prompt successfully', async () => {
      const promptData = {
        instructions: 'Test instructions',
        model: 'gpt-4o-mini',
        temperature: 0.2
      };

      const mockResponse = {
        ok: true,
        prompt: 'v3',
        path: '/path/to/v3.js'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await createPrompt(promptData);
      
      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/prompt-versions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': 'test-token'
        },
        body: JSON.stringify(promptData)
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle 409 conflict errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        json: async () => ({ error: 'version already exists' })
      });

      await expect(createPrompt({})).rejects.toThrow('Prompt already exists with this name');
    });

    it('should handle 401 unauthorized errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Unauthorized' })
      });

      await expect(createPrompt({})).rejects.toThrow('Unauthorized: Please check your admin token');
    });
  });

  describe('updatePrompt', () => {
    it('should update an existing prompt', async () => {
      const promptData = {
        instructions: 'Updated instructions',
        model: 'gpt-4',
        temperature: 0.3
      };

      const mockResponse = {
        ok: true,
        prompt: 'v2',
        path: '/path/to/v2.js'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await updatePrompt('v2', promptData);
      
      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/prompt-versions/v2', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': 'test-token'
        },
        body: JSON.stringify(promptData)
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('testPrompt', () => {
    it('should test a prompt with sample data', async () => {
      const testData = {
        promptLabel: 'v1',
        resumeText: 'Sample resume text',
        role: 'Software Engineer',
        company: 'Tech Corp',
        jdText: 'Job description'
      };

      const mockResponse = {
        jobId: 'test-job-123'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await testPrompt(testData);
      
      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/resumes', {
        method: 'POST',
        body: expect.any(FormData)
      });
      expect(result).toEqual(mockResponse);
    });
  });
});