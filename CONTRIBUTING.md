# Contributing to Recalled

Thanks for your interest in contributing! Here's how you can help.

## Getting Started

1. **Fork** this repository
2. **Clone** your fork locally:

   ```bash
   git clone https://github.com/your-username/Recalled.git
   cd Recalled
   ```

3. **Create a branch** from `master`:

   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Setup

```bash
cp .env.example .env
# Fill in the required variables
docker compose -f docker-compose.dev.yml up -d --build
```

The app will be available at `http://localhost:8091` (dev stack port).

### Running backend tests

```bash
docker compose exec backend pytest
```

### Code formatting

- **Backend**: We use [Black](https://black.readthedocs.io/) and [Flake8](https://flake8.pycqa.org/)

  ```bash
  docker compose exec backend black app/
  docker compose exec backend flake8 app/
  ```

- **Frontend**: Standard ESLint + Prettier configuration via Vite

## Branch Naming

Use descriptive prefixes:

| Prefix       | Purpose                |
|--------------|------------------------|
| `feature/`   | New functionality      |
| `fix/`       | Bug fixes              |
| `docs/`      | Documentation only     |
| `refactor/`  | Code refactoring       |
| `test/`      | Test additions/changes |

## Commit Messages

Follow conventional style with context:

```plaintext
feat: add place search by category
fix: prevent duplicate reviews for same place
docs: update API endpoints table
refactor: extract photo upload logic to service
test: add review creation tests
```

## Pull Request Process

1. Make sure your branch is up to date with `master`
2. Run tests and linting before pushing
3. Fill in the PR template when opening your pull request
4. Keep PRs focused - one feature or fix per PR
5. Update the README if your change affects setup or usage

## Reporting Bugs

Use the [Bug Report](https://github.com/JuanJesusAlejoSillero/Recalled/issues/new?template=bug_report.yml) issue template. Include:

- Steps to reproduce
- Expected vs actual behavior
- Browser and OS information
- Screenshots if applicable

## Requesting Features

Use the [Feature Request](https://github.com/JuanJesusAlejoSillero/Recalled/issues/new?template=feature_request.yml) issue template. Describe:

- The problem you're trying to solve
- Your proposed solution
- Any alternatives you've considered

## Code of Conduct

Be respectful and constructive. We're all here to build something useful.

## License

By contributing, you agree that your contributions will be licensed under the [AGPL-3.0 License](LICENSE).
