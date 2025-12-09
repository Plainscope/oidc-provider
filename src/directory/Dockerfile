FROM python:3.12-alpine

WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install curl for container health checks
RUN apk add --no-cache curl

# Copy application code
COPY app.py .

# Expose port
EXPOSE 8080

# Set environment variables
ENV FLASK_APP=app.py
ENV PORT=8080

# Run the application
CMD ["python", "app.py"]
