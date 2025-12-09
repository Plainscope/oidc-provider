# Build stage
FROM node:25-alpine AS build
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json tsconfig.json ./
COPY src ./src
COPY public ./public
RUN npm ci
RUN npm run build

# Runtime stage
FROM node:25-alpine AS runtime
RUN apk add --no-cache python3 make g++ curl
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY package*.json ./
RUN npm ci --omit=dev
# Copy compiled application
COPY --from=build /app/dist ./dist
COPY src/views ./views
COPY public ./public
# Copy optional configuration if present
COPY config*.json ./
EXPOSE 8080
CMD ["node", "dist/index.js"]