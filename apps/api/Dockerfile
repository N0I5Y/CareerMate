FROM node:20-alpine
WORKDIR /usr/src/app/apps/api
COPY apps/api/package.json ./
RUN npm install --omit=dev --no-audit --no-fund
WORKDIR /usr/src/app
COPY . .
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node","apps/api/index.js"]
