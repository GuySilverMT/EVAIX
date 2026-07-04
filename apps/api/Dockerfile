# Base image — pin pnpm to match lockfile version (v9 format)
FROM node:18-alpine AS base
RUN npm install -g pnpm@9 turbo

# Builder stage
FROM base AS builder
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY patches ./patches
# Use --no-frozen-lockfile so a lockfile delta from Prisma removal doesn't break the build
RUN pnpm install --no-frozen-lockfile
COPY . .
RUN turbo build --filter=api

# Final stage — same pnpm pin
FROM node:18-alpine
RUN npm install -g pnpm@9
WORKDIR /app

# Copy built artefacts from builder
COPY --from=builder /app .

# Install production deps only (no Prisma, no generate step needed)
RUN pnpm install --prod --filter=api --no-frozen-lockfile

EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]