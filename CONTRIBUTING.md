# Contributing to OIDC Provider

Thank you for your interest in contributing to the OIDC Provider project! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Coding Standards](#coding-standards)
- [Documentation](#documentation)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. We pledge to:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment, trolling, or derogatory comments
- Public or private harassment
- Publishing others' private information without permission
- Any conduct that could reasonably be considered inappropriate

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/oidc-provider.git
   cd oidc-provider
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/Plainscope/oidc-provider.git
   ```

## Development Setup

### Prerequisites

- **Node.js**: 20+ (for provider development)
- **Docker**: 20.10+ (for containerized development)
- **Docker Compose**: 2.0+
- **Git**: Latest version

### Provider Setup

```bash
# Navigate to provider directory
cd src/provider

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev
```

### Full Stack Setup (Docker Compose)

```bash
# From project root
docker-compose up --build
```

This starts:
- Directory service on port 7080
- OIDC Provider on port 9080
- Demo application on port 8080

### Environment Variables

Create a `.env` file in the project root:

```bash
# Directory service
DIRECTORY_PORT=7080
DIRECTORY_BEARER_TOKEN=your-secret-token

# Provider
PROVIDER_PORT=9080
PROVIDER_CLIENT_ID=your-client-id
PROVIDER_CLIENT_SECRET=your-client-secret

# Demo
DEMO_PORT=8080
```

## Making Changes

### Branching Strategy

- `main` - Stable release branch
- `develop` - Development branch
- `feature/*` - Feature branches
- `bugfix/*` - Bug fix branches
- `hotfix/*` - Hotfix branches

### Creating a Feature Branch

```bash
# Update your fork
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/my-awesome-feature
```

### Commit Messages

Follow conventional commit format:

```
type(scope): subject

body (optional)

footer (optional)
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test changes
- `chore`: Build/tooling changes

**Examples**:

```bash
feat(auth): add email validation for login

Implements email format validation to prevent invalid 
credentials from being processed.

Closes #123
```

```bash
fix(sqlite): resolve memory leak in adapter

Fixed prepared statement cleanup that was causing 
memory to grow over time.
```

```bash
docs(security): add rate limiting examples
```

## Testing

### Running Tests

```bash
# Navigate to test directory
cd test

# Install dependencies
npm install

# Install Playwright browsers
npm run playwright:install

# Start services
docker-compose up -d

# Run tests
npm run test:e2e

# Run specific test file
npx playwright test e2e/auth.spec.ts

# Run in UI mode
npm run test:ui

# Run in debug mode
npm run test:debug
```

### Writing Tests

Place tests in `test/e2e/` directory:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('http://localhost:8080');
    await expect(page).toHaveTitle(/Expected Title/);
  });
});
```

### Test Requirements

- All new features must include tests
- Bug fixes should include regression tests
- Maintain or improve code coverage
- Tests must pass before merging

## Submitting Changes

### Pull Request Process

1. **Update your branch** with latest changes:
   ```bash
   git checkout main
   git pull upstream main
   git checkout feature/my-awesome-feature
   git rebase main
   ```

2. **Build and test** your changes:
   ```bash
   npm run build
   npm run test:e2e
   ```

3. **Push to your fork**:
   ```bash
   git push origin feature/my-awesome-feature
   ```

4. **Create Pull Request** on GitHub with:
   - Clear title and description
   - Reference to related issues
   - Screenshots (for UI changes)
   - Test results

### Pull Request Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] No new warnings
- [ ] Commits are clean and atomic

### Review Process

1. Automated checks must pass (CI/CD)
2. Code review by maintainers
3. Address review comments
4. Approval from at least one maintainer
5. Merge to develop branch

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Avoid `any` type when possible
- Use proper type annotations
- Follow existing patterns

```typescript
// Good
function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Bad
function validateEmail(email: any) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add semicolons at end of statements
- Max line length: 100 characters
- Use meaningful variable names

```typescript
// Good
const userEmail = sanitizeInput(rawEmail);
const isValid = validateEmail(userEmail);

// Bad
const e = req.body.email;
const v = /regex/.test(e);
```

### Comments

Add comments for:
- Complex logic
- Non-obvious decisions
- Public APIs
- Security-sensitive code

```typescript
/**
 * Validates user credentials and returns account information.
 * Implements timing attack prevention by ensuring minimum response time.
 * 
 * @param email - User email address
 * @param password - User password
 * @returns Account object or undefined if validation fails
 */
async validate(email: string, password: string): Promise<Account | undefined> {
  // Implementation
}
```

### Error Handling

- Always handle errors properly
- Use meaningful error messages
- Log errors with context
- Don't expose sensitive information

```typescript
// Good
try {
  const account = await directory.validate(email, password);
  if (!account) {
    console.warn('[AUTH] Invalid credentials for:', email);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
} catch (error) {
  console.error('[AUTH] Validation error:', error);
  return res.status(500).json({ error: 'Internal server error' });
}

// Bad
try {
  const account = await directory.validate(email, password);
} catch (error) {
  console.log(error);
}
```

## Documentation

### Documentation Requirements

- Update README.md for major features
- Add/update docs/ for new functionality
- Include code examples
- Document configuration options
- Add JSDoc comments for public APIs

### Documentation Style

- Use clear, concise language
- Include examples
- Add screenshots for UI features
- Organize with headings
- Link to related documentation

## Reporting Bugs

### Before Reporting

1. Check [existing issues](https://github.com/Plainscope/oidc-provider/issues)
2. Verify bug in latest version
3. Reproduce bug in clean environment
4. Gather relevant information

### Bug Report Template

```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., Ubuntu 22.04]
- Docker version: [e.g., 24.0.5]
- Browser: [e.g., Chrome 120]
- Version: [e.g., v1.0.0]

## Logs
```
Paste relevant logs here
```

## Screenshots
If applicable
```

## Suggesting Features

### Feature Request Template

```markdown
## Feature Description
Clear description of the feature

## Use Case
Why is this feature needed?

## Proposed Solution
How should it work?

## Alternatives Considered
Other solutions you've thought about

## Additional Context
Any other relevant information
```

## Security Issues

**DO NOT** open public issues for security vulnerabilities.

Instead:
1. Email security concerns privately to maintainers
2. Include detailed description
3. Provide steps to reproduce
4. Suggest a fix if possible
5. Allow reasonable time for patching

## Questions?

- Review existing [documentation](./docs)
- Check [GitHub Discussions](https://github.com/Plainscope/oidc-provider/discussions)
- Search [closed issues](https://github.com/Plainscope/oidc-provider/issues?q=is%3Aissue+is%3Aclosed)
- Open a [new discussion](https://github.com/Plainscope/oidc-provider/discussions/new)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors are recognized in:
- GitHub contributors list
- Release notes
- Project acknowledgments

Thank you for contributing! 🎉
