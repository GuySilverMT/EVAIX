# Base image — pin pnpm@9 to match lockfile v9 format
FROM node:18-alpine AS base
RUN npm install -g pnpm@9 turbo

# Builder stage
FROM base AS builder
WORKDIR /app
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_WS_URL
ENV VITE_WS_URL=$VITE_WS_URL

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY patches ./patches
RUN pnpm install --no-frozen-lockfile
COPY . .
RUN turbo build

# Production stage: Serve the app with Nginx
FROM nginx:1.25-alpine
# Copy the custom Nginx configuration
COPY ./apps/ui/nginx.conf /etc/nginx/conf.d/default.conf
# Copy the built static files from the builder stage
COPY --from=builder /app/apps/ui/dist /usr/share/nginx/html
EXPOSE 80