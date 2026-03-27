# SecureHealthCare

SecureHealthCare is a full-stack prototype for transmitting, storing, and reviewing encrypted medical records. The backend (Express + MySQL) issues JWTs, encrypts every payload with AES‑256‑CBC, and persists both the ciphertext and envelope keys. The Vite/React frontend handles patient/clinician onboarding, secure uploads, and a lightweight analytics dashboard.

## Feature Highlights

- **Account lifecycle** – Registration and login endpoints hash passwords with `bcrypt`, mint JWTs, and gate every protected route via the middleware in [backend/middleware/auth.js](backend/middleware/auth.js).
- **Zero-knowledge style uploads** – The upload route encrypts each submission client-side, re-encrypts on the server with a one-time symmetric key, and stores `encrypted_data` plus `encrypted_key` (key + IV) for audit replay.
- **Automated data hygiene** – [backend/db.js](backend/db.js) connects to MySQL and ensures the `records` table carries a `created_at` timestamp, backfilling legacy rows so dashboards can sort consistently.
- **Realtime UI feedback** – The React pages in [frontend/src/pages](frontend/src/pages) surface upload state, active-session counts, record snippets, and graceful handling of expired tokens.
- **Extensible foundation** – The repo is deliberately small and unopinionated so you can swap the DB, move secrets into `.env`, or plug in additional care-team workflows.

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Backend | Node.js 20+, Express 5, `mysql2`, `bcrypt`, `jsonwebtoken`, native `crypto` |
| Frontend | React 19, React Router 7, Axios, Vite |
| Database | MySQL 8 (tested locally), auto DDL/backfill helper in `db.js` |

## Repository Layout

```
SecureHealthCare/
├── backend/
│   ├── crypto.js              # AES-256-CBC helpers (encrypt/decrypt)
│   ├── db.js                  # MySQL connection + schema guardrails
│   ├── middleware/auth.js     # JWT verification middleware
│   ├── routes/
│   │   ├── auth.js            # /auth/register and /auth/login
│   │   ├── records.js         # /records + /records/upload
│   │   └── stats.js           # /stats summary counts
│   └── server.js              # Express bootstrap (port 3000)
├── frontend/
│   ├── src/
│   │   ├── api.js             # Axios instance pointing to backend
│   │   ├── App.jsx            # Router wiring login/register/dashboard/upload
│   │   ├── pages/             # Login, Register, Dashboard, Upload flows
│   │   └── components/        # Shared UI primitives (e.g., Navbar placeholder)
│   ├── public/
│   └── package.json           # Vite scripts (dev/build/lint)
├── package.json               # Backend dependencies (Express, MySQL, JWT, etc.)
└── README.md
```

## Prerequisites

- Node.js ≥ 20 (aligns with ES modules used by Vite and modern Express middleware)
- npm ≥ 10
- MySQL 8.x running locally (default config expects `root` / `abhi123` / `healthcare`)
- Optionally, `nodemon` for live-reloading the backend during development

## 1. Backend Setup

1. **Install dependencies**
	```bash
	cd SecureHealthCare
	npm install
	```

2. **Configure secrets and database credentials**
	- Update the connection object inside [backend/db.js](backend/db.js) to match your MySQL host/user/password/database.
	- Replace the hard-coded JWT secret (`"secret"`) in [backend/routes/auth.js](backend/routes/auth.js) and [backend/middleware/auth.js](backend/middleware/auth.js) with a strong key. Consider refactoring both to consume `process.env.JWT_SECRET`.

3. **Provision the schema**
	```sql
	CREATE DATABASE healthcare;
	USE healthcare;

	CREATE TABLE users (
	  id INT PRIMARY KEY AUTO_INCREMENT,
	  name VARCHAR(120) NOT NULL,
	  email VARCHAR(255) NOT NULL UNIQUE,
	  password VARCHAR(255) NOT NULL,
	  role ENUM('patient','physician','researcher','admin') DEFAULT 'patient',
	  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE records (
	  id INT PRIMARY KEY AUTO_INCREMENT,
	  patient_id INT NOT NULL,
	  encrypted_data LONGTEXT NOT NULL,
	  encrypted_key VARCHAR(256) NOT NULL,
	  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	  FOREIGN KEY (patient_id) REFERENCES users(id)
	);
	```
	> `backend/db.js` will automatically add/backfill the `created_at` column if it is missing, but creating it up front avoids extra ALTER statements at runtime.

4. **Run the API**
	```bash
	node backend/server.js
	# or, for live reload:
	npx nodemon backend/server.js
	```
	The server listens on `http://localhost:3000` and exposes `/auth`, `/records`, and `/stats` routes. CORS is fully open for local development.

## 2. Frontend Setup

1. **Install dependencies**
	```bash
	cd SecureHealthCare/frontend
	npm install
	```

2. **Point the UI at your API**
	- `frontend/src/api.js` defines the Axios base URL. Adjust it if the backend runs on a different host, port, or behind a tunnel.

3. **Run the Vite dev server**
	```bash
	npm run dev
	```
	Vite defaults to `http://localhost:5173`. The app expects the backend to be reachable at `http://localhost:3000` so keep both servers running simultaneously.

## API Reference

| Method | Endpoint | Description | Auth |
| --- | --- | --- | --- |
| POST | `/auth/register` | Create a user with `name`, `email`, `password`, and optional `role`. Passwords are hashed with bcrypt cost 10. | ❌ |
| POST | `/auth/login` | Validates credentials and returns `{ token }`. The JWT payload includes the user ID. | ❌ |
| POST | `/records/upload` | Encrypts the payload using AES‑256, stores ciphertext + key/IV, and associates it with the authenticated user. | ✅ `Authorization: Bearer <token>` |
| GET | `/records` | Fetch encrypted records for the current user ordered by `created_at` (fallback to `id`). | ✅ |
| GET | `/stats` | Returns aggregate counts `{ activeSessions, totalRecords }`. Currently `activeSessions` mirrors total registered users. | ✅ |

### Sample Auth Flow

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
		  "name": "Dr. Maya Patel",
		  "email": "maya@clinic.org",
		  "password": "strong-password",
		  "role": "physician"
		}'

curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "maya@clinic.org", "password": "strong-password" }'

curl -X POST http://localhost:3000/records/upload \
  -H "Authorization: Bearer <TOKEN_FROM_LOGIN>" \
  -H "Content-Type: application/json" \
  -d '{ "data": "BP:120/80 | HR:72" }'
```

## Frontend Flows

- **`/` Login** – [frontend/src/pages/Login.jsx](frontend/src/pages/Login.jsx) validates inputs, stores the JWT in `localStorage`, and redirects to `/dashboard`.
- **`/register`** – [frontend/src/pages/Register.jsx](frontend/src/pages/Register.jsx) captures full name, work email, password, and role, then calls `/auth/register`.
- **`/dashboard`** – [frontend/src/pages/Dashboard.jsx](frontend/src/pages/Dashboard.jsx) fetches `/records` and `/stats`, sorts records by timestamp/ID, and renders KPI cards plus the latest encrypted snippets. Invalid tokens trigger automatic logout.
- **`/upload`** – [frontend/src/pages/Upload.jsx](frontend/src/pages/Upload.jsx) posts formatted text to `/records/upload`, shows optimistic status chips, and routes back to the dashboard.

Shared styles live in `frontend/src/styles.css`, while `frontend/src/api.js` centralizes Axios configuration to keep headers consistent.

## Security Notes & Limitations

- AES keys and IVs are currently stored alongside the ciphertext (`encrypted_key` column contains `key:iv`). This simplifies demos but should be replaced with envelope encryption backed by a KMS in production.
- JWT secrets and DB credentials are hard-coded for now; move them into environment variables or a secrets manager before deploying.
- CORS is unrestricted. Lock it down (or proxy through the frontend dev server) once you host the API publicly.
- Password reset, MFA, audit logging, and granular role-based access controls are out of scope but can be layered on top of the existing routes.

## Troubleshooting

- **`ECONNREFUSED` / MySQL errors** – Verify the credentials in `backend/db.js`, ensure MySQL is running, and confirm the `healthcare` database exists.
- **`Invalid token format`** – The auth middleware requires `Authorization: Bearer <token>`. Login again to refresh an expired token.
- **Uploads succeed but dashboard is empty** – Confirm your user ID matches `patient_id` in the `records` row. Re-login and re-upload to regenerate consistent IDs.
- **Created_at missing** – Allow the backend to run once so the auto-migration in `db.js` can add/backfill the column, or add it manually via SQL.

## Next Ideas

1. Split backend and frontend into separate workspaces with dedicated scripts (`npm run dev:server`, `npm run dev:client`).
2. Introduce `.env` handling (`dotenv`) for secrets and connection strings.
3. Replace the placeholder Navbar component with a persistent top-level navigation + user avatar.
4. Add automated tests (Vitest for the frontend, Jest/Supertest for the API) and CI linting hooks.

---

Happy building! Open an issue or PR if you enhance the SecureHealthCare prototype with new workflows, data pipelines, or compliance features.