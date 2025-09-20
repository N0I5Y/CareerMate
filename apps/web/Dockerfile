# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy the web app files
COPY apps/web/package*.json ./
RUN npm ci

# Copy the web app source
COPY apps/web/ ./

# Set build-time environment variables
ARG VITE_API_BASE=https://careermate-production.up.railway.app
ENV VITE_API_BASE=$VITE_API_BASE

# Debug: List files before build
RUN ls -la

# Build the React app
RUN npm run build

# Debug: Check if dist folder was created
RUN ls -la dist/ || echo "No dist folder found"

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Debug: List copied files
RUN ls -la /usr/share/nginx/html/

# Create a simple health check file
RUN echo "healthy" > /usr/share/nginx/html/health.txt

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy nginx configuration optimized for React SPA
COPY apps/web/nginx-react.conf /etc/nginx/conf.d/default.conf

# Test nginx configuration
RUN nginx -t

# Expose port 8080
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
