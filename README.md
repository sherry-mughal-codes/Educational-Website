# FBISE Educational Platform (Class 9 & 10) - Phase 1 Foundation

Welcome to the development environment for the FBISE Educational Platform, built for Federal Board Class 9 and Class 10 matriculation students.

---

## 1. System Architecture & Prerequisites

### Architecture
- **Frontend:** Next.js 14 App Router, TypeScript, Vanilla CSS (Port `3001` on host, `3000` inside container).
- **Backend:** Django 5.1 with CORS headers and healthcheck API (Port `8000`).
- **Database:** PostgreSQL 16 Alpine with healthcheck and persistent Docker volume.
- **Analytics:** Google Analytics 4 (GA4) with client-side route tracking, PII sanitization, and debug controls.
- **Containerization:** Docker Compose with isolated network (`fbise_network`) and named storage (`fbise_postgres_data`).

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) with WSL2 engine on Windows.
- [Docker Compose](https://docs.docker.com/compose/) v2+ (bundled with Docker Desktop).
- [Git](https://git-scm.com/).
- Node.js 18+ (optional, for local development outside Docker).

---

## 2. Directory Structure

```text
Educational Website/
├── .env.example              # Template environment variables (tracked)
├── .env                      # Local environment configuration (git-ignored)
├── .gitignore                # Strict exclusion for secrets, node_modules, and cache
├── docker-compose.yml        # Multi-container service definitions
├── README.md                 # Complete system documentation
├── backend/                  # Django backend service
│   ├── Dockerfile            # Python 3.12 container specification
│   ├── entrypoint.sh         # DB readiness check & migration runner
│   ├── requirements.txt      # Python dependencies (Django, psycopg, cors)
│   ├── manage.py             # Django management CLI
│   ├── core/                 # Django project settings and root URLs
│   │   ├── settings.py       # Env-driven settings (PostgreSQL, CORS)
│   │   ├── urls.py           # Core URL router
│   │   ├── wsgi.py           # WSGI server entrypoint
│   │   └── asgi.py           # ASGI server entrypoint
│   └── api/                  # API application
│       ├── urls.py           # /api/ endpoints router
│       └── views.py          # /api/health/ database connectivity check
└── frontend/                 # Next.js frontend application
    ├── Dockerfile            # Node 20 Alpine container specification
    ├── package.json          # Next.js, React, and TypeScript dependencies
    ├── tsconfig.json         # TypeScript compiler configuration
    ├── next.config.mjs       # Next.js webpack configuration with watch polling
    └── src/
        ├── app/              # App Router pages and global CSS
        │   ├── layout.tsx    # Root layout with GA4 & Navigation
        │   ├── page.tsx      # Home dashboard & status verification
        │   ├── about/        # About test route
        │   └── resources/    # Resources test route
        ├── components/       # Reusable components
        │   ├── Analytics.tsx # GA4 tag injector and navigation listener
        │   ├── Navigation.tsx# Top navigation bar
        │   └── BackendStatus.tsx # Live API & PostgreSQL status monitor
        └── lib/
            └── analytics.ts  # GA4 helper, PII sanitization & debug controls
```

---

## 3. Environment Configuration

1. Copy the example configuration to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Key environment variables in `.env`:

| Variable | Default (Dev) | Description |
| :--- | :--- | :--- |
| `DJANGO_SECRET_KEY` | *(dev key)* | Django secret key (must be changed in production) |
| `DJANGO_DEBUG` | `1` | Enable debug mode (`1` for dev, `0` for prod) |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1,backend` | Allowed HTTP Host headers |
| `BACKEND_PORT` | `8000` | Host port for Django API |
| `POSTGRES_DB` | `fbise_db` | PostgreSQL database name |
| `POSTGRES_USER` | `fbise_user` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `fbise_dev_password_change_me` | PostgreSQL password |
| `FRONTEND_PORT` | `3001` | Host port for Next.js frontend |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Client-accessible URL for Django backend |
| `INTERNAL_API_URL` | `http://backend:8000` | Container-to-container internal URL |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | *(empty)* | GA4 measurement ID (e.g., `G-XXXXXXXXXX`) |
| `NEXT_PUBLIC_GA_DEBUG_MODE` | `false` | Enable verbose GA4 events in DebugView |

---

## 4. Docker Compose Commands

### Start Environment
To build and start all containers in detached mode:
```bash
docker compose up -d --build
```

### Inspect Running Services
```bash
docker compose ps
```

### View Live Logs
View all logs:
```bash
docker compose logs -f
```
View backend or frontend logs specifically:
```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

### Stop Services
Stop containers without deleting data:
```bash
docker compose stop
```
Stop and remove containers and networks:
```bash
docker compose down
```

### Rebuilding After Dependency Updates
If you add packages to `backend/requirements.txt` or `frontend/package.json`:
```bash
docker compose up -d --build
```

### Executing Commands Inside Containers
- Open Django shell:
  ```bash
  docker compose exec backend python manage.py shell
  ```
- Run custom Django management command:
  ```bash
  docker compose exec backend python manage.py <command>
  ```
- Open database CLI (psql):
  ```bash
  docker compose exec db psql -U fbise_user -d fbise_db
  ```

---

## 5. Database Management & Migrations

### Applying Migrations
Django migrations run automatically whenever the `backend` container starts via `backend/entrypoint.sh`.
To run migrations manually at any time:
```bash
docker compose exec backend python manage.py migrate
```

### Creating New Migrations
When models are added in future phases:
```bash
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate
```

### Data Persistence
PostgreSQL stores all data in a named Docker volume (`fbise_postgres_data`).
Recreating or restarting application containers (`docker compose down && docker compose up -d`) **does not** delete the database volume.

> [!WARNING]
> Running `docker compose down -v` removes the persistent volume and deletes all database records. Only use `-v` if you intentionally want to wipe all local data.

### Database Backup & Restoration

#### Creating a Backup
Export a compressed SQL dump to the host directory:
```bash
docker compose exec -T db pg_dump -U fbise_user fbise_db > backup_fbise_$(date +%Y%m%d_%H%M%S).sql
```
*(On Windows PowerShell:)*
```powershell
docker compose exec -T db pg_dump -U fbise_user fbise_db | Out-File -Encoding utf8 backup_fbise.sql
```

#### Restoring from a Backup
Restore an existing SQL dump into PostgreSQL:
```bash
docker compose exec -T db psql -U fbise_user -d fbise_db < backup_fbise.sql
```
*(On Windows PowerShell:)*
```powershell
Get-Content backup_fbise.sql | docker compose exec -T db psql -U fbise_user -d fbise_db
```

---

## 6. Google Analytics 4 (GA4) Integration

### Setting Up a GA4 Measurement ID
1. Create or log in to your account at [Google Analytics](https://analytics.google.com/).
2. Create a GA4 property for "FBISE Educational Platform".
3. Under **Admin > Data collection and modification > Data streams**, create a **Web** stream.
4. Copy your **Measurement ID** (format: `G-XXXXXXXXXX`).
5. Add it to your `.env` file:
   ```env
   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   NEXT_PUBLIC_GA_DEBUG_MODE=true
   ```
6. Restart the frontend container:
   ```bash
   docker compose restart frontend
   ```

### Graceful Fallback (When Unset)
If `NEXT_PUBLIC_GA_MEASUREMENT_ID` is empty or left unset, **no script tags or external network requests are executed**. The website operates smoothly with zero analytics overhead or errors.

### Route Tracking & Duplicate Prevention
- Automatic page views on script load are disabled (`send_page_view: false`).
- A client-side listener in `frontend/src/components/Analytics.tsx` tracks route changes using Next.js `usePathname` and `useSearchParams`.
- Each navigation cleanly sends a single `page_view` event containing the exact URL and title.

### Validating Events in GA4 DebugView & Realtime
1. Set `NEXT_PUBLIC_GA_DEBUG_MODE=true` in `.env`.
2. Open Chrome and navigate to `http://localhost:3001`.
3. Click through **Overview**, **About Board**, and **Study Resources**.
4. Open the browser Developer Console to observe logged events:
   ```text
   [Analytics GA4] page_view: { page_path: "/about", page_location: "...", debug_mode: true }
   ```
5. In the Google Analytics console, navigate to **Admin > DebugView**. Live test events will appear under the timeline.

### Privacy & PII Protection
- The utility `frontend/src/lib/analytics.ts` automatically strips sensitive parameters (`email`, `password`, `token`, `name`, `cnic`, `card`, etc.).
- No student passwords, personal profiles, or payment details are sent to Google Analytics.

---

## 7. Development vs. Production Differences

| Feature | Development | Production |
| :--- | :--- | :--- |
| `DJANGO_DEBUG` | `1` (True, detailed errors) | `0` (False, secure errors) |
| `DJANGO_SECRET_KEY` | Development placeholder | Cryptographically random secret via vault/env |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1,backend` | Exact production domain(s) |
| `CORS_ALLOWED_ORIGINS`| `http://localhost:3001` | HTTPS domain of production frontend |
| `POSTGRES_PASSWORD` | Local dev password | Strong random secret generated securely |
| Database Port | Private to Docker network | Private to VPC / container network |
| Web Server | Django `runserver`, Next.js `dev` | Gunicorn / Uvicorn + Nginx, Next.js `build && start` |
| Analytics Mode | `NEXT_PUBLIC_GA_DEBUG_MODE=true` | `NEXT_PUBLIC_GA_DEBUG_MODE=false` |
