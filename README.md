# Talk App — real development build

Next.js 15 (JavaScript only) + MySQL/MariaDB + LiveKit (self-hosted, open source).
Design and functionality ported verbatim from the approved preview (talk-app-preview v61)
and `~/workspace/your_files/Talk-App-Design-Instruction.md`. See `FUNCTIONALITY.md`.

## Landing page (standalone HTML)
- `landing/` is the standalone static HTML landing page (plain HTML/CSS/vanilla JS, no build step): `landing/index.html` + `landing/style.css` (verbatim copy of `app/globals.css`) + the face images it uses under `landing/assets/faces/`. Serve the folder with any static server (e.g. `python3 -m http.server` inside `landing/`).
- The user app, admin and Super Admin remain Next.js (everything under `app/`).

## Run locally
1. MariaDB running, database `talk_app` (see `.env.example`; real values in `.env.local`).
2. `npm install`
3. `npm run migrate` — creates the 21 tables (MariaDB-compatible).
4. `npm run seed` — preview dummy users/rooms/packages. Demo login for every seeded
   user: their preview email + password `password123` (owner: zahid@example.com).
   Super admin: admin@talk.app / admin123 at /admin/login.
5. LiveKit dev server: `npm run livekit:dev` (ws://127.0.0.1:7880, dev keys in .env.local).
6. App: `npm run dev` or `npm run build && npm run start` — http://localhost:3100

## Notes
- Chat photos are never uploaded: the API stores only a `photo_ref` marker with no image.
- Expired paid subscriptions auto-switch to Free (checked on /api/me and /api/packages).
- No GitHub push / deployment has been made — local build only, per the owner's rule.
