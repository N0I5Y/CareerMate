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

# Build the React app
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf.bak 2>/dev/null || true

# Create a simple health check file
RUN echo "healthy" > /usr/share/nginx/html/health.txt

# Railway uses PORT environment variable
ENV PORT=80
EXPOSE $PORT

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
