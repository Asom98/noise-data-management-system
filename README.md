# Noise Pollution Data Management System

A time-series data pipeline and multi-stakeholder dashboard for urban noise monitoring in Malmö City.

Built as a Master's thesis project in Computer Science / Applied Data Science at **Malmö University** by Kassem Alsheikh and Nicholas Thomson, following the **Design Science Research (DSR)** methodology.

---

## What It Does

The system ingests live noise measurements from 5 real IoT sensors deployed across Malmö, stores them in a time-series database, and serves them through a web dashboard designed for multiple stakeholder groups (environmental officers, city planners, IT staff).

**5 real sensors monitored:**

| Sensor ID | Location |
|-----------|----------|
| DN0007 | Spångatan x Bergsgatan |
| DN0008 | Västravarvsgatan |
| DN0009 | Bergsgatan 17 |
| DN0010 | Föreningsgatan x Disponentgatan |
| DN0011 | Fersens v. x E. Dahlbergsg. |

---

## Architecture

```
Malmö Yggio IoT Platform  (sensordata.malmo.se)
        │  REST API — polled every 60 seconds
        ▼
 yggio_ingester            Python service — authenticates, extracts dB values, deduplicates
        │
        ▼
 TimescaleDB               PostgreSQL hypertable partitioned on timestamp
        │
        ▼
 frontend_api              FastAPI — 7 REST endpoints
        │
        ▼
 frontend                  React + Vite dashboard — 8 pages
```

**Stack:**

| Layer | Technology |
|-------|-----------|
| Database | TimescaleDB (PostgreSQL 15) |
| Ingestion | Python 3 — `requests`, `psycopg2` |
| API | FastAPI (port 8000) |
| Frontend | React 18 + Vite (port 5173) |
| Charts | Recharts |
| Map | React-Leaflet + OpenStreetMap |
| Containerisation | Docker + Docker Compose |

---

## Dashboard Pages

| Page | Description |
|------|-------------|
| Overview | KPI cards + multi-sensor noise chart with per-sensor toggle |
| Sensor Map | Live Leaflet map with colour-coded noise heat zones |
| Live Readings | Real-time per-sensor dB values, auto-refreshing |
| Alerts & Outliers | Readings exceeding thresholds in the last 24 hours |
| Sensor Health | Per-sensor status, last-seen time, battery and signal indicators |
| Data Analysis | Trend charts, peak-hour bar chart, reading distribution |
| Reports | On-demand CSV export of full measurement snapshot |
| Settings | Configurable alert thresholds, notification preferences |

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — must be running before starting
- Git
- Yggio platform credentials (provided by Malmö Stad)

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Asom98/noise-data-management-system.git
cd noise-data-management-system
```

### 2. Create the environment file

Create `services/yggio_api/.env` with the required credentials.

> **Ask the project owners to get the credentials.**

### 3. Start all services

```bash
docker compose up --build -d
```

This starts 5 containers:

| Container | Role | Port |
|-----------|------|------|
| `noise_timescaledb` | Database | 5432 |
| `noise_mqtt` | MQTT broker | 1883 |
| `yggio_ingester` | Data ingestion (polls every 60s) | — |
| `frontend_api` | REST API | 8000 |
| `frontend` | React dashboard | 5173 |

### 4. Open the dashboard

```
http://localhost:5173
```

The ingester begins polling Yggio immediately. Data populates in the dashboard within 1–2 minutes.

---

## Useful Commands

```bash
# Check ingestion logs
docker logs yggio_ingester -f

# Check API logs
docker logs frontend_api -f

# Stop all services
docker compose down

# Stop and delete all data (full reset)
docker compose down -v

# Restart frontend after a code change
docker compose restart frontend
```

---

## API Endpoints

All endpoints are served at `http://localhost:8000`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sensors` | All sensors with GPS coordinates |
| GET | `/api/measurements/latest` | Latest reading per sensor |
| GET | `/api/measurements/history?hours=1` | Time-bucketed history (1–168h) |
| GET | `/api/stats` | Dashboard KPI summary |
| GET | `/api/alerts` | Readings > 70 dB in last 24h |
| GET | `/api/sensors/health` | Per-sensor health status |
| GET | `/api/reports/data` | Full snapshot for CSV export |

---

## Project Structure

```
noise-data-management-system/
├── db_init/
│   ├── init.sql              # Schema, GPS seed data, hypertable setup
│   └── aggregations.sql      # Hourly continuous aggregate view
├── services/
│   ├── yggio_api/
│   │   ├── yggio_to_db.py    # Ingestion service (polls Yggio → TimescaleDB)
│   │   └── .env              # Credentials (not committed)
│   ├── frontend_api/
│   │   └── main.py           # FastAPI backend
│   └── frontend/
│       └── src/
│           ├── pages/        # 8 dashboard pages
│           ├── components/   # Sidebar, Header, SensorMap
│           └── utils/
│               └── noise.js  # Shared constants, colour helpers, CSV export
└── docker-compose.yml
```
