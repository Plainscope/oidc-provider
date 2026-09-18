# Remote Directory Service

Flask-based remote user directory used by the OIDC provider for user lookup and management.

## Supported Python versions

| Version | Status | Notes |
|---------|--------|--------|
| **3.11** | Supported (minimum) | Explicitly verified in CI |
| **3.12** | Supported (production) | Image base in `Dockerfile` (`python:3.12-alpine`) |
| **3.13** | Supported | Forward-compatibility matrix in CI |

Older versions (≤ 3.10) are **not** supported. Flask 3.1 requires Python ≥ 3.9; this project deliberately sets the floor at 3.11 for security and maintenance reasons.

CI job `directory-python-matrix` installs `requirements.txt` and runs smoke + constraint tests on every listed version. A dependency update that drops support for one of these runtimes will fail that matrix job.

## Dependencies

Pinned in [`requirements.txt`](requirements.txt). Install with:

```bash
pip install -r requirements.txt
```

Do not use unpinned `pip install Flask` in CI or production; the lock-style pins in `requirements.txt` are authoritative.

## Local development

```bash
cd src/directory
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export SECRET_KEY=dev-only-change-me
python app.py
```

Constraint regression tests:

```bash
python test_constraints.py
```

## Docker

Production image uses Python 3.12 (see `Dockerfile`). Rebuild after dependency changes:

```bash
docker build -t oidc-provider-directory -f src/directory/Dockerfile src/directory
```
