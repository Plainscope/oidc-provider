# Production image: Python 3.12 (see README.md for full supported matrix 3.11–3.13).
# CI validates requirements.txt against 3.11, 3.12, and 3.13 via directory-python-matrix.
FROM python:3.12-alpine

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

RUN apk add --no-cache curl \
    && apk upgrade --no-cache

RUN addgroup -g 1001 -S python \
  && adduser -S python -u 1001

COPY . .

RUN mkdir -p /data \
  && chown -R python:python /app /data

USER python
EXPOSE 8080
ENV PORT=8080

# The FastAPI app serves /api/v1 and mounts Flask for the existing UI/legacy API.
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:8080/healthz || exit 1

# Keep a single worker: the legacy SQLite initialization/ownership assumes one process.
CMD ["uvicorn", "fastapi_app:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
