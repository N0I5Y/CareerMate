FROM node:20-alpine

# Install system dependencies for LibreOffice (needed for PDF conversion)
RUN apk add --no-cache \
    libreoffice \
    ttf-dejavu \
    fontconfig

# Set working directory
WORKDIR /usr/src/app

# Copy root package files for dependency installation
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev --legacy-peer-deps

# Copy the entire project (needed for shared modules)
COPY . ./

# Create data directory and ensure templates are available
RUN mkdir -p /usr/src/app/data/templates

# Explicitly copy template files
COPY data/templates/ /usr/src/app/data/templates/

# Set environment variables
ENV NODE_ENV=production
ENV SOFFICE_BIN=/usr/bin/soffice

# Health check for worker (check if process is running)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD pgrep -f "node.*convert" || exit 1

# Start the convert worker
CMD ["node", "apps/workers/convert/index.js"]