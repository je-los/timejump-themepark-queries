# TimeJump Theme Park - Team 13

## What’s included

- `timejump-basic/server/.env.example`: API env template, copy to `.env.local` (`.env.ignore` is an extra host we used to store older creds).
- `timejump-basic/server/package.json`: API scripts and deps.
- `timejump-basic/server`: Node.js API (entry `src/app.js`).
- `timejump-basic/web/package.json`: web scripts and deps.
- `timejump-basic/web`: React + Vite front end (dev server on port 5173).

## Server files (timejump-basic/server/src)

- `app.js`: starts the API and mounts routes.
- `http/server.js`, `http/router.js`: small HTTP/router helpers.
- `db.js`: MySQL pool. `services/dbUtils.js`: query/transaction helpers.
- `auth.js`: JWT helpers.
- `services/constants.js`: enums and cancellation reasons.
- `services/ensure.js`: (image columns, catalog tables, schedules, profiles, etc.).
- `services/rideLibrary.js`: ride catalog helpers.
- Routes: `routes/auth.js`, `profile.js`, `catalog.js`, `rides.js`, `maintenance.js`, `weather.js`, `orders.js`, `dashboard.js`, `reports.js`, `themes.js`, `system.js`, `operations.js`, `index.js`.
- Utils: `utils/buffer.js`, `calendar.js`, `date.js`, `object.js`, `strings.js`, `time.js`.

## Web files (timejump-basic/web/src)

- `main.jsx`, `App.jsx`: React entry and boots the router.
- Pages: `home.jsx`, `login.jsx`, `account.jsx`, `ticketcatalog.jsx`, `tickets.jsx`, `ridesandattractions.jsx`, `rideview.jsx`, `ride-cancellations.jsx`, `attractions.jsx`, `foodvendors.jsx`, `giftshop.jsx`, `themeview.jsx`, `manager.jsx`, `reports.jsx`, `reportsworkspace.jsx`, `rides.jsx`.
- Components: `nav.jsx`, `topnavboxes.jsx`, `cartmodal.jsx`, `requirerole.jsx`, `authtoast.jsx`.
- Context: `authcontext.jsx`, `cartcontext.jsx`.
- Helpers: `auth.js` (client token + API helper), `utils/toast.js`, `utils/deleteAlert.js`, `hooks/useauthtoast.js`.
- Other: `constants/brand.js`, styles in `styles.css`, `styles/base.css`, `styles/pages.css`, `styles/maintenance.css`, `styles/nav.css`, `styles/item-card-overrides.css`, `vite.config.js`.

## Prerequisites

- Node.js and npm.
- MySQL with a user that can create databases and triggers.

## Setup and install

1. **Create/import the database**

- Create DB (default `timejumpdb`)
- Import sql dump

2. **Configure environment files**

- API: copy `timejump-basic/server/.env.example` to `timejump-basic/server/.env.local` and set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `PORT` (default `5175`), `CORS_ORIGIN` (`http://localhost:5173` by default), `JWT_SECRET`.
- Web: create `timejump-basic/web/.env.local` with `VITE_API_URL` (e.g., `http://localhost:5175/api`)

3. **Install dependencies**

- From `timejump-basic/server`: `npm install`
- From `timejump-basic/web`: `npm install`

4. **Run locally**

- API (port 5175): `npm run dev` in `timejump-basic/server`
- Web (port 5173): `npm run dev` in `timejump-basic/web`, then open `http://localhost:5173`.

### ENV

DB_HOST=54.147.39.36
DB_PORT=3306
DB_USER=testuser
DB_PASSWORD=RQo4E!XExDw
DB_NAME=timejumpdb
PORT=5175
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=change_me
VITE_API_URL=http://localhost:5175/api
VITE_DEV_FAKE_ROLE=
VITE_DEV_FAKE_EMAIL=
