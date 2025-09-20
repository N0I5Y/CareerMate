import { useState, useEffect, useCallback } from 'react';
import { getAllPrompts, getPrompt, createPrompt, updatePrompt, deletePrompt } from '../utils/promptApi';

export const usePrompts = () => {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all prompts
  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAllPrompts();
      setPrompts(response.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch prompts on mount
  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  // Create a new prompt
  const createNewPrompt = useCallback(async (promptData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await createPrompt(promptData);
      await fetchPrompts(); // Refresh the list
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPrompts]);

  // Update an existing prompt
  const updateExistingPrompt = useCallback(async (label, promptData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await updatePrompt(label, promptData);
      await fetchPrompts(); // Refresh the list
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPrompts]);

  // Delete a prompt
  const deleteExistingPrompt = useCallback(async (label) => {
    setLoading(true);
    setError(null);
    try {
      await deletePrompt(label);
      await fetchPrompts(); // Refresh the list
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPrompts]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    prompts,
    loading,
    error,
    fetchPrompts,
    createNewPrompt,
    updateExistingPrompt,
    deleteExistingPrompt,
    clearError
  };
};

export const usePromptDetails = (label) => {
  const [prompt, setPrompt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPromptDetails = useCallback(async (promptLabel) => {
    if (!promptLabel) return;
    
    setLoading(true);
    setError(null);
    try {
      const promptData = await getPrompt(promptLabel);
      setPrompt(promptData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (label) {
      fetchPromptDetails(label);
    }
  }, [label, fetchPromptDetails]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    prompt,
    loading,
    error,
    fetchPromptDetails,
    clearError
  };
};