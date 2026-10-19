# FBISE Educational Platform (Class 9 & 10) - Phase 2 Public Release

Comprehensive educational portal built for Federal Board of Intermediate and Secondary Education (FBISE) Class 9 and Class 10 matriculation students.

---

## 1. System Architecture & Tech Stack

- **Frontend:** Next.js 14 App Router (Port `3001` host, `3000` container), TypeScript, Vanilla CSS.
- **Backend:** Django 5.1 with Django REST API (Port `8000`).
- **Database:** PostgreSQL 16 Alpine with named volume persistence (`fbise_postgres_data`).
- **Analytics:** Google Analytics 4 (GA4) with client-side route tracking, PII sanitization, and debug controls.
- **SEO Engine:** Next.js App Router dynamic metadata, Schema.org JSON-LD structured data, XML sitemap (`/sitemap.xml`), and `/robots.txt`.
- **Environment:** Docker Compose with isolated network (`fbise_network`).

---

## 2. Implemented Routes & Navigation

| Route | Purpose | Data Source | SEO & Metadata |
| :--- | :--- | :--- | :--- |
| `/` | Homepage with search, grade discovery, and featured study notes | `/api/classes/` & `/api/resources/` | `WebSite` Schema.org |
| `/class-9/` | Class 9 curriculum overview & subject index | `/api/classes/class-9/` | Canonical + Breadcrumbs |
| `/class-10/` | Class 10 matriculation curriculum & subjects | `/api/classes/class-10/` | Canonical + Breadcrumbs |
| `/class-9/[subject]/` | Class 9 subject syllabus & available notes | `/api/classes/class-9/<subject>/` | Canonical + Breadcrumbs |
| `/class-10/[subject]/` | Class 10 subject syllabus & available notes | `/api/classes/class-10/<subject>/` | Canonical + Breadcrumbs |
| `/[class]/[subject]/[resource]/` | Reusable educational content & notes template | `/api/resources/<cls>/<sub>/<res>/` | `LearningResource` Schema |
| `/search/` | Search with query, grade, and resource type filters | `/api/resources/?q=&class=&type=` | Canonical URL |
| `/about/` | Mission, curriculum alignment & independent status | Static / Editorial | Canonical URL |
| `/contact/` | Academic support inquiries & syllabus feedback | Configurable / Editorial | Canonical URL |
| `/privacy-policy/` | Data practices, GA4 cookies & AdSense disclosure | Static / Legal | Canonical URL |
| `/terms/` | Student non-commercial educational use rules | Static / Legal | Canonical URL |
| `/disclaimer/` | Copyright notice, fair use & non-affiliation | Static / Legal | Canonical URL |
| `/sitemap.xml` | Search engine XML index for all published URLs | `/api/sitemap-data/` | Dynamic XML standard |
| `/robots.txt` | Crawler indexing instructions | Next.js Metadata Route | Standard robots.txt |

---

## 3. Quick Start & Docker Commands

### Start Environment
```bash
docker compose up -d
```

### Apply Migrations & Seed Curriculum Data
Curriculum data is seeded with authentic FBISE Class 9 and Class 10 subjects:
```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py seed_fbise_data
```

### Inspect Services & Logs
```bash
docker compose ps
docker compose logs -f frontend
docker compose logs -f backend
```

### Access Local Endpoints
- **Frontend Portal:** [http://localhost:3001](http://localhost:3001)
- **Backend API:** [http://localhost:8000/api/](http://localhost:8000/api/)
- **Backend Healthcheck:** [http://localhost:8000/api/health/](http://localhost:8000/api/health/)
- **XML Sitemap:** [http://localhost:3001/sitemap.xml](http://localhost:3001/sitemap.xml)
- **Robots.txt:** [http://localhost:3001/robots.txt](http://localhost:3001/robots.txt)

---

## 4. Google Analytics 4 (GA4) Configuration

For detailed human owner setup, refer to [docs/ga4-setup-guide.md](file:///c:/Users/Sherry%20Mughal/Desktop/Educational%20Website/docs/ga4-setup-guide.md).

1. In `.env`, configure:
   ```env
   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   NEXT_PUBLIC_GA_DEBUG_MODE=true
   ```
2. Restart frontend:
   ```bash
   docker compose restart frontend
   ```
3. Open `http://localhost:3001` and verify live events in **GA4 > Admin > DebugView**.

---

## 5. Google AdSense Readiness

For deployment prerequisites and owner application steps, refer to [docs/adsense-readiness.md](file:///c:/Users/Sherry%20Mughal/Desktop/Educational%20Website/docs/adsense-readiness.md).
- The platform contains verified, original educational notes.
- Legal, privacy, and disclaimer pages are fully published.
- Live advertisements are not prematurely loaded; applications should only be submitted by the domain owner upon public HTTPS launch.
