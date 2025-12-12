FROM python:3.12-alpine

WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install curl for container health checks
RUN apk add --no-cache curl

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

# Run the application
CMD ["python", "app.py"]
