FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy root package files for dependency installation
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev --legacy-peer-deps

# Copy the entire project (needed for shared modules)
COPY . ./

# Create data directory structure
RUN mkdir -p /usr/src/app/data/templates

# Copy template file from assets to the expected location
RUN if [ -f "/usr/src/app/assets/template.docx" ]; then \
        cp /usr/src/app/assets/template.docx /usr/src/app/data/templates/resume.docx && \
        echo "✅ Template copied from assets/template.docx to data/templates/resume.docx"; \
    elif [ -f "/usr/src/app/data/templates/resume.docx" ]; then \
        echo "✅ Template already exists at data/templates/resume.docx"; \
    else \
        echo "⚠️ No template file found in assets/ or data/templates/"; \
    fi

# Verify template file exists
RUN ls -la /usr/src/app/data/templates/ && \
    if [ -f "/usr/src/app/data/templates/resume.docx" ]; then \
        echo "✅ Template file ready: $(ls -lh /usr/src/app/data/templates/resume.docx)"; \
    else \
        echo "❌ Template file missing"; \
    fi

# Set environment variables
ENV NODE_ENV=production
ENV TEMPLATE_PATH=/usr/src/app/data/templates/resume.docx

# Health check for worker (check if process is running)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD pgrep -f "node.*template" || exit 1

# Start the template worker
CMD ["node", "apps/workers/template/index.js"]