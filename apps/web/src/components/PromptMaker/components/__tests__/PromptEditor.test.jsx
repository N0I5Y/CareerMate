import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PromptEditor from '../PromptEditor';

// Mock the usePromptDetails hook
vi.mock('../../hooks/usePrompts', () => ({
  usePromptDetails: vi.fn(() => ({
    prompt: null,
    loading: false,
    error: null
  }))
}));

const defaultProps = {
  mode: 'create',
  initialData: null,
  onCancel: vi.fn(),
  onSave: vi.fn()
};

describe('PromptEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create mode correctly', () => {
    render(<PromptEditor {...defaultProps} />);
    
    expect(screen.getByText('Create New Prompt')).toBeInTheDocument();
    expect(screen.getByLabelText('Instructions *')).toBeInTheDocument();
    expect(screen.getByLabelText('Name (optional)')).toBeInTheDocument();
    expect(screen.getByText('Create Prompt')).toBeInTheDocument();
  });

  it('renders edit mode correctly', () => {
    const editProps = {
      ...defaultProps,
      mode: 'edit',
      initialData: { label: 'v2' }
    };
    
    render(<PromptEditor {...editProps} />);
    
    expect(screen.getByText('Edit Prompt: v2')).toBeInTheDocument();
    expect(screen.queryByLabelText('Name (optional)')).not.toBeInTheDocument();
    expect(screen.getByText('Update Prompt')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<PromptEditor {...defaultProps} />);
    
    const submitButton = screen.getByText('Create Prompt');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Instructions are required')).toBeInTheDocument();
    });
    
    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });

  it('validates temperature range', async () => {
    render(<PromptEditor {...defaultProps} />);
    
    const instructionsInput = screen.getByLabelText('Instructions *');
    const temperatureInput = screen.getByLabelText('Temperature');
    
    fireEvent.change(instructionsInput, { target: { value: 'Test instructions' } });
    fireEvent.change(temperatureInput, { target: { value: '3' } });
    
    const submitButton = screen.getByText('Create Prompt');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Temperature must be between 0 and 2')).toBeInTheDocument();
    });
  });

  it('validates name format in create mode', async () => {
    render(<PromptEditor {...defaultProps} />);
    
    const instructionsInput = screen.getByLabelText('Instructions *');
    const nameInput = screen.getByLabelText('Name (optional)');
    
    fireEvent.change(instructionsInput, { target: { value: 'Test instructions' } });
    fireEvent.change(nameInput, { target: { value: 'invalid name!' } });
    
    const submitButton = screen.getByText('Create Prompt');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Name can only contain letters, numbers, underscores, dots, and hyphens')).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    render(<PromptEditor {...defaultProps} />);
    
    const instructionsInput = screen.getByLabelText('Instructions *');
    const nameInput = screen.getByLabelText('Name (optional)');
    const modelSelect = screen.getByLabelText('AI Model');
    const temperatureInput = screen.getByLabelText('Temperature');
    
    fireEvent.change(instructionsInput, { target: { value: 'Test instructions' } });
    fireEvent.change(nameInput, { target: { value: 'test-prompt' } });
    fireEvent.change(modelSelect, { target: { value: 'gpt-4' } });
    fireEvent.change(temperatureInput, { target: { value: '0.5' } });
    
    const submitButton = screen.getByText('Create Prompt');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(defaultProps.onSave).toHaveBeenCalledWith({
        instructions: 'Test instructions',
        name: 'test-prompt',
        model: 'gpt-4',
        temperature: 0.5
      }, 'create');
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<PromptEditor {...defaultProps} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('clears errors when user starts typing', async () => {
    render(<PromptEditor {...defaultProps} />);
    
    // Trigger validation error
    const submitButton = screen.getByText('Create Prompt');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Instructions are required')).toBeInTheDocument();
    });
    
    // Start typing to clear error
    const instructionsInput = screen.getByLabelText('Instructions *');
    fireEvent.change(instructionsInput, { target: { value: 'Test' } });
    
    await waitFor(() => {
      expect(screen.queryByText('Instructions are required')).not.toBeInTheDocument();
    });
  });
});