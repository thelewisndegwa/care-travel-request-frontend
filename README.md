# CARE Kenya Travel Authority Request — Frontend

Plain HTML, CSS, and vanilla JavaScript frontend for the CARE Kenya Travel Authority Request (TAR) system.

## Prerequisites

- The TAR **backend API** must be running at `http://127.0.0.1:5000/api`
- A modern web browser

## Quick start

1. Start the backend (port 5000).

2. Serve the `frontend/` folder with any static file server:

   ```bash
   npx serve frontend
   ```

   Or use the **Live Server** extension in VS Code / Cursor and open `frontend/index.html`.

3. Open the URL shown by your static server (e.g. `http://localhost:5500` with Live Server).

4. Sign in with your CARE account credentials (or seed test users — see backend `npm run seed`).

## Backend configuration

Set the backend `FRONTEND_URL` environment variable to match where you serve this frontend, so activation email links work correctly:

```
FRONTEND_URL=http://localhost:5500
```

Activation links point to `activate.html?email=...&token=...` on your frontend URL (not port 5000).

**Important:** The API runs on port **5000** (`http://127.0.0.1:5000`); the frontend must run on a **different** port (e.g. **5500** with Live Server). Your backend `.env` should have:

```
FRONTEND_URL=http://localhost:5500
MONGODB_URI=mongodb://127.0.0.1:27017/care-travel-request
```

The login page checks backend connectivity automatically. If needed, override the API URL with `?apiBase=http://127.0.0.1:5000/api`.

## Local testing without email

If you need to set a password without going through the activation email flow, a backend admin can run:

```bash
node scripts/setPassword.js email@care.org YourPassword123
```

## Project structure

```
frontend/
  index.html              → redirects to login or dashboard
  login.html              → sign in
  activate.html           → account activation / set password
  dashboard.html          → my profile (role-aware shell home)
  requests.html           → my / team / all requests (by role)
  request-new.html        → create travel request
  request-detail.html     → view request, edit & resubmit if rejected
  approvals.html          → admin pending approval queue
  notifications.html      → notifications inbox
  admin-users.html        → superadmin user list
  admin-import.html       → superadmin employee Excel import
  css/styles.css
  js/
    config.js             → API base URL and app constants
    api.js                → fetch wrapper with JWT and error handling
    auth.js               → login, logout, route guards
    ui.js                 → toasts, badges, app shell layout
    requests.js           → travel request API and form helpers
    notifications.js      → notifications API and badge polling
    admin.js              → users and import API
```

## User roles

| Role | Capabilities |
|------|-------------|
| **user** | Create requests, view own requests, resubmit rejected requests, notifications |
| **admin** | Everything user can do, plus approve/reject team requests, team request filters |
| **superadmin** | Read-only all requests, list users, import employees (no create/approve) |

## API configuration

The API base URL is set in `frontend/js/config.js`:

```js
API_BASE_URL: 'http://localhost:5000/api'
```

Change this if your backend runs on a different host or port.

## Authentication

- JWT is stored in `localStorage` after login or activation.
- Protected pages redirect to `login.html` when no token is present.
- `401` responses clear the session and redirect to login.
- Logout clears `localStorage` and returns to the login page.
