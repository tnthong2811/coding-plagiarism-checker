# Frontend (Auth MVP)

This frontend implements phase-1 auth use cases for `coding-plagiarism-checker`.

## Implemented screens

- Login (`/login`)
- Register (`/register`) - creates `STUDENT`; Google email registration sends temporary password + reset link
- Reset Password (`/reset-password`) - consumes emailed reset token
- Dashboard (`/dashboard`) - shows current role and auth health
- My Profile (`/me`) - calls `GET /api/auth/me`
- Student Upload (`/submissions/upload`) - joins classrooms and uploads file to submission-service/MinIO
- Admin Create User (`/admin/users`) - `BUSINESS_ADMIN` and `SYSTEM_ADMIN`
- Admin Classrooms (`/admin/classes`) - only `BUSINESS_ADMIN`

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
- By default, Vite proxies `/submission-api` to `http://localhost:8082`.
- If you want direct API base URL, create `frontend/.env` from `.env.example` and set `VITE_AUTH_API_BASE`.
- Optional: set `VITE_SUBMISSION_API_BASE` for direct submission-service URL.

## Quick manual test

1. Register a new user from `/register`.
2. For Google email registration, read the auth-service log when `APP_MAIL_ENABLED=false`, open the reset link, and set a new password.
3. Login from `/login`.
4. Open `/me` to verify JWT works.
5. Login as `BUSINESS_ADMIN` and open `/admin/classes` to create a classroom.
6. Assign a teacher username to the classroom, then create an assignment from `/teacher/submissions/history`.
7. Login as student, join by class code, and upload source files from `/submissions/upload`.

