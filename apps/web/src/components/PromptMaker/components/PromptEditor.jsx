import React, { useState, useEffect } from 'react';
import { usePromptDetails } from '../hooks/usePrompts';

const PromptEditor = React.memo(({ mode, initialData, onCancel, onSave }) => {
  const [formData, setFormData] = useState({
    instructions: '',
    name: '',
    model: 'gpt-4o-mini',
    temperature: 0.2,
    force: false
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [simpleMode, setSimpleMode] = useState(true); // Default to simple mode

  const { prompt: promptDetails, loading: loadingDetails } = usePromptDetails(
    mode === 'edit' ? initialData?.label : null
  );

  // Initialize form data
  useEffect(() => {
    if (mode === 'create') {
      setFormData({
        instructions: '',
        name: '',
        model: 'gpt-4o-mini',
        temperature: 0.2,
        force: false
      });
    } else if (mode === 'edit' && promptDetails) {
      // Parse the existing prompt to extract configuration
      // This is a simplified parser - in reality, you'd need more robust parsing
      const codeContent = promptDetails.code || '';
      
      // Extract model
      const modelMatch = codeContent.match(/model:\s*process\.env\.OPENAI_MODEL\s*\|\|\s*["']([^"']+)["']/);
      const model = modelMatch ? modelMatch[1] : 'gpt-4o-mini';
      
      // Extract temperature
      const tempMatch = codeContent.match(/temperature:\s*([0-9.]+)/);
      const temperature = tempMatch ? parseFloat(tempMatch[1]) : 0.2;
      
      // Extract instructions from the custom section
      const instructionsMatch = codeContent.match(/CUSTOM INSTRUCTIONS:\s*([\s\S]*?)\s*`\.trim\(\)/);
      const instructions = instructionsMatch ? instructionsMatch[1].trim() : '';

      setFormData({
        instructions,
        name: promptDetails.label,
        model,
        temperature,
        force: false
      });
    }
  }, [mode, promptDetails]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.instructions.trim()) {
      newErrors.instructions = 'Instructions are required';
    }

    if (mode === 'create' && formData.name && !/^[a-z0-9_.-]+$/i.test(formData.name)) {
      newErrors.name = 'Name can only contain letters, numbers, underscores, dots, and hyphens';
    }

    if (formData.temperature < 0 || formData.temperature > 2) {
      newErrors.temperature = 'Temperature must be between 0 and 2';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const submitData = {
        instructions: formData.instructions.trim(),
        model: formData.model,
        temperature: formData.temperature
      };

      if (mode === 'create') {
        if (formData.name.trim()) {
          submitData.name = formData.name.trim();
        }
        if (formData.force) {
          submitData.force = true;
        }
      }

      await onSave(submitData, mode);
    } catch (error) {
      // Error handling is done in the parent component
      console.error('Save error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (mode === 'edit' && loadingDetails) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span className="text-gray-600">Loading prompt details...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {mode === 'create' ? 'Create New Prompt' : `Edit Prompt: ${initialData?.label}`}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {simpleMode 
                ? 'Write instructions to tell the AI how to optimize resumes for your specific needs.'
                : mode === 'create' 
                  ? 'Create a custom prompt to control how the AI optimizes resumes.'
                  : 'Modify the prompt instructions and configuration.'
              }
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Simple</span>
            <button
              type="button"
              onClick={() => setSimpleMode(!simpleMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                simpleMode ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  simpleMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-gray-600">Advanced</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Instructions */}
        <div>
          <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-2">
            {simpleMode ? 'Prompt Instructions *' : 'Instructions *'}
          </label>
          {simpleMode && (
            <div className="mb-3 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h4 className="text-sm font-medium text-blue-900 mb-2">💡 How to write good prompt instructions:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Tell the AI what to focus on (e.g., "Emphasize leadership experience")</li>
                <li>• Specify the tone (e.g., "Use professional, confident language")</li>
                <li>• Mention what to highlight (e.g., "Highlight technical skills and certifications")</li>
                <li>• Include industry-specific guidance (e.g., "Use healthcare industry terminology")</li>
              </ul>
            </div>
          )}
          <textarea
            id="instructions"
            rows={simpleMode ? 8 : 12}
            value={formData.instructions}
            onChange={(e) => handleInputChange('instructions', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.instructions ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder={simpleMode 
              ? "Example: Focus on leadership and management experience. Use confident, professional language. Highlight any certifications or training programs. Emphasize results and achievements with specific numbers when possible."
              : "Enter detailed instructions for how the AI should optimize resumes..."
            }
          />
          {errors.instructions && (
            <p className="mt-1 text-sm text-red-600">{errors.instructions}</p>
          )}
          {simpleMode && (
            <div className="mt-2">
              <details className="text-sm">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">
                  📝 Example prompts for different roles
                </summary>
                <div className="mt-2 space-y-3 pl-4 border-l-2 border-blue-200">
                  <div>
                    <strong className="text-gray-900">For Software Engineers:</strong>
                    <p className="text-gray-700 italic">"Focus on technical skills and programming languages. Highlight any open-source contributions, system architecture experience, and performance improvements with specific metrics. Use industry-standard terminology and emphasize problem-solving abilities."</p>
                  </div>
                  <div>
                    <strong className="text-gray-900">For Marketing Roles:</strong>
                    <p className="text-gray-700 italic">"Emphasize campaign results, ROI improvements, and audience growth metrics. Highlight creative thinking, brand management experience, and digital marketing skills. Use dynamic, results-oriented language that shows impact on business growth."</p>
                  </div>
                  <div>
                    <strong className="text-gray-900">For Management Positions:</strong>
                    <p className="text-gray-700 italic">"Focus on leadership experience, team size managed, and business impact. Highlight strategic planning, budget management, and process improvements. Use confident, executive-level language that demonstrates decision-making authority."</p>
                  </div>
                </div>
              </details>
            </div>
          )}
          <p className="mt-1 text-sm text-gray-500">
            {simpleMode 
              ? 'Write clear instructions about how you want resumes to be optimized. The AI will follow these guidelines when improving resumes.'
              : 'Provide specific instructions on how the AI should analyze and optimize resume content.'
            }
          </p>
        </div>

        {/* Simple Mode - Just Name */}
        {simpleMode && mode === 'create' && (
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Prompt Name (optional)
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="e.g., Software Engineer Prompt, Marketing Manager Prompt"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              Give your prompt a descriptive name, or leave empty to auto-generate
            </p>
          </div>
        )}

        {/* Advanced Mode - All Technical Fields */}
        {!simpleMode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name (only for create mode) */}
            {mode === 'create' && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Name (optional)
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., custom-swe, marketing-v2"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Leave empty to auto-generate (v2, v3, etc.)
                </p>
              </div>
            )}

            {/* Model */}
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
                AI Model
              </label>
              <select
                id="model"
                value={formData.model}
                onChange={(e) => handleInputChange('model', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="gpt-4o-mini">GPT-4o Mini (Recommended)</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Choose the AI model for processing resumes
              </p>
            </div>

            {/* Temperature */}
            <div>
              <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-2">
                Temperature
              </label>
              <input
                type="number"
                id="temperature"
                min="0"
                max="2"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.temperature ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.temperature && (
                <p className="mt-1 text-sm text-red-600">{errors.temperature}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                0 = deterministic, 2 = very creative (0.2 recommended)
              </p>
            </div>
          </div>
        )}

        {/* Force override (only for create mode and advanced mode) */}
        {mode === 'create' && !simpleMode && (
          <div className="flex items-center">
            <input
              type="checkbox"
              id="force"
              checked={formData.force}
              onChange={(e) => handleInputChange('force', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="force" className="ml-2 block text-sm text-gray-700">
              Force override if name already exists
            </label>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span>Saving...</span>
              </div>
            ) : (
              mode === 'create' ? 'Create Prompt' : 'Update Prompt'
            )}
          </button>
        </div>
      </form>
    </div>
  );
});

PromptEditor.displayName = 'PromptEditor';

export default PromptEditor;