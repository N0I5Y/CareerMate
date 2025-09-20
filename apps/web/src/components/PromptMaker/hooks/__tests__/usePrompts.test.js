import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePrompts, usePromptDetails } from '../usePrompts';
import * as promptApi from '../../utils/promptApi';

// Mock the API functions
vi.mock('../../utils/promptApi');

describe('usePrompts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch prompts on mount', async () => {
    const mockPrompts = [
      { label: 'v1', source: 'builtin' },
      { label: 'v2', source: 'custom' }
    ];

    promptApi.getAllPrompts.mockResolvedValue({ items: mockPrompts });

    const { result } = renderHook(() => usePrompts());

    expect(result.current.loading).toBe(true);
    expect(result.current.prompts).toEqual([]);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.prompts).toEqual(mockPrompts);
    expect(result.current.error).toBe(null);
  });

  it('should handle fetch errors', async () => {
    const errorMessage = 'Network error';
    promptApi.getAllPrompts.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => usePrompts());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(errorMessage);
    expect(result.current.prompts).toEqual([]);
  });

  it('should create a new prompt', async () => {
    const mockPrompts = [{ label: 'v1', source: 'builtin' }];
    const newPrompt = { label: 'v2', source: 'custom' };
    
    promptApi.getAllPrompts
      .mockResolvedValueOnce({ items: mockPrompts })
      .mockResolvedValueOnce({ items: [...mockPrompts, newPrompt] });
    
    promptApi.createPrompt.mockResolvedValue({ ok: true, prompt: 'v2' });

    const { result } = renderHook(() => usePrompts());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.prompts).toEqual(mockPrompts);

    await act(async () => {
      await result.current.createNewPrompt({
        instructions: 'Test instructions',
        model: 'gpt-4o-mini',
        temperature: 0.2
      });
    });

    expect(promptApi.createPrompt).toHaveBeenCalledWith({
      instructions: 'Test instructions',
      model: 'gpt-4o-mini',
      temperature: 0.2
    });
    expect(result.current.prompts).toEqual([...mockPrompts, newPrompt]);
  });

  it('should update an existing prompt', async () => {
    const mockPrompts = [
      { label: 'v1', source: 'builtin' },
      { label: 'v2', source: 'custom' }
    ];
    
    promptApi.getAllPrompts.mockResolvedValue({ items: mockPrompts });
    promptApi.updatePrompt.mockResolvedValue({ ok: true, prompt: 'v2' });

    const { result } = renderHook(() => usePrompts());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.updateExistingPrompt('v2', {
        instructions: 'Updated instructions',
        model: 'gpt-4',
        temperature: 0.3
      });
    });

    expect(promptApi.updatePrompt).toHaveBeenCalledWith('v2', {
      instructions: 'Updated instructions',
      model: 'gpt-4',
      temperature: 0.3
    });
  });

  it('should clear errors', async () => {
    promptApi.getAllPrompts.mockRejectedValue(new Error('Test error'));

    const { result } = renderHook(() => usePrompts());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.error).toBe('Test error');

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe(null);
  });
});

describe('usePromptDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch prompt details when label is provided', async () => {
    const mockPrompt = {
      label: 'v1',
      source: 'builtin',
      code: 'module.exports = {...}'
    };

    promptApi.getPrompt.mockResolvedValue(mockPrompt);

    const { result } = renderHook(() => usePromptDetails('v1'));

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.prompt).toEqual(mockPrompt);
    expect(result.current.error).toBe(null);
    expect(promptApi.getPrompt).toHaveBeenCalledWith('v1');
  });

  it('should not fetch when label is not provided', () => {
    const { result } = renderHook(() => usePromptDetails(null));

    expect(result.current.loading).toBe(false);
    expect(result.current.prompt).toBe(null);
    expect(promptApi.getPrompt).not.toHaveBeenCalled();
  });

  it('should handle fetch errors', async () => {
    const errorMessage = 'Prompt not found';
    promptApi.getPrompt.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => usePromptDetails('nonexistent'));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(errorMessage);
    expect(result.current.prompt).toBe(null);
  });
});