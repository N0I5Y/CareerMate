import React, { useState } from 'react';
import PromptList from './components/PromptList';
import PromptEditor from './components/PromptEditor';
import SimplePromptEditor from './components/SimplePromptEditor';
import PromptTester from './components/PromptTester';
import CodeViewer from './components/CodeViewer';
import ConfirmDialog from './components/ConfirmDialog';
import ErrorBoundary from './components/ErrorBoundary';
import { usePrompts } from './hooks/usePrompts';

function PromptMakerContent() {
  const [currentView, setCurrentView] = useState('list');
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [showCodeViewer, setShowCodeViewer] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [promptToDelete, setPromptToDelete] = useState(null);
  const [notification, setNotification] = useState(null);
  const [editorMode, setEditorMode] = useState('simple'); // 'simple' or 'advanced'
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken') || '');

  const {
    prompts,
    loading,
    error,
    fetchPrompts,
    createNewPrompt,
    updateExistingPrompt,
    deleteExistingPrompt,
    clearError
  } = usePrompts();

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleCreateNew = () => {
    setSelectedPrompt(null);
    setCurrentView('create');
  };

  const handleEdit = (prompt) => {
    setSelectedPrompt(prompt);
    setCurrentView('edit');
  };

  const handleTest = (prompt) => {
    setSelectedPrompt(prompt);
    setCurrentView('test');
  };

  const handleViewCode = (prompt) => {
    setSelectedPrompt(prompt);
    setShowCodeViewer(true);
  };

  const handleDelete = (prompt) => {
    if (prompt.source === 'builtin') {
      showNotification('Cannot delete builtin prompts', 'error');
      return;
    }

    setPromptToDelete(prompt);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!promptToDelete) return;

    try {
      await deleteExistingPrompt(promptToDelete.label);
      showNotification(`Prompt "${promptToDelete.label}" deleted successfully`);
    } catch (err) {
      showNotification(`Failed to delete prompt: ${err.message}`, 'error');
    } finally {
      setShowDeleteDialog(false);
      setPromptToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
    setPromptToDelete(null);
  };

  const handleSave = async (promptData, mode) => {
    try {
      if (mode === 'create') {
        await createNewPrompt(promptData);
        showNotification('Prompt created successfully');
      } else {
        await updateExistingPrompt(selectedPrompt.label, promptData);
        showNotification('Prompt updated successfully');
      }
      handleBackToList();
    } catch (err) {
      showNotification(`Failed to save prompt: ${err.message}`, 'error');
    }
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedPrompt(null);
  };

  const handleCloseCodeViewer = () => {
    setShowCodeViewer(false);
    setSelectedPrompt(null);
  };

  const handleDismissError = () => {
    clearError();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Prompt Maker</h1>
              <p className="text-gray-600 mt-2">Create, edit, and test custom prompts for resume optimization</p>
            </div>
            {currentView !== 'list' && (
              <button
                onClick={handleBackToList}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to List</span>
              </button>
            )}
          </div>
        </div>

        {/* Admin Token Input */}
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div className="flex-1">
              <label htmlFor="adminToken" className="block text-sm font-medium text-yellow-800">
                Admin Token (Required for creating/editing prompts)
              </label>
              <input
                type="password"
                id="adminToken"
                value={adminToken}
                onChange={(e) => {
                  const token = e.target.value;
                  setAdminToken(token);
                  localStorage.setItem('adminToken', token);
                }}
                placeholder="Enter your admin token..."
                className="mt-1 block w-full px-3 py-2 border border-yellow-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-yellow-700">
                This token is stored locally in your browser and required for prompt management operations.
              </p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <div className={`mb-4 p-4 rounded-md ${
            notification.type === 'error' 
              ? 'bg-red-50 text-red-700 border border-red-200' 
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            <div className="flex items-center justify-between">
              <span>{notification.message}</span>
              <button
                onClick={() => setNotification(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Global Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 border border-red-200 rounded-md">
            <div className="flex items-center justify-between">
              <span>Error: {error}</span>
              <button
                onClick={handleDismissError}
                className="text-red-400 hover:text-red-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        {currentView === 'list' && (
          <PromptList
            prompts={prompts}
            loading={loading}
            onCreateNew={handleCreateNew}
            onEdit={handleEdit}
            onTest={handleTest}
            onViewCode={handleViewCode}
            onDelete={handleDelete}
            onRefresh={fetchPrompts}
          />
        )}

        {(currentView === 'create' || currentView === 'edit') && (
          <div className="space-y-4">
            {/* Editor Mode Toggle */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">Editor Mode</h3>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setEditorMode('simple')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      editorMode === 'simple'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Simple
                  </button>
                  <button
                    onClick={() => setEditorMode('advanced')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      editorMode === 'advanced'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Advanced
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {editorMode === 'simple' 
                  ? 'Easy-to-use form with guided options'
                  : 'Full control with custom instructions'
                }
              </p>
            </div>

            {/* Editor Component */}
            {editorMode === 'simple' ? (
              <SimplePromptEditor
                mode={currentView}
                initialData={selectedPrompt}
                onCancel={handleBackToList}
                onSave={handleSave}
              />
            ) : (
              <PromptEditor
                mode={currentView}
                initialData={selectedPrompt}
                onCancel={handleBackToList}
                onSave={handleSave}
              />
            )}
          </div>
        )}

        {currentView === 'test' && (
          <PromptTester
            prompt={selectedPrompt}
            onClose={handleBackToList}
          />
        )}

        {/* Code Viewer Modal */}
        {showCodeViewer && selectedPrompt && (
          <CodeViewer
            prompt={selectedPrompt}
            isOpen={showCodeViewer}
            onClose={handleCloseCodeViewer}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteDialog}
          title="Delete Prompt"
          message={`Are you sure you want to delete the prompt "${promptToDelete?.label}"? This action cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
          confirmText="Delete"
          cancelText="Cancel"
          confirmButtonClass="bg-red-600 hover:bg-red-700 focus:ring-red-500"
          icon="warning"
        />
      </div>
    </div>
  );
}

export default function PromptMaker() {
  return (
    <ErrorBoundary>
      <PromptMakerContent />
    </ErrorBoundary>
  );
}