# Talk App — real development build

Next.js 15 (JavaScript only) + MySQL/MariaDB + direct WebRTC (browser-to-browser calls — no call server to run).
Design and functionality ported verbatim from the approved preview (talk-app-preview v61)
and `~/workspace/your_files/Talk-App-Design-Instruction.md`. See `FUNCTIONALITY.md`.

## Landing page (standalone HTML)
- `landing/` is the standalone static HTML landing page (plain HTML/CSS/vanilla JS, no build step): `landing/index.html` + `landing/style.css` (verbatim copy of `app/globals.css`) + the face images it uses under `landing/assets/faces/`. Serve the folder with any static server (e.g. `python3 -m http.server` inside `landing/`).
- The user app, admin and Super Admin remain Next.js (everything under `app/`).

## Run locally
1. MariaDB running (local XAMPP default: user `root`, empty password — no DB user to create),
   with an empty database named `talk_app` created. Copy `.env.example` to `.env.local`.
2. `npm install`
3. `npm run migrate` — creates the tables (MariaDB-compatible).
4. `npm run seed` — preview dummy users/rooms/packages. Demo login for every seeded
   user: their preview email + password `password123` (owner: zahid@example.com).
   Super admin: admin@talk.app / admin123 at /admin/login.
5. App: `npm run dev` or `npm run build && npm run start` — http://localhost:3100.
   Both commands run `server.js`: Next.js + a WebSocket server on the same
   port. The socket carries presence, call signaling and instant pushes
   (incoming calls, accept / decline) — the app never polls the API in a
   loop, and call media stays browser-to-browser (direct WebRTC).

## Notes
- Chat photos are never uploaded: the API stores only a `photo_ref` marker with no image.
- Expired paid subscriptions auto-switch to Free (checked on /api/me and /api/packages).
- Code is pushed to GitHub `zahidhasannipu01/JustTalk` (main). No deployment has been made.
