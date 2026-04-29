# Base image
FROM node:18-alpine AS base
RUN npm install -g pnpm turbo

# Builder stage
FROM base as builder
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile
COPY . .
RUN turbo build --filter=api

# Final stage
FROM node:18-alpine
RUN npm install -g pnpm@8.6.10
WORKDIR /app

# Copy the entire monorepo from the builder stage
COPY --from=builder /app .

# Install only production dependencies for the API
RUN pnpm install --prod --filter=api

# Generate Prisma Client (CRITICAL STEP)
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]