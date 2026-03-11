# 🌍 Recalled

A self-hosted web application to keep track of places you've visited and write reviews with ratings and photos. Built with Flask and React, fully containerized with Docker.

> **Recalled** - _reminiscence, memory, evocation._

## Features

- **Authentication** - JWT-based login with access and refresh tokens
- **Two-factor authentication (2FA)** - TOTP-based with QR code and manual secret key
- **Places** - Create, search, filter by category, and sort by rating
- **Reviews** - Write reviews with 1-5 star ratings, titles, comments, and visit dates
- **Private reviews** - Mark reviews as private so only you can see them
- **Photos** - Upload up to 5 photos per review with automatic thumbnail generation
- **Admin panel** - User management and general statistics
- **Personal dashboard** - Your stats, recent reviews, and top-rated places
- **Settings** - Change username, password, enable/disable 2FA, and delete account
- **Version badge** - Displays app version in navbar (baked at Docker build time)
- **Dark mode** - Toggle between light and dark themes
- **Multi-language** - Spanish and English with automatic browser detection
- **Responsive** - Mobile-friendly with hamburger menu navigation

## Tech Stack

| Layer              | Technology                                                   |
|--------------------|--------------------------------------------------------------|
| **Backend**        | Flask, SQLAlchemy, Flask-JWT-Extended, Marshmallow, Gunicorn |
| **Frontend**       | React, Vite, Tailwind CSS, Zustand, React Hook Form          |
| **Database**       | SQLite                                                       |
| **Infrastructure** | Docker, Docker Compose, Nginx (reverse proxy)                |

## Quick Start

### 1. Clone and configure

```bash
git clone https://github.com/JuanJesusAlejoSillero/Recalled.git
cd Recalled

cp .env.example .env
nano .env  # Fill in the required values
```

The `.env` file requires at minimum:

| Variable         | Description                                                                                 |
|------------------|---------------------------------------------------------------------------------------------|
| `SECRET_KEY`     | Flask secret key (generate with `python -c "import secrets; print(secrets.token_hex(32))"`) |
| `JWT_SECRET_KEY` | JWT secret key (generate a different one using the same python command)                     |
| `ADMIN_PASSWORD` | Password for the admin user                                                                 |

### 2. Run (and build)

**Using pre-built images (recommended):**

```bash
docker compose up -d
```

**Building locally (for development):**

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

### 3. Access

Open `http://localhost:8090` (or the port configured in `APP_PORT`) and log in with the admin credentials.

> **Dev stack**: runs on port `8091` by default (`APP_DEV_PORT`). Both stacks can run simultaneously without conflict.

## Configuration

All configuration is done through the `.env` file. See [.env.example](.env.example) for all available options:

| Variable             | Default             | Description                                          |
|----------------------|---------------------|------------------------------------------------------|
| `APP_PORT`           | `8090`              | Port for the production stack (`docker-compose.yml`) |
| `APP_DEV_PORT`       | `8091`              | Port for the dev stack (`docker-compose.dev.yml`)    |
| `IMAGE_TAG`          | `latest`            | Docker image tag (e.g. `1.0.0`)                      |
| `ADMIN_USERNAME`     | `admin`             | Admin username                                       |
| `CORS_ORIGINS`       | `http://localhost`  | Allowed CORS origins (comma-separated)               |
| `MAX_CONTENT_LENGTH` | `5242880`           | Max upload size in bytes (5 MB)                      |
| `ALLOWED_EXTENSIONS` | `jpg,jpeg,png,webp` | Allowed file extensions for uploads                  |

## Project Structure

```plaintext
Recalled/
├── backend/
│   ├── app/
│   │   ├── models/          # User, Place, Review, ReviewPhoto
│   │   ├── routes/          # auth, users, places, reviews, stats
│   │   ├── schemas/         # Marshmallow validation schemas
│   │   ├── middleware/      # JWT auth decorators, validators
│   │   ├── utils/           # File handler, security helpers
│   │   ├── __init__.py      # Flask app factory
│   │   └── config.py        # Configuration
│   ├── requirements.txt
│   ├── run.py               # Entry point
│   └── init.sh              # DB init + admin creation script
├── frontend/
│   ├── src/
│   │   ├── components/      # UI components (auth, admin, places, reviews, settings, common)
│   │   ├── pages/           # Route pages
│   │   ├── services/        # Axios API client
│   │   ├── context/         # Zustand auth store, theme context, language context
│   │   ├── i18n/            # Translation strings (ES/EN)
│   │   ├── hooks/           # Custom hooks
│   │   └── utils/           # Helper functions
│   ├── env.sh               # Runtime env injection for Docker
│   ├── index.html
│   └── package.json
├── nginx/
│   └── nginx.conf           # Reverse proxy config
├── Dockerfile.backend
├── Dockerfile.frontend
├── docker-compose.yml       # Production (pre-built images from GHCR)
├── docker-compose.dev.yml   # Development (local build)
└── .env.example
```

## Persistent Data

Data is stored in mounted volumes on your host:

**Production stack (`docker-compose.yml`):**

| Directory    | Contents                       |
|--------------|--------------------------------|
| `./data/`    | SQLite database (`reviews.db`) |
| `./uploads/` | User-uploaded photos           |
| `./logs/`    | Gunicorn access and error logs |

**Dev stack (`docker-compose.dev.yml`):**

| Directory        | Contents                       |
|------------------|--------------------------------|
| `./data-dev/`    | SQLite database (`reviews.db`) |
| `./uploads-dev/` | User-uploaded photos           |
| `./logs-dev/`    | Gunicorn access and error logs |

## Backup

```bash
docker compose stop
cp -r data/ data-backup-$(date +%Y%m%d)/
cp -r uploads/ uploads-backup-$(date +%Y%m%d)/
docker compose start
```

## Updating

**Using pre-built images:**

```bash
docker compose pull
docker compose up -d --force-recreate
```

**Using local builds:**

```bash
docker compose -f docker-compose.dev.yml build
docker compose -f docker-compose.dev.yml up -d --force-recreate
```

## Production Deployment

To expose Recalled with a custom domain and HTTPS, place a reverse proxy in front (Nginx, Apache, Traefik, Caddy, etc.):

1. Set `CORS_ORIGINS` in `.env` to your domain: `https://reviews.yourdomain.com`
2. Set `APP_PORT` to your preferred port (production) or `APP_DEV_PORT` (dev stack)
3. Configure your reverse proxy to point to that port and handle SSL certificates
4. Consider adding rate limiting to the login endpoint (`/api/v1/auth/login`)

## API Endpoints

| Resource    | Endpoints                                                                                                                         |
|-------------|-----------------------------------------------------------------------------------------------------------------------------------|
| **Auth**    | `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout`                         |
| **Users**   | `GET /api/v1/users`, `POST /api/v1/users`, `GET /api/v1/users/:id`, `PUT /api/v1/users/:id`, `DELETE /api/v1/users/:id`           |
| **Places**  | `GET /api/v1/places`, `POST /api/v1/places`, `GET /api/v1/places/:id`, `PUT /api/v1/places/:id`, `DELETE /api/v1/places/:id`      |
| **Reviews** | `GET /api/v1/reviews`, `POST /api/v1/reviews`, `GET /api/v1/reviews/:id`, `PUT /api/v1/reviews/:id`, `DELETE /api/v1/reviews/:id` |
| **Photos**  | `POST /api/v1/reviews/:id/photos`, `DELETE /api/v1/reviews/:id/photos/:photoId`                                                   |
| **Stats**   | `GET /api/v1/stats/user/:id`, `GET /api/v1/stats/places`                                                                          |
| **Health**  | `GET /api/v1/health`                                                                                                              |
| **Version** | `GET /api/v1/version`                                                                                                             |

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting a pull request.

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE) - if you modify it and offer it as a network service, you must share your source code.
