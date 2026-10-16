# ApplyGraph — Evidence-Based AI Job Matching Platform

ApplyGraph compares candidate resumes against job descriptions, identifies supported and missing skills, explains match scores using concrete resume evidence, and tracks job applications.

This repository contains the **Phase 1: Project Foundation**, establishing the modular FastAPI backend, PostgreSQL / SQLAlchemy 2.x / Alembic data tier, Docker orchestration, and React + TypeScript + Vite + Tailwind CSS dashboard shell with live health telemetry.

---

## Architecture Overview

```
applygraph/
├── frontend/                   # React 18 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/         # Reusable UI (Sidebar, TopNav)
│   │   ├── pages/              # OverviewPage & placeholder modules
│   │   ├── layouts/            # DashboardLayout shell
│   │   ├── services/           # API client (GET /api/v1/health)
│   │   ├── hooks/              # useHealthCheck with real-time polling
│   │   ├── types/              # Explicit TypeScript contracts
│   │   ├── App.tsx             # React Router route registry
│   │   └── main.tsx            # React DOM mounting & Tailwind styles
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
├── backend/                    # Python 3.11 + FastAPI + SQLAlchemy 2.x
│   ├── app/
│   │   ├── api/                # API router & v1 endpoints (/health)
│   │   ├── core/               # Pydantic Settings & environment config
│   │   ├── db/                 # DeclarativeBase, sessionmaker & connection checks
│   │   ├── models/             # Schema models (target_metadata for Alembic)
│   │   ├── schemas/            # Pydantic models (HealthResponse, DatabaseHealth)
│   │   ├── services/           # Business logic & health diagnostic service
│   │   └── main.py             # FastAPI factory, CORS, OpenAPI router
│   ├── alembic/                # Alembic database migration environment
│   ├── tests/                  # Pytest suite with HTTPX TestClient
│   ├── Dockerfile              # Containerized backend
│   └── requirements.txt        # Pinned backend dependencies
├── .env.example                # Canonical environment variable template
├── .gitignore                  # Git ignore rules for Python, Node & Docker
├── docker-compose.yml          # PostgreSQL & FastAPI services with healthcheck
└── README.md                   # System documentation
```

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, React Router v6, Lucide React icons |
| **Backend** | Python 3.11, FastAPI, Pydantic v2 / Pydantic Settings, SQLAlchemy 2.x, Alembic |
| **Database** | PostgreSQL 16 |
| **Quality & Ops**| Docker Compose, Pytest, HTTPX, ESLint, TypeScript `tsc --noEmit` |

---

## Quickstart Guide

### 1. Environment Configuration

Copy the template environment file:

```bash
# In repository root
cp .env.example .env

# In frontend directory
cp frontend/.env.example frontend/.env
```

Default values work out of the box for local development.

---

### 2. Backend Setup (Local Python)

Create and activate a Python 3.11 virtual environment, then install dependencies:

**On Windows (PowerShell):**
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**Run Backend Tests:**
```powershell
pytest
```

**Start FastAPI Local Server:**
```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API Base: `http://localhost:8000`
- Interactive Swagger Docs: `http://localhost:8000/api/v1/docs`
- Health Endpoint: `http://localhost:8000/api/v1/health`

---

### 3. Frontend Setup (Local Node.js)

Install npm packages and launch the Vite development server:

```powershell
cd frontend
npm install
npm run dev
```

- Web Application: `http://localhost:5173`
- Type & Build Check: `npm run build`
- Linter: `npm run lint`

---

### 4. Docker Compose Setup (PostgreSQL & Backend)

To launch the containerized database and backend service:

```bash
docker compose up -d --build
```

Compose manages:
- **`applygraph-postgres`**: PostgreSQL 16 container with `pg_isready` healthcheck probe.
- **`applygraph-backend`**: FastAPI container that waits for PostgreSQL to become healthy before launching.

To inspect container status:
```bash
docker compose ps
docker compose logs -f backend
```

---

## API Health Check Specification

### Endpoint: `GET /api/v1/health`

**Success Response (HTTP 200 OK):**
```json
{
  "status": "ok",
  "service": "ApplyGraph API",
  "version": "0.1.0",
  "environment": "development",
  "timestamp": "2026-10-16T16:00:00.000000Z",
  "database": {
    "connected": true,
    "details": "Database connection operational"
  }
}
```

If PostgreSQL is not running, the endpoint remains responsive (HTTP 200) with diagnostic information:
```json
{
  "status": "ok",
  "service": "ApplyGraph API",
  "version": "0.1.0",
  "environment": "development",
  "timestamp": "2026-10-16T16:00:00.000000Z",
  "database": {
    "connected": false,
    "details": "Database unavailable: [connection error details]"
  }
}
```

---

## Database Migrations (Alembic)

Alembic is configured to resolve model metadata dynamically from `app.models.Base` and connection strings from `app.core.config.settings`.

```powershell
cd backend
# Generate migration revision (after models are introduced in Phase 2)
alembic revision --autogenerate -m "create_initial_schema"

# Apply migrations
alembic upgrade head
```

---

## Project Roadmap

- **Phase 1: Foundation (Current)**: Architecture skeleton, FastAPI healthcheck, React dashboard shell, Docker Compose setup, and automated tests.
- **Phase 2: Resume Ingestion & Parsing**: Multi-format resume parsing (PDF/DOCX), entity extraction, and structured evidence mapping.
- **Phase 3: Job Parsing & Evidence-Based Matching**: Requirement decomposition, semantic evidence grounding, and transparent gap detection.
- **Phase 4: Application Pipeline & Analytics**: Kanban board, tailored proof packets, and interview conversion analytics.
