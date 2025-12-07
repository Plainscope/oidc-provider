# Build stage
FROM node:25-alpine AS build
WORKDIR /app
COPY package*.json tsconfig.json ./
COPY src ./src
COPY views ./views
COPY public ./public
RUN npm ci
RUN npm run build

# Runtime stage
FROM node:25-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY views ./views
COPY public ./public
# Copy optional configuration if present
COPY config*.json ./
EXPOSE 8080
CMD ["node", "dist/index.js"]
