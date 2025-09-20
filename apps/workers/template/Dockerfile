FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy root package files for dependency installation
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev --legacy-peer-deps

# Copy the entire project (needed for shared modules)
COPY . ./

# Create data directory and ensure templates are copied
RUN mkdir -p /usr/src/app/data/templates

# Explicitly copy template files (in case they're not included in COPY . ./)
COPY data/templates/ /usr/src/app/data/templates/

# Verify template files exist
RUN ls -la /usr/src/app/data/templates/

# Set environment variables
ENV NODE_ENV=production
ENV TEMPLATE_PATH=/usr/src/app/data/templates/resume.docx

# Health check for worker (check if process is running)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD pgrep -f "node.*template" || exit 1

# Start the template worker
CMD ["node", "apps/workers/template/index.js"]