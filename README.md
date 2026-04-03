# 🌍 Recalled

A self-hosted web application to keep track of places you've visited and write reviews with ratings and photos. Built with Flask and React, fully containerized with Docker.

> **Recalled** - _reminiscence, memory, evocation._

## Features

- **Authentication** - JWT-based login with httpOnly cookie sessions and CSRF protection
- **Two-factor authentication (2FA)** - TOTP-based with QR code and manual secret key
- **Places** - Create, search, filter by category, and sort by rating
- **Place ownership** - Track place creators, admin can reassign ownership
- **Reviews** - Write reviews with 1-5 star ratings, titles, comments, and visit dates
- **Private reviews** - Mark reviews as private so only you can see them
- **Privacy-aware defaults** - Reviews for private places are auto-marked as private, with confirmation dialogs for mismatched privacy settings
- **Photos** - Upload up to 5 photos per review with automatic thumbnail generation
- **Unsaved changes protection** - Navigation guards warn before losing unsaved work in review and place forms (in-app navigation, browser close, and back/forward)
- **Admin panel** - User management and general statistics
- **Personal dashboard** - Your stats, recent reviews, and top-rated places
- **Settings** - Change username, password, enable/disable 2FA, and delete account
- **Version badge** - Displays app version in navbar (baked at Docker build time)
- **World map** - Optional interactive map showing all your visited places (configurable via `ENABLE_MAP`), with address geocoding via Nominatim so you don't need to enter coordinates manually
- **Dark mode** - Toggle between light and dark themes
- **Multi-language** - Spanish and English with automatic browser detection
- **Responsive** - Mobile-friendly with hamburger menu navigation
- **Security hardened** - CSP headers, magic bytes image validation, decompression bomb protection, timing-safe login, cookie-based auth with CSRF protection, Redis-backed auth rate limiting in Docker, and token invalidation after account changes

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

The example configuration assumes the app is served behind HTTPS and that Redis is available for shared auth rate limits. If you plan to run plain HTTP locally, change `JWT_COOKIE_SECURE=false` and keep `JWT_COOKIE_SAMESITE=Lax` before starting the stack. Adjust `CORS_ORIGINS` to your actual origin if needed.
If you place another reverse proxy in front of Recalled's frontend container, set `PROXY_FIX_X_FOR=2` so Flask trusts both hops.

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

If you want to test the version badge and its GitHub release link from a local/develop build, set `APP_VERSION` in `.env` before rebuilding. For example: `APP_VERSION=v1.6.0-rc1`.

### 3. Access

Open `http://localhost:8090` (or the port configured in `APP_PORT`) and log in with the admin credentials.

> **Dev stack**: runs on port `8091` by default (`APP_DEV_PORT`). Both stacks can run simultaneously without conflict.
> If you keep the default `JWT_COOKIE_SECURE=true`, serve the app through HTTPS. Plain HTTP setups must use `JWT_COOKIE_SECURE=false` together with `JWT_COOKIE_SAMESITE=Lax` in `.env`.

## Configuration

All configuration is done through the `.env` file. See [.env.example](.env.example) for all available options:

| Variable                  | Default                          | Possible values                                             | Description                                                                     |
|---------------------------|----------------------------------|-------------------------------------------------------------|---------------------------------------------------------------------------------|
| `FLASK_ENV`               | `production`                     | `production`, `development`                                 | Flask runtime environment                                                       |
| `SECRET_KEY`              |                                  | Any long random secret string                               | Flask secret key                                                                |
| `JWT_SECRET_KEY`          |                                  | Any long random secret string different from `SECRET_KEY`   | JWT signing secret                                                              |
| `ADMIN_USERNAME`          | `admin`                          | Any non-empty username                                      | Admin username                                                                  |
| `ADMIN_PASSWORD`          |                                  | Any strong password string                                  | Password for the admin user                                                     |
| `DATABASE_URL`            | `sqlite:////app/data/reviews.db` | Any valid SQLAlchemy connection string                      | Database connection                                                             |
| `UPLOAD_FOLDER`           | `/app/uploads`                   | Any writable absolute path inside the backend container     | Upload directory                                                                |
| `MAX_CONTENT_LENGTH`      | `52428800`                       | Any positive integer in bytes                               | Max upload size in bytes (50 MB by default)                                     |
| `ALLOWED_EXTENSIONS`      | `jpg,jpeg,png,webp`              | Comma-separated file extensions                             | Allowed file extensions for uploads                                             |
| `CORS_ORIGINS`            | `https://localhost`              | Comma-separated origins, e.g. `https://reviews.example.com` | Allowed CORS origins                                                            |
| `PROXY_FIX_X_FOR`         | `1`                              | Positive integer such as `1` or `2`                         | Trusted proxy hops for Flask `ProxyFix`                                         |
| `AUTH_LOGIN_RATE_LIMIT`   | `5/minute`                       | Flask-Limiter strings, e.g. `5/minute`, `20/hour`           | Rate limit for login attempts                                                   |
| `AUTH_2FA_RATE_LIMIT`     | `10/minute`                      | Flask-Limiter strings, e.g. `10/minute`, `30/hour`          | Rate limit for TOTP verification attempts                                       |
| `AUTH_REFRESH_RATE_LIMIT` | `30/minute`                      | Flask-Limiter strings, e.g. `30/minute`, `120/hour`         | Rate limit for refresh token usage                                              |
| `RATELIMIT_STORAGE_URI`   | `redis://redis:6379/0`           | `redis://...`, `memory://`                                  | Storage backend for rate limits                                                 |
| `JWT_COOKIE_SECURE`       | `true`                           | `true`, `false`                                             | Send auth cookies only over HTTPS. Must be `true` if `JWT_COOKIE_SAMESITE=None` |
| `JWT_COOKIE_SAMESITE`     | `Lax`                            | `Lax`, `Strict`, `None`                                     | SameSite policy for auth cookies. Use `Lax` for plain HTTP development          |
| `APP_PORT`                | `8090`                           | Any free host port, e.g. `80`, `443`, `8090`                | Port for the production stack (`docker-compose.yml`)                            |
| `APP_DEV_PORT`            | `8091`                           | Any free host port different from `APP_PORT`                | Port for the dev stack (`docker-compose.dev.yml`)                               |
| `IMAGE_TAG`               | `latest`                         | Docker image tag such as `latest`, `1.4.1`                  | Docker image tag for the production stack                                       |
| `APP_VERSION`             | `dev`                            | Tag-like string such as `v1.6.0-rc1`                        | Local backend build version for the navbar badge                                |
| `VITE_API_URL`            | `/api/v1`                        | Relative path or absolute URL                               | Frontend API base URL                                                           |
| `ENABLE_MAP`              | `true`                           | `true`, `false`                                             | Enable the world map page (Leaflet + OpenStreetMap)                             |

The example defaults assume HTTPS and Redis-backed rate limiting. If you run the app without HTTPS, set `JWT_COOKIE_SECURE=false` and keep `JWT_COOKIE_SAMESITE=Lax` before starting the stack. If you do not run Redis, switch `RATELIMIT_STORAGE_URI` to `memory://` (or point it to another Redis instance).
Set `PROXY_FIX_X_FOR=2` when Recalled sits behind an additional reverse proxy that forwards requests to the frontend container.

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
│   │   ├── hooks/           # Custom hooks (auth, navigation guards)
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

## Backup & Restore

### Backup

Stop the containers first to ensure data consistency (especially the SQLite database):

```bash
docker compose stop
tar czf recalled-backup-$(date +%Y%m%d).tar.gz data/ uploads/
docker compose start
```

For the development stack:

```bash
docker compose -f docker-compose.dev.yml stop
tar czf recalled-dev-backup-$(date +%Y%m%d).tar.gz data-dev/ uploads-dev/
docker compose -f docker-compose.dev.yml start
```

### Restore

```bash
docker compose stop

# Remove current data
rm -rf data/ uploads/

# Extract the backup
tar xzf recalled-backup-YYYYMMDD.tar.gz

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
4. Keep `JWT_COOKIE_SECURE=true`, point `RATELIMIT_STORAGE_URI` to your Redis instance if needed, and set `PROXY_FIX_X_FOR=2` if the request crosses your reverse proxy and Recalled's bundled frontend nginx

## Testing

Backend automated tests are available and can be run locally with:

```bash
cd backend
pytest tests -q
```

For frontend changes, the project currently relies on manual verification. At minimum, validate the production bundle after UI changes with:

```bash
cd frontend
npm run build
```

Map, geocoding, auth, and upload flows should still be smoke-tested in the dev stack because there is no automated frontend test suite yet.

## API Endpoints

- **Auth**: `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout`
- **Users**: `GET /api/v1/users` (admin only), `POST /api/v1/users` (admin only), `GET /api/v1/users/:id`, `PUT /api/v1/users/:id`, `DELETE /api/v1/users/:id` (admin only)
- **Places**: `GET /api/v1/places`, `POST /api/v1/places`, `GET /api/v1/places/:id`, `PUT /api/v1/places/:id`, `DELETE /api/v1/places/:id`
- **Reviews**: `GET /api/v1/reviews`, `POST /api/v1/reviews`, `GET /api/v1/reviews/:id`, `PUT /api/v1/reviews/:id`, `DELETE /api/v1/reviews/:id`
- **Photos**: `POST /api/v1/reviews/:id/photos`, `DELETE /api/v1/reviews/:id/photos/:photoId`
- **Media**: `GET /api/v1/media/photos/:filename`, `GET /api/v1/media/photos/thumbnails/:filename`
- **Stats**: `GET /api/v1/stats/user/:id`, `GET /api/v1/stats/places`
- **Health**: `GET /api/v1/health`
- **Version**: `GET /api/v1/version`

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting a pull request.

## Third-party Services

When the world map feature is enabled (`ENABLE_MAP=true`), Recalled uses the following external services:

- **[OpenStreetMap](https://www.openstreetmap.org/)** - Map tiles rendered in the places map. Data licensed under the [Open Database License (ODbL)](https://www.openstreetmap.org/copyright). Attribution is displayed directly on the map as required.
- **[Nominatim](https://nominatim.openstreetmap.org/)** (OpenStreetMap Foundation) - Geocoding service used to find coordinates from an address when creating a place. Used in accordance with the [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/) (user-triggered requests only, no autocomplete, attribution displayed with results).

Neither service requires an API key. Both are free, community-powered, and governed by the [OSMF Terms of Use](https://wiki.osmfoundation.org/wiki/Terms_of_Use).

Please be mindful of the usage policies and avoid sending automated or bulk requests to these services. The map feature is designed for personal use with reasonable request rates.

Also consider donating to the OpenStreetMap Foundation, as they rely on volunteer contributions and donations to operate. You can donate at <https://supporting.openstreetmap.org/donate/>.

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE) - if you modify it and offer it as a network service, you must share your source code.
