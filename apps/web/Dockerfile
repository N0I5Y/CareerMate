# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy the web app files
COPY apps/web/package*.json ./
RUN npm ci

# Copy the web app source
COPY apps/web/ ./

# Build the React app
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
