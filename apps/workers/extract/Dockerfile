FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files for dependency installation
COPY apps/workers/extract/package*.json ./
COPY apps/workers/extract/.npmrc ./

# Install dependencies
RUN npm ci --omit=dev --legacy-peer-deps

# Copy the entire project (needed for shared modules)
COPY . ./

# Create data directory
RUN mkdir -p /usr/src/app/data

# Set environment variables
ENV NODE_ENV=production

# Health check for worker (check if process is running)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD pgrep -f "node.*extract" || exit 1

# Start the extract worker
CMD ["node", "apps/workers/extract/index.js"]