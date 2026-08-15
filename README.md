# Bus Management System

A live transportation management platform for el-renad.com — trip scheduling, seat reservations, fleet tracking, and role-specific dashboards for everyone involved in getting students on and off a bus. Deployed and running in production.

## Roles & Dashboards

**Admin** — full system oversight and configuration.
<br>**Movement Manager** — trip scheduling and fleet coordination.
<br>**Driver** — assigned trips and route details.
<br>**Supervisor** — on-trip monitoring.
<br>**Student** — registration, trip booking, and seat reservations.

Each role gets its own dashboard under a shared auth layer, so people only see what's relevant to their job.

## Stack

**Frontend** — Next.js, TypeScript, internationalized (multi-locale)
<br>**Backend** — NestJS, TypeScript, Jest for testing

## Structure

```
frontend/     Next.js app — auth, dashboard (per role), trips, maintenance
backend/      NestJS API — src, test, seed data, deployment scripts
```

## Notes

This is a real production system with a production deployment pipeline, environment-based configuration, and a documented accessibility and design-system pass on the frontend.

## Getting Started

```bash
# frontend
cd frontend
npm install
npm run dev

# backend
cd backend
npm install
npm run start:dev
```

Copy `.env.example` to `.env` in both `frontend/` and `backend/` and fill in the values before running.
