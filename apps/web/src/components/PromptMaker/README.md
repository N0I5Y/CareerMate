# Prompt Maker UI

A comprehensive React-based interface for creating, editing, testing, and managing custom prompts for the CareerMate resume optimization system.

## Features

- **Prompt Management**: Create, edit, delete, and view custom prompts
- **Testing Interface**: Test prompts with sample resume data
- **Code Viewer**: View generated JavaScript code for prompts
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Accessibility**: Full keyboard navigation and screen reader support
- **Error Handling**: Comprehensive error handling with user-friendly messages

## Architecture

### Components

- `PromptMaker.jsx` - Main container component with routing and state management
- `PromptList.jsx` - List view with search, filtering, and sorting
- `PromptEditor.jsx` - Form for creating and editing prompts
- `PromptTester.jsx` - Interface for testing prompts with sample data
- `CodeViewer.jsx` - Modal for viewing generated JavaScript code
- `ConfirmDialog.jsx` - Reusable confirmation dialog
- `ErrorBoundary.jsx` - Error boundary for graceful error recovery

### Hooks

- `usePrompts.js` - Prompt CRUD operations and state management
- `usePromptTest.js` - Prompt testing functionality
- `useDebounce.js` - Debounced values for performance optimization

### Utils

- `promptApi.js` - API integration functions
- `constants.js` - Application constants and configuration

## Usage

### Basic Navigation

1. Navigate to `/prompt-maker` in the application
2. View all available prompts in the list
3. Use search and filters to find specific prompts
4. Click action buttons to test, edit, or delete prompts

### Creating a Prompt

1. Click "Create New" button
2. Fill in the instructions (required)
3. Optionally set a custom name, model, and temperature
4. Click "Create Prompt" to save

### Editing a Prompt

1. Click the edit button on a custom prompt
2. Modify the instructions, model, or temperature
3. Click "Update Prompt" to save changes

### Testing a Prompt

1. Click the test button on any prompt
2. Enter sample resume text and target role
3. Optionally add company and job description
4. Click "Test Prompt" to see results
5. View formatted output and copy JSON if needed

### Viewing Generated Code

1. Click the code viewer button on any prompt
2. View the generated JavaScript module
3. Copy code to clipboard if needed

## API Integration

The Prompt Maker integrates with the `/api/prompt-versions` endpoints:

- `GET /api/prompt-versions` - List all prompts
- `GET /api/prompt-versions/:label` - Get specific prompt
- `POST /api/prompt-versions` - Create new prompt
- `PUT /api/prompt-versions/:label` - Update existing prompt
- `DELETE /api/prompt-versions/:label` - Delete prompt

## Configuration

### Environment Variables

- `VITE_API_BASE` - API base URL (defaults to window.location.origin)
- `VITE_ADMIN_TOKEN` - Admin token for write operations

### Admin Token

For creating, editing, or deleting prompts, an admin token is required. This can be set via:

1. Environment variable `VITE_ADMIN_TOKEN`
2. Local storage key `adminToken`

## Testing

Run tests with:

```bash
npm test
```

Test files are located in `__tests__` directories alongside components.

## Performance Optimizations

- **Debounced Search**: Search input is debounced to reduce API calls
- **Memoized Components**: Components are memoized to prevent unnecessary re-renders
- **Lazy Loading**: Code splitting for the prompt maker module
- **Efficient Filtering**: Client-side filtering and sorting for better UX

## Accessibility Features

- **Keyboard Navigation**: Full keyboard support for all interactions
- **ARIA Labels**: Proper ARIA labels for screen readers
- **Focus Management**: Proper focus management for modals and forms
- **High Contrast**: Support for high contrast mode
- **Screen Reader**: Compatible with screen readers

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

When contributing to the Prompt Maker:

1. Follow the existing code style and patterns
2. Add tests for new functionality
3. Ensure accessibility compliance
4. Test on multiple screen sizes
5. Update documentation as needed

## Troubleshooting

### Common Issues

**"Unauthorized" errors**: Check that the admin token is properly set

**Prompts not loading**: Verify API connectivity and check browser console

**Test failures**: Ensure the resume optimization API is running

**UI not responsive**: Clear browser cache and check for CSS conflicts