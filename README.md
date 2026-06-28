# Yaoundé CitizenHub

A modern, offline-capable municipal complaint management system.

## VPS Deployment Guide

1. **Clone the repository** to your VPS.
2. **Configure Environment Variables**:
   Create a `.env` file in the project root:
   ```env
   POSTGRES_USER=yaounde_admin
   POSTGRES_PASSWORD=your_secure_password
   POSTGRES_DB=complaint_db
   DATABASE_URL=postgresql://yaounde_admin:your_secure_password@db:5432/complaint_db
   SECRET_KEY=generate_a_very_long_secure_random_string_here
   FRONTEND_URL=https://your-frontend-domain.com
   ```
3. **Configure API Domain (Frontend)**:
   In `frontend/js/api.js`, make sure your production domain is set correctly if you aren't deploying both frontend and backend on the same origin. The `BASE_URL` logic handles both local dev and production automatically using relative paths, assuming the frontend and API are served together or through a reverse proxy.
4. **Deploy using Docker**:
   Run the following command to build and start the containers in the background:
   ```bash
   docker-compose up -d --build
   ```
5. **Reverse Proxy (Nginx / Caddy)**:
   - Proxy your domain to `http://127.0.0.1:8000`
   - Ensure SSL/TLS is enabled for the PWA and Service Worker to function properly.

## Features
- Offline Support (PWA)
- Full i18n (English / French)
- GIS Location mapping
- Suggestion Forum
- Role-based Access (Citizen / Staff)