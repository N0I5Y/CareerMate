# CareerMate v2

An AI-powered resume optimization platform that helps job seekers tailor their resumes for specific roles and companies.

## 🚀 Features

- **AI-Powered Resume Optimization**: Uses OpenAI GPT models to analyze and optimize resume content
- **Custom Prompt Management**: Create, edit, and test custom prompts for different industries and roles
- **Multi-Format Support**: Handles PDF and DOCX input/output
- **Professional Templates**: Uses DOCX templates for consistent, professional formatting
- **Queue-Based Processing**: Scalable background job processing with Redis and BullMQ
- **Web Interface**: Modern React-based UI with responsive design

## 🏗️ Architecture

### Microservices Structure
- **API Service**: REST API with endpoints for resume processing and prompt management
- **Web Frontend**: React application with Tailwind CSS
- **Background Workers**:
  - Extract Worker: Text extraction from uploaded files
  - Optimize Worker: AI-powered content optimization
  - Template Worker: Document template generation
  - Convert Worker: Format conversion (DOCX ↔ PDF)

### Technology Stack
- **Backend**: Node.js, Express, OpenAI API
- **Frontend**: React, Vite, Tailwind CSS
- **Queue System**: Redis, BullMQ
- **Database**: Supabase
- **Storage**: AWS S3 (optional) or local filesystem
- **Infrastructure**: Docker, Docker Compose

## 🛠️ Setup

### Prerequisites
- Node.js 20+
- Docker and Docker Compose
- OpenAI API key

### Environment Variables
Create a `.env` file with the following variables:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Queue Names
QUEUE_EXTRACT=resume.extract
QUEUE_OPTIMIZE=resume.optimize
QUEUE_TEMPLATE=resume.template
QUEUE_CONVERT=resume.convert

# Storage Configuration
USE_S3=false
LOCAL_DATA_DIR=./data

# Prompt Management
ALLOW_PROMPT_WRITE=true
PROMPT_WRITE_TOKEN=your_admin_token

# Logging
LOG_LEVEL=info
```

### Quick Start with Docker

1. Clone the repository:
```bash
git clone <your-repo-url>
cd careermate-v2
```

2. Create your `.env` file with the required variables

3. Start all services:
```bash
docker-compose up -d
```

4. Access the application:
- Web Interface: http://localhost:8080
- API: http://localhost:3000

### Development Setup

1. Install dependencies:
```bash
npm install
cd apps/web && npm install
cd ../api && npm install
```

2. Start Redis:
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

3. Start the API server:
```bash
npm run start:api
```

4. Start the web development server:
```bash
npm run start:web
```

## 📖 Usage

### Resume Optimization
1. Upload a resume (PDF or DOCX)
2. Specify target role and company
3. Select or create a custom prompt
4. Download optimized resume in DOCX or PDF format

### Prompt Management
1. Navigate to the Prompt Maker
2. Choose between Simple or Advanced mode:
   - **Simple Mode**: User-friendly form with guided options
   - **Advanced Mode**: Full control with custom instructions
3. Create, test, and manage custom prompts
4. View generated JavaScript code for prompts

### API Endpoints

#### Resume Processing
- `POST /api/resumes` - Submit resume for optimization
- `GET /api/resumes/:jobId` - Check processing status
- `GET /api/resumes/:jobId/pdf` - Download PDF result
- `GET /api/resumes/:jobId/docx` - Download DOCX result

#### Prompt Management
- `GET /api/prompt-versions` - List all prompts
- `GET /api/prompt-versions/:label` - Get specific prompt
- `POST /api/prompt-versions` - Create new prompt
- `PUT /api/prompt-versions/:label` - Update existing prompt
- `DELETE /api/prompt-versions/:label` - Delete prompt

#### Template Management
- `POST /api/templates` - Upload template
- `GET /api/templates/:id/preview.pdf` - Preview template

## 🔧 Configuration

### Prompt Customization
The system supports two types of prompts:
- **Builtin Prompts**: Pre-configured prompts (v1, v2, etc.)
- **Custom Prompts**: User-created prompts with specific instructions

### Storage Options
- **Local Storage**: Files stored in `./data` directory
- **AWS S3**: Set `USE_S3=true` and configure AWS credentials

### Queue Configuration
Each worker can be scaled independently by adjusting the `concurrency` setting in the Docker Compose file.

## 🧪 Testing

Run the test suite:
```bash
npm test
```

For the web frontend:
```bash
cd apps/web
npm test
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For issues and questions:
1. Check the existing issues on GitHub
2. Create a new issue with detailed information
3. Include logs and error messages when applicable

## 🔄 Updates

### Recent Changes
- Added Prompt Maker UI with Simple and Advanced modes
- Enhanced error handling and user feedback
- Improved PDF generation reliability
- Added comprehensive testing suite
- Updated documentation and setup guides