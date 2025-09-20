import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PromptList from '../PromptList';

const mockPrompts = [
  { label: 'v1', source: 'builtin' },
  { label: 'v2', source: 'custom' },
  { label: 'custom-swe', source: 'custom' }
];

const defaultProps = {
  prompts: mockPrompts,
  loading: false,
  onCreateNew: vi.fn(),
  onEdit: vi.fn(),
  onTest: vi.fn(),
  onViewCode: vi.fn(),
  onDelete: vi.fn(),
  onRefresh: vi.fn()
};

describe('PromptList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders prompt list correctly', () => {
    render(<PromptList {...defaultProps} />);
    
    expect(screen.getByText('Prompts')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
    expect(screen.getByText('custom-swe')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<PromptList {...defaultProps} loading={true} />);
    
    expect(screen.getByText('Loading prompts...')).toBeInTheDocument();
  });

  it('filters prompts by search term', async () => {
    render(<PromptList {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search prompts...');
    fireEvent.change(searchInput, { target: { value: 'custom' } });
    
    await waitFor(() => {
      expect(screen.getByText('custom-swe')).toBeInTheDocument();
      expect(screen.queryByText('v1')).not.toBeInTheDocument();
    });
  });

  it('filters prompts by source', async () => {
    render(<PromptList {...defaultProps} />);
    
    const sourceFilter = screen.getByDisplayValue('All Sources');
    fireEvent.change(sourceFilter, { target: { value: 'builtin' } });
    
    await waitFor(() => {
      expect(screen.getByText('v1')).toBeInTheDocument();
      expect(screen.queryByText('v2')).not.toBeInTheDocument();
    });
  });

  it('calls onCreateNew when create button is clicked', () => {
    render(<PromptList {...defaultProps} />);
    
    const createButton = screen.getByText('Create New');
    fireEvent.click(createButton);
    
    expect(defaultProps.onCreateNew).toHaveBeenCalledTimes(1);
  });

  it('calls onTest when test button is clicked', () => {
    render(<PromptList {...defaultProps} />);
    
    const testButtons = screen.getAllByTitle('Test');
    fireEvent.click(testButtons[0]);
    
    expect(defaultProps.onTest).toHaveBeenCalledWith(mockPrompts[0]);
  });

  it('shows edit and delete buttons only for custom prompts', () => {
    render(<PromptList {...defaultProps} />);
    
    // Should have edit/delete buttons for custom prompts (v2 and custom-swe)
    const editButtons = screen.getAllByTitle('Edit');
    const deleteButtons = screen.getAllByTitle('Delete');
    
    expect(editButtons).toHaveLength(2); // Only custom prompts
    expect(deleteButtons).toHaveLength(2); // Only custom prompts
  });

  it('shows empty state when no prompts match filters', () => {
    render(<PromptList {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search prompts...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    expect(screen.getByText('No prompts found')).toBeInTheDocument();
  });

  it('sorts prompts correctly', async () => {
    render(<PromptList {...defaultProps} />);
    
    const nameHeader = screen.getByText('Name');
    fireEvent.click(nameHeader);
    
    // Should sort alphabetically
    const promptRows = screen.getAllByRole('row');
    // First row is header, so check data rows
    expect(promptRows[1]).toHaveTextContent('custom-swe');
    expect(promptRows[2]).toHaveTextContent('v1');
    expect(promptRows[3]).toHaveTextContent('v2');
  });
});