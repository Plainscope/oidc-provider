# Build stage - LTS major-float tag (always latest 22.x patch)
FROM node:22-alpine AS build

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy dependency files first for better caching
COPY package*.json tsconfig.json ./

# Install dependencies
# Keep lifecycle output visible in BuildKit logs to identify native-module failures
# during cross-architecture builds (notably under QEMU).
RUN npm ci --foreground-scripts --verbose

# Copy source files
COPY src ./src
COPY public ./public

# Build TypeScript (prune dev deps afterwards so the runtime stage can reuse
# node_modules directly without recompiling native modules)
RUN npm run build \
    && npm prune --omit=dev \
    && npm cache clean --force

# Runtime stage - LTS major-float tag; no build tools to minimize attack surface
FROM node:22-alpine AS runtime

# Apply security updates only (curl kept for healthcheck), then remove npm's
# bundled package tree: the runtime never invokes npm/corepack, and npm's
# vendored dependencies (brace-expansion, tar, sigstore, ...) carry HIGH
# findings that Trivy flags in image scans.
RUN apk add --no-cache curl \
    && apk upgrade --no-cache \
    && rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Copy dependency files for reference (node_modules comes from build stage)
COPY package*.json ./

# Copy compiled application and pruned production dependencies from build stage
# (reuses binaries built above; no compiler toolchain needed in runtime image)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public

# Create data directory with correct permissions
RUN mkdir -p /data \
    && chown -R nodejs:nodejs /app /data

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/healthz', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || curl -f http://localhost:8080/healthz || exit 1

# Start application
CMD ["node", "dist/index.js"]