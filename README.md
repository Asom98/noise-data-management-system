# Malmö Noise Data Management System

A full-stack time-series data pipeline and role-based web dashboard for urban noise monitoring in Malmö City.

Developed as a Master's thesis project in Computer Science / Applied Data Science at **Malmö University** by **Kassem Alsheikh** and **Nicholas Thomson**, following the **Design Science Research (DSR)** methodology.

---

## Overview

The system continuously ingests live noise measurements from five real IoT sensors deployed across Malmö, stores them in a time-series database, and exposes them through a multi-stakeholder web dashboard protected by JWT-based authentication and role-based access control (RBAC). Three distinct dashboards serve environmental officers, IT staff, and the general public — each with access scoped to their informational needs.

---

## Monitored Sensors

| Sensor ID | Location |
|-----------|----------|
| DN0007 | Spångatan × Bergsgatan |
| DN0008 | Västravarvsgatan |
| DN0009 | Bergsgatan 17 |
| DN0010 | Föreningsgatan × Disponentgatan |
| DN0011 | Fersens v. × E. Dahlbergsg. |

Sensor data is sourced from the **Malmö Stad Yggio IoT platform** (`sensordata.malmo.se`).

---

## System Architecture

```
Malmö Yggio IoT Platform  (sensordata.malmo.se)
        │  REST API — polled every 60 seconds
        ▼
 yggio_ingester       Python service — authenticates, paginates 90-day
        │             historical backfill, then enters live polling loop
        ▼
 TimescaleDB           PostgreSQL 15 hypertable partitioned on timestamp
        │             Unique constraint on (sensor_id, ts) prevents duplicates
        ▼
 frontend_api          FastAPI — JWT auth + 15 REST endpoints
        │
        ▼
 frontend              React + Vite — landing page, login, 8 dashboard pages
```

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Database | TimescaleDB (PostgreSQL 15) |
| Ingestion | Python 3 — `requests`, `psycopg2`, `python-dotenv` |
| API | FastAPI + Uvicorn (port 8000) |
| Authentication | JWT (HS256) — `python-jose`, `passlib[bcrypt]` |
| Frontend | React 18 + Vite (port 5173) |
| Charts | Apache ECharts (`echarts-for-react`) |
| Map | React-Leaflet + OpenStreetMap |
| Containerisation | Docker + Docker Compose |

---

## Authentication and Access Control

The system uses **JSON Web Token (JWT)** authentication with **Role-Based Access Control (RBAC)**. Users are directed to a landing page where they select their role before logging in.

### Roles

| Role | Access |
|------|--------|
| **Admin** | All pages including user management |
| **Environmental Officer** | Full monitoring and reporting dashboard |
| **IT Staff** | Technical pages: Overview, Sensor Health, Database Explorer |
| **Citizen** | Public read-only view — no login required |

Citizens receive a guest JWT automatically; all other roles require valid credentials. A single `canAccess(role, route)` utility function is the authoritative source for both sidebar rendering and route protection on the frontend. All data endpoints require a valid Bearer token, verified server-side via `Depends(get_current_user)`.

---

## Dashboard Pages

| Page | Roles | Description |
|------|-------|-------------|
| Overview | All | KPI cards (avg dB, active sensors, alerts) + interactive multi-sensor noise chart |
| Sensor Map | Admin, Env. Officer, Citizen | Live Leaflet map with colour-coded noise zones per sensor |
| Live Readings | Admin, Env. Officer | Real-time per-sensor dB values, auto-refreshing |
| Alerts & Outliers | Admin, Env. Officer | Readings exceeding 70 dB in the last 24 hours |
| Sensor Health | Admin, Env. Officer, IT Staff | Per-sensor Data Availability Rate (DAR), last-seen time, status |
| Database Explorer | Admin, Env. Officer, IT Staff | Live database statistics, row counts, raw measurement query |
| Reports | Admin, Env. Officer | On-demand CSV export of full measurement snapshot |
| Settings | Admin, Env. Officer | Configurable alert thresholds and notification preferences |
| Admin | Admin only | User management — add, view, and remove user accounts |

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Git
- Yggio platform credentials (provided by Malmö Stad)

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Asom98/noise-data-management-system.git
cd noise-data-management-system
```

### 2. Configure environment variables

Create `services/yggio_api/.env` with the following variables:

```env
# Yggio API credentials (provided by Malmö Stad)
YGGIO_USERNAME=your_username
YGGIO_PASSWORD=your_password

# Database
DB_HOST=timescaledb
DB_PORT=5432
DB_NAME=noise_db
DB_USER=noise_user
DB_PASSWORD=your_db_password

# Admin account seeded on first startup
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_admin_password

# JWT signing secret — change this in any non-local deployment
JWT_SECRET=your-jwt-secret
```

> Contact the project owners to obtain the Yggio credentials.

### 3. Start all services

```bash
docker compose up --build -d
```

This starts five containers:

| Container | Role | Port |
|-----------|------|------|
| `noise_timescaledb` | TimescaleDB database | 5432 |
| `noise_mqtt` | MQTT broker | 1883 |
| `yggio_ingester` | Data ingestion service | — |
| `frontend_api` | REST API | 8000 |
| `frontend` | React dashboard | 5173 |

### 4. Open the dashboard

```
http://localhost:5173
```

On first startup, the ingester runs a full 90-day historical backfill before entering the 60-second live polling loop. The admin account is seeded automatically from the `ADMIN_USERNAME` and `ADMIN_PASSWORD` environment variables.

---

## Data Ingestion Design

The ingester (`yggio_to_db.py`) uses a **paginated backfill strategy** on every startup:

- Fetches the full 90-day archive in 3-day chunks (`distance=60s`) to stay within Yggio's row-per-request limit.
- Inserts rows with `ON CONFLICT (sensor_id, ts) DO NOTHING` — fully idempotent, no duplicates regardless of how many times it runs.
- Enters a live loop polling the last 10 minutes of data every 60 seconds.

This design ensures no measurement days are ever missed due to downtime, container restarts, or deployment gaps.

---

## Sensor Health — Data Availability Rate (DAR)

DAR is computed per sensor using the **median inter-reading gap** from the last 30 days (filtered to gaps between 60 s and 3600 s). This gives the expected cadence for that specific sensor, making the availability rate robust to sensors with varying reporting frequencies.

| DAR | Status |
|-----|--------|
| ≥ 90 % | Healthy |
| 70 – 89 % | Degraded |
| < 70 % | Critical |

---

## API Endpoints

All endpoints are served at `http://localhost:8000`. Data endpoints require an `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint | Auth required | Description |
|--------|----------|:---:|-------------|
| POST | `/api/auth/login` | — | Authenticate with username and password; returns JWT |
| POST | `/api/auth/guest` | — | Issue a citizen-role JWT without credentials |
| GET | `/api/auth/me` | ✓ | Verify token and return current user info |

### User Management (Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all user accounts |
| POST | `/api/users` | Create a new user |
| DELETE | `/api/users/{username}` | Remove a user account |

### Sensor Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sensors` | All sensors with GPS coordinates |
| GET | `/api/measurements/latest` | Latest reading per sensor |
| GET | `/api/measurements/history` | Time-bucketed history (`?hours=1–168`) |
| GET | `/api/stats` | Dashboard KPI summary |
| GET | `/api/alerts` | Readings > 70 dB in the last 24 hours |
| GET | `/api/sensors/health` | Per-sensor DAR and health status |
| GET | `/api/reports/data` | Full measurement snapshot for CSV export |
| GET | `/api/db/summary` | Database row counts and table statistics |
| GET | `/api/db/raw` | Paginated raw measurement query |

---

## Useful Commands

```bash
# View ingestion logs (backfill progress + live loop)
docker logs yggio_ingester -f

# View API logs
docker logs frontend_api -f

# Stop all services
docker compose down

# Stop and wipe all data (full reset)
docker compose down -v

# Restart a single service after a code change
docker compose restart frontend_api
```

---

## Project Structure

```
noise-data-management-system/
├── db_init/
│   ├── init.sql                  # Schema, GPS seed data, hypertable + index setup
│   └── aggregations.sql          # Hourly continuous aggregate view
├── services/
│   ├── yggio_api/
│   │   ├── yggio_to_db.py        # Ingestion service — backfill + live loop
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   └── .env                  # Credentials (gitignored — not committed)
│   ├── frontend_api/
│   │   ├── main.py               # FastAPI backend — auth + all data endpoints
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   └── frontend/
│       ├── src/
│       │   ├── context/
│       │   │   ├── AuthContext.jsx     # JWT state, Axios interceptor, guest login
│       │   │   ├── LanguageContext.jsx # EN/SV i18n
│       │   │   └── SettingsContext.jsx # User preferences
│       │   ├── pages/
│       │   │   ├── LandingPage.jsx     # Role-selection entry screen
│       │   │   ├── Login.jsx           # Credential form with role enforcement
│       │   │   ├── Admin.jsx           # User management (admin only)
│       │   │   ├── Overview.jsx
│       │   │   ├── SensorMapPage.jsx
│       │   │   ├── LiveReadings.jsx
│       │   │   ├── AlertsOutliers.jsx
│       │   │   ├── SensorHealth.jsx
│       │   │   ├── DatabaseExplorer.jsx
│       │   │   ├── Reports.jsx
│       │   │   └── Settings.jsx
│       │   ├── components/
│       │   │   ├── Sidebar.jsx         # Role-filtered navigation + sign-out
│       │   │   ├── Header.jsx
│       │   │   └── SensorMap.jsx
│       │   └── utils/
│       │       ├── roles.js            # RBAC config + canAccess() utility
│       │       ├── noise.js            # Shared constants and colour helpers
│       │       ├── en.js               # English translations
│       │       └── sv.js               # Swedish translations
│       ├── Dockerfile
│       └── package.json
└── docker-compose.yml
```

---

## Authors

**Kassem Alsheikh** and **Nicholas Thomson**
Master's Programme in Computer Science / Applied Data Science
Malmö University — 2026
