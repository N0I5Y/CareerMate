FROM node:20-alpine

# Install system dependencies for LibreOffice (needed for PDF conversion)
RUN apk add --no-cache \
    libreoffice \
    ttf-dejavu \
    fontconfig

# Set working directory
WORKDIR /usr/src/app

# Copy package files and Prisma schema first (for better caching)
COPY apps/api/package*.json ./
COPY apps/api/.npmrc ./
COPY prisma ./prisma/

# Install only API dependencies
RUN npm ci --omit=dev --legacy-peer-deps

# Copy the entire project (needed for shared modules)
COPY . ./

# Create data directory
RUN mkdir -p /usr/src/app/data

# Set environment variables
ENV NODE_ENV=production
ENV SOFFICE_BIN=/usr/bin/soffice

# Expose port (Railway will set PORT env var dynamically)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/healthz', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the API server
CMD ["node", "apps/api/index.js"]
