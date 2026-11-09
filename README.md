# Hyperlocal On-Demand Service Marketplace App

A production-ready blueprint and backend codebase for a hyperlocal service marketplace (Urban Company / TaskRabbit style) featuring real-time geospatial matching with PostgreSQL + PostGIS, worker online/offline presence toggles, and secure API endpoints.

---

## Project Structure

```text
worker/
├── backend/
│   ├── src/
│   │   ├── db.ts           # PostgreSQL connection pool configuration
│   │   └── server.ts       # Express API server & Socket.io geospatial endpoints
│   ├── package.json        # Node.js dependencies & scripts
│   └── tsconfig.json       # TypeScript compiler options
├── database/
│   └── schema.sql          # PostGIS database DDL, tables, and GIST spatial indexes
└── README.md
```

---

## Getting Started

### 1. Database Setup (PostgreSQL with PostGIS)
Make sure you have PostgreSQL installed with the PostGIS extension enabled:
```sql
CREATE DATABASE marketplace_db;
\c marketplace_db;
CREATE EXTENSION IF NOT EXISTS postgis;
```
Run the DDL script located at `database/schema.sql` to set up tables, enums, and spatial GIST indexes.

### 2. Backend Setup & Running
Navigate to the `backend` folder:
```bash
cd backend
npm install
```

Configure your environment variables in `.env` (or let it default to localhost):
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/marketplace_db
PORT=4000
```

Start the development server:
```bash
npm run dev
```

---

## API Endpoints

### 1. Update Worker Location
- **URL**: `POST /api/worker/location`
- **Body**:
  ```json
  {
    "workerId": "uuid-string",
    "latitude": 12.9716,
    "longitude": 77.5946
  }
  ```

### 2. Search Nearby Workers
- **URL**: `GET /api/customer/search?lat=12.9716&lng=77.5946&skill=plumbing&radius=5000`
- **Response**: Returns a sorted list of online workers within the specified radius along with distance in meters.
