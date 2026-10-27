# Production Dockerfile for College Library Management System
# Suitable for Google Cloud Run (Scales to 0, Pay-per-request) or AWS App Runner

FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Cloud Run expects application on port 8080
EXPOSE 8080

CMD ["node", "server.js"]
