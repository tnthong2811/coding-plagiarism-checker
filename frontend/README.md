# Frontend (Auth MVP)

This frontend implements phase-1 auth use cases for `coding-plagiarism-checker`.

## Implemented screens

- Login (`/login`)
- Register (`/register`) - creates `STUDENT`
- Dashboard (`/dashboard`) - shows current role and auth health
- My Profile (`/me`) - calls `GET /api/auth/me`
- Admin Create User (`/admin/users`) - only `ADMIN`

## Tech stack

- React + TypeScript + Vite
- React Router v6
- Native Fetch API for backend calls

## Prerequisites

- Node.js 18+
- Auth backend running at `http://localhost:8081`

## Run in development

```bash
cd frontend
npm install
npm run dev
```

Open: `http://localhost:5173`

## Build

```bash
cd frontend
npm run build
npm run preview
```

## Notes

- By default, Vite proxies `/api` and `/actuator` to `http://localhost:8081`.
- If you want direct API base URL, create `frontend/.env` from `.env.example` and set `VITE_AUTH_API_BASE`.

## Quick manual test

1. Register a new user from `/register`.
2. Login from `/login`.
3. Open `/me` to verify JWT works.
4. Login as admin and open `/admin/users` to create `TEACHER` or `ADMIN`.

