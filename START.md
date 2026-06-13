# Garments Costing System — Setup & Run

## Prerequisites
- Node.js 18+
- PostgreSQL 14+ installed and running

## 1. Database Setup

Create the database in PostgreSQL:
```sql
CREATE DATABASE garments_costing;
```

## 2. Server Setup

```bash
cd server

# Edit .env — set your PostgreSQL credentials:
# DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/garments_costing?schema=public"

# Run database migration (creates all tables)
npx prisma migrate dev --name init

# Start server (development)
npm run dev
```
Server runs on: http://localhost:5000

## 3. Client Setup

```bash
cd client
npm run dev
```
App runs on: http://localhost:5173

## Environment Variables (server/.env)

| Variable | Example |
|---|---|
| DATABASE_URL | postgresql://postgres:pass@localhost:5432/garments_costing |
| JWT_SECRET | any-long-random-string-32-chars |
| JWT_REFRESH_SECRET | another-long-random-string |
| PORT | 5000 |
| CLIENT_URL | http://localhost:5173 |
