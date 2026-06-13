# GCS — Garments Costing System

Professional garments cost sheet (OCS) management system built for Bangladesh RMG industry.

## Tech Stack
- **Frontend**: React 18 + Vite + Tailwind CSS v4
- **Backend**: Node.js + Express
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT with refresh tokens

## Features
- Per-size fabric consumption with yarn-based price calculation
- Trims with qty × rate calculation
- CM with SMV, overhead %, compliance %
- Live FOB bar with correct formula: `FOB = SubTotal ÷ (1 - commPct)`
- Target FOB vs actual gap analysis
- Approval workflow (Draft → Submitted → Approved)
- Excel export (OCS format)
- Style image upload

## Deployment
Automated via GitHub Actions → FTP → cPanel Node.js App.
