# Build stage
FROM node:25-alpine AS build

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy dependency files first for better caching
COPY package*.json tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY src ./src
COPY public ./public

# Build TypeScript
RUN npm run build

# Runtime stage
FROM node:25-alpine AS runtime

# Install runtime dependencies and security updates
RUN apk add --no-cache python3 make g++ curl \
    && apk upgrade --no-cache

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Copy dependency files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev \
    && npm cache clean --force

# Copy compiled application from build stage
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