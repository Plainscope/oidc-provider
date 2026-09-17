FROM python:3.12.12-alpine

WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Install curl for container health checks
RUN apk add --no-cache curl \
    && apk upgrade --no-cache

# Create non-root user for security
RUN addgroup -g 1001 -S python \
  && adduser -S python -u 1001

# Copy application code
COPY . .

# Create data directory with correct permissions
RUN mkdir -p /data \
  && chown -R python:python /app /data

# Switch to non-root user
USER python

# Expose port
EXPOSE 8080

# Set environment variables
ENV FLASK_APP=app.py
ENV PORT=8080

# Health check (authenticated endpoints excluded; /healthz under legacy blueprint requires no auth bypass only for this path)
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:8080/healthz || exit 1

# Run with production WSGI server (Flask dev server is development-only)
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "2", "--timeout", "60", "app:app"]
