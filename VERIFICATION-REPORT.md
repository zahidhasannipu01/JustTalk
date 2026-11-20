# Talk App — Full Verification Report (RE-RUN)

- **Date:** 2026-11-21 (Asia/Dhaka)
- **Ordered by:** Owner — redo of the previous check that ended without a report.
- **Scope:** Real app at `~/workspace/talk-app/` (Next.js 15, JavaScript only, port 3100), plain-HTML landing at `~/workspace/talk-app/landing/`, `~/workspace/talk-app/landing-preview.html`.
- **Design source of truth:** approved prototype `talk-app-preview` v61 (`~/workspace/ts-spaces/talk-app-preview`), `FUNCTIONALITY.md`, `~/workspace/your_files/Talk-App-Design-Instruction.md`.
- **Rules for this run:** no GitHub push, no deployment. Small unambiguous mismatches fixed and logged (§4). Owner's mid-run correction (chat photo) applied and logged (§3.2).

## 0. Environment

| Item | Result | Evidence |
|---|---|---|
| MariaDB installed | PASS — 10.11.14 (`/usr/sbin/mysqld`) | `which mysqld` |
| MariaDB running | Was STOPPED at start of run; started via systemctl → `active` | `systemctl is-active mariadb` |
| DB `talk_app` + user `talkapp` | **Was MISSING** (fresh MariaDB data dir after VM wipe). Restored: DB + user recreated from `.env.local` values (credentials never printed), `npm run migrate` → 21 tables, `npm run seed` → 13 users | migrate/seed output |
| Next.js production build | PASS — `npm run build` compiled; server on port 3100 | `curl localhost:3100/` → 200 |
| LiveKit server | PASS — self-hosted LiveKit 1.8.4 on port 7880 (`npm run livekit:dev`) | livekit startup log |

## 1. Functional checks (API / end-to-end, production build)

Tested with curl cookie sessions per user against http://localhost:3100 plus direct DB reads. Seeded users: zahid@example.com (id 1), tania@example.com (id 2); admin admin@talk.app. **24 / 24 PASS** (one — #13 — failed as found, was fixed, then passed; see §4.1).

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Register a NEW user | PASS | `POST /api/auth/register` → `{ok:true, user:{id:14,...}}` with all fields; further test users ids 18–20 also registered |
| 2 | Login email+password only; wrong password rejected | PASS | Correct → 200 + user JSON; wrong password → 401 `Email or password is incorrect` |
| 3 | Dashboard numbers | PASS | `GET /api/dashboard` → at seed state: today 24 min, week 168 min — both exact seed values, confirmed in two independent runs; all-time 342 min, rating 4.6 (19 ratings) (numbers later grew from test calls, as expected) |
| 4 | Start Calling matchmaking pair + pickup + token | PASS | Two seeded users queued → both received the SAME call (id 1) with each other as partner; LiveKit JWT verified (iss = API key, room + identity claims, canPublish/canSubscribe) |
| 5 | Rating gate <5 min / ≥5 min | PASS | 2-second call → `POST /api/calls/rate` 403 `Ratings open after a call of at least 5 minutes`. Coordinator retest with a genuine 400-second call: `/end` → `duration_seconds:400, can_rate:true`; `/rate` → `{ok:true}`; ratings row stored (fluency 5, speaking 4, behaviour 5) |
| 6 | Free 15-min/day limit | PASS | Free user at 24 min today → match 403 `Your free minutes for today are used up`; at exactly 15 min also 403 |
| 7 | Rooms list; private wrong/right password | PASS | 4 seeded rooms; wrong password → 400 `Wrong room password`; `ielts123` → `{ok:true}` + token issued |
| 8 | Create room (public + private) | PASS | Public room id 5 and private room id 7 created via API and present in `GET /api/rooms` with correct visibility (an early attempt with a malformed body got 400; the clean retest passed) |
| 9 | People: search, friend request, accept | PASS | Search by name and by email returns the right person with correct phone-visibility shaping; request → accept → both appear in each other's `GET /api/people` connections |
| 10 | Block → call blocked, chat disabled; unblock → chat works | PASS | After A blocks B: B's direct call → `{ok:true, blocked:true}`; B's message → 403 `Chat is disabled`. After unblock: B's message → `{ok:true}` and is stored |
| 11 | Chat send/read; photo stores NO image | PASS | Text message stored and read back by recipient; photo message row in `messages`: `kind='photo_ref'`, `ciphertext=NULL` — no image data anywhere |
| 12 | Manual payment → waiting → admin approve → plan active | PASS | Zahid submits Plus via bKash (sender number + TrxID) → `status:'waiting'`, `pending_payment` shown; admin payments list shows it; admin approve → subscription becomes Plus, `expires_at` = +30 days, pending cleared |
| 13 | Expired plan auto-switches to Free | **FAIL as found → FIXED → PASS** | As found: backdating the active Plus subscription's `expires_at` changed nothing — no expiry logic existed anywhere (§4.1). After the fix: `GET /api/packages` returns Free, the Plus row is marked `expired`, and a new active Free subscription is created automatically |
| 14 | Support ticket → admin reply visible to user | PASS | User creates ticket (kind/subject/body); admin PATCH reply sets `admin_note` + status `answered`; user reads back status `answered` with the exact note text |
| 15 | Report a user → admin note → platform block | PASS | Report created without blocking; admin note saved; admin `block_user` → reported user's login refused: `This account is suspended` |
| 16 | Notifications | PASS | Message, photo (`Sent a photo`) and subscription-reminder notifications all present via `GET /api/notifications` |
| 17 | Super Admin login (separate) | PASS | Wrong password → 401; correct → 200 + admin JSON; admin routes reject non-admin sessions |
| 18 | Admin Overview — metrics only | PASS | users 19, online 13, total minutes 967, total calls 123, avg 7.9 min/call, taka totals, activity log — no message/call content fields anywhere |
| 19 | Admin Users & activity: search, plan change, suspend | PASS | Search `Block Tester` → exactly the 2 matching users; plan change (user → Pro) verified on the user's own `/api/packages`; suspend → that user's login refused `This account is suspended`. Lists paginate with real totals |
| 20 | Admin Packages incl. `ai_report_frequency` | PASS | Free = `none`, Plus = `weekly`, Pro = `daily` in both admin and user APIs; editing Pro's tag was reflected on the user Subscription API immediately, then reverted to `Most features` |
| 21 | Admin AI & API settings | PASS | GET → provider DeepSeek, base URL https://api.deepseek.com, key masked (`sk-•••`), balance 25.00, soft limit 30 AI-min/day; POST save → `{ok:true}` |
| 22 | Platform controls — payment numbers | PASS | `pay_bkash_number` = 01712-345678, `pay_nagad_number` = 01812-345678 (dummy, as settled) |
| 23 | Payments remind | PASS | Admin `remind` → `subscription_reminder` notification created for the user (`Payment reminder` title) |
| 24 | Pages return 200 | PASS | `/`, `/login`, `/register` → 200; `/app` and `/admin` → 307 to login when unauthenticated (correct), 200 with a valid session; plain-HTML landing served statically → 200, its assets → 200 |

## 2. Design match vs prototype (Next app)

Verified by: served-HTML fetches (curl), component-source inspection, CSS value comparison against the prototype source, and headless-Chromium screenshots (see §3.3). This is a structure/copy/token check plus landing screenshots — not a pixel-diff of logged-in screens (see §5).

| Check | Result | Evidence |
|---|---|---|
| A. Colour tokens | PASS | `app/globals.css:3` — `--bg:#F2F2EE; --ink:#101210; --accent:#FF4D24` — identical values in the prototype source and in `landing/style.css:1` |
| B. Fonts | PASS (one note, §4.3) | DM Serif Display (latin normal+italic), Manrope, Noto Sans Bengali declared in `globals.css`; rendered landing screenshot shows DM Serif italic accents + Manrope body exactly as the prototype |
| C1. Landing `/` structure | PASS | Served HTML contains hero, dashboard showcase (24 min / 342 / 9 days, canvas chart), features, how-it-works, pricing (Free/Plus/Pro with weekly/daily AI wording), AI section, safety, FAQ, footer |
| C2. `/login` | PASS | Email + password fields only, Log in / Create account actions — nothing else |
| C3. `/register` | PASS | Name, email, password, phone + visibility (Only me/Friends only/Public), gender, talk preference, photo input, Facebook/Google buttons |
| C4. `/app` shell + views | PASS | 307→login unauthenticated; `components/AppShell.js` + all view files present (Dashboard, Rooms, People, ChatView, ProfileSettings, Subscription, Support) with the prototype's sections (Start Calling card, stats, chart; room Public/Private badges; People rows; chat bubbles/composer; subscription plan cards; ticket form) |
| C5. `/admin/login` + `/admin` | PASS | Separate admin login (email/password only); `AdminPanel.js` sections: Overview, Users, Packages (Create-at-top + separate form), AI settings, Platform controls, Payments, Reports, Tickets, Activity |
| D6. Pricing wording (all surfaces) | PASS | `Plus — AI weekly reports`, `Pro — AI daily reports`, Free neither: in `app/page.js`, `landing/index.html`, `landing-preview.html`, and the live `/api/packages` |

## 3. Plain-HTML landing specifics

### 3.1 Checklist

| Check | Result | Evidence |
|---|---|---|
| D1. Canvas chart (not fallback bars) | PASS | `landing/index.html` has `<canvas class="lp-chart">` + local Chart.js (`assets/chart.umd.min.js`, no CDN); screenshot (§3.3) shows gradient bars + trend line + dots rendered |
| D2. Fonts embedded locally | PASS | `landing/fonts.css` — all `@font-face` srcs are RELATIVE `url(assets/fonts/*.woff2)`; the 4 woff2 files exist locally; no Google Fonts link. (A checker initially flagged absolute paths/`local('')`; coordinator grep of the whole tree found neither string anywhere — the file on disk is correct, flag corrected here) |
| D3. Tania Islam chat row uses her real face photo | PASS | `<img src="assets/faces/tania.jpg">` in `landing/index.html`; data-URI face in `landing-preview.html`; visually confirmed in screenshots |
| D4. Private = black pill lock, not colourful emoji | PASS | Markup uses `.lp-vis-badge.priv` + inline SVG lock; screenshots show the black `Private` pill; no 🔒 emoji in the badge |
| D5. Footer has NO "Super Admin" | PASS | Visible copy: footer is Log in · Register · Open the app; `landing/index.html` has 0 occurrences of "super admin" in any case. Precision note: `landing/style.css` and the embedded stylesheet in `landing-preview.html` each contain 6 case-insensitive "Super admin" occurrences — all CSS section comments carried over from the prototype stylesheet (e.g. `/* Super admin: platform metrics */`), never visible copy, links or footer content. (Next landing nav also has none) |
| D7. bKash logo | PASS | App asset `public/assets/bkash-logo.png` md5 `707feca116483093a548229ad264cf63` — **byte-identical** to the owner-supplied original `~/workspace/user/media_library/image/Bkash-Logo__1.png` (same md5), has alpha (transparent), and is the `<img>` used in the Subscription payment selector (`SubscriptionView.js`). The plain landing folder has no payment selector at all (it is the separated marketing page, per the owner's structure); the design checker labelled that part FAIL for completeness, but no landing payment UI exists in the prototype's landing sections either — the selector lives in the app, where it is verified above. `landing-preview.html` uses the prototype's own inline SVG bKash artwork, same as the prototype |

### 3.2 Owner correction (mid-run): real photo inside the landing chat thread

- **Before:** the photo message in the "Chat — Tania Islam · Online" mockup was a placeholder bubble `<div class="lp-bubble lt">📷 Photo</div>` (emoji + text) in BOTH `landing/index.html` (line 155) and `landing-preview.html` (line 1658).
- **The flow (owner's words, kept intact):** header `Chat — Tania Islam · Online` → Tania: "Hi! Ready for Part 2 practice? 🎙" → me: "Yes — give me a topic card." → **PHOTO — the photo IS the topic given to talk about** → me: "Got it. See you at 7pm 👍". So the in-chat picture must read as a topic picture (a scene/subject to describe and discuss) — not a portrait/face, and NOT Tania's profile photo. The header/People avatars still use her face photo, unchanged.
- **Photo used:** the prototype's own sample chat photo, `assets/study-notes.webp` (1920×1280) — a study-desk scene: open notebook with handwritten study notes, an "English Practice Book", pen and tea. It is the exact asset the prototype's Tania conversation itself uses for a shared photo ("Sharing my study notes from this morning"), so style and context match the prototype exactly; it is a describable topic scene, not a person.
- **Applied:** plain landing — original file copied byte-identical (md5 `5b3038831065655ea5b4a23a0d6356b5`) to `landing/assets/study-notes.webp`; bubble is now `<div class="lp-bubble lt has-img"><img class="chat-img" src="assets/study-notes.webp" alt="Photo shared in this chat"></div>`, with a `.lp-bubble .chat-img` rule in `style.css` mirroring the prototype's `.bubble .chat-img` (block, max-width 230px, radius 12px). Preview file — same markup and CSS, photo embedded as a data-URI JPEG rendition (640 px wide, 43,865 bytes — the same embedding pattern the file already uses for its face photos) so the single file stays self-contained.
- **Verified:** `📷 Photo` placeholder count = 0 in both files; asset serves `200 image/webp`; headless-Chromium screenshots of BOTH pages (§3.3) show the study-notes photo rendering inside the chat thread between "give me a topic card." and "Got it. See you at 7pm 👍".

### 3.3 Screenshots (coordinator, headless Chromium on this VM)

Rendered: Next landing `/` (1280×900), plain landing full page (1280×9000) + section bands, `landing-preview.html` full page + bands — kept at `/tmp/design-check/`. Observed: pill nav, serif-italic hero accent, orange accent, taka pricing chips, canvas chart with light gradient bars + trend line, Tania face photos, black Private pill, chat photo (§3.2), no overflow or unstyled regions. Note: mid-page sections look faded in static captures because the reveal-on-scroll animations have not triggered in a headless screenshot — an artifact of the capture, not a styling defect.

## 4. Mismatches found & fixes made

### 4.1 FIXED — Subscription auto-expiry to Free was not implemented (§46)
FUNCTIONALITY §46 / Instruction §15 require: a paid plan that ends unrenewed switches to Free automatically, everywhere the plan is shown. As found, no code anywhere checked `expires_at` — an expired Plus user stayed "Plus" forever (reproduced live). **Fix:** new `lib/subscription.js` → `currentSubscription(userId)` performs the switch (marks the paid row `expired`, inserts an active Free row — the expired-from plan stays in history) and is now used by `/api/me`, `/api/packages`, `/api/dashboard` and `/api/calls/match`. Rebuilt, restarted, retested: backdated Plus → packages API returns Free, DB shows Plus `expired` + new active Free row. PASS.

### 4.2 FIXED — Landing chat photo placeholder (owner correction)
See §3.2. Placeholder `📷 Photo` replaced by the prototype's study-notes topic photo in both landing files.

### 4.3 NOTED, not changed — Manrope latin @font-face
`app/globals.css` declares Manrope only with a latin-ext unicode-range (the DM Serif and Noto faces include latin). This is exactly what the prototype's own build source declares — the CSS port is faithful, and the rendered output was verified visually correct in screenshots. Adding a latin subset would deviate from the approved port, so it is flagged here for the owner instead of changed silently.

### 4.4 NOTED, not changed — Reminder wording for Free users
`POST /api/admin/payments {action:'remind'}` builds its text from the user's active plan; reminded while on Free it reads "Free renewal ৳0 is due soon". In normal use the admin Payments due-list only contains paid plans (the reminder's target audience), where the wording names the real plan and amount. Left as-is; flagged for the owner.

### 4.5 Environment restore (not a code change)
MariaDB service was stopped and the database/user had been wiped with the VM; restored per §0 before testing.

### 4.6 CHECKED AND CLEARED — Register form Username (and goal) fields
The design checker flagged a `Username` field (and a practise-for goal in the form state) on `/register` because the short field list in Instruction §7 does not name them. Checked against FUNCTIONALITY.md's Register section: the preview's Register page itself shows Username and the practise-for select ("Note: the preview form also shows Username and a practise-for goal select, which the instruction's Register list does not name"). The built form therefore matches the preview, which is the design source of truth — not a mismatch, and nothing was changed. Flagged here only so the owner sees it was checked.

## 5. NOT verified (honest list)

- **Real two-device LiveKit media flow** — tokens are issued correctly and the LiveKit server runs, but no two live browser/device endpoints were available to this agent, so actual audio/video media between two people is unverified.
- **Pixel-level visual diff of logged-in screens** (`/app` views, `/admin` sections) against the prototype — structure, copy and behaviour verified via served HTML, component source and APIs; screenshots were taken of the landing pages only (the headless shell has no login session).
- **Mobile/tablet viewport rendering** of the Next app screens — landing pages checked at desktop width (1280) only.
- **DeepSeek AI report generation itself** — settings load/save verified; no API key exists in the app (the owner enters his own key in Super Admin), so no real report was generated.
- **Facebook/Google social login** with real provider credentials — buttons/flows present; no provider app credentials on this VM.

## 6. Test data created/changed on this dev VM

Registered test users (ids 14, 18, 19, 20 — verify/block/suspend testers; 19 and 20 left suspended by the block/suspend tests), rooms 5–8, test calls (incl. call 157), one stored rating, payment request 2 (approved → Plus → expired → auto-Free), ticket 5 (answered), report 2 (actioned), user 18's plan changed to Pro by the admin plan-change test, and Zahid's daily minutes grew from test calls (24 → 31). All seeded content otherwise intact. No GitHub push, no deployment.

## 7. Overall verdict

**PASS.** Functional: **24/24** checks pass (one real bug — subscription auto-expiry — found, fixed and re-verified). Design: tokens, fonts, per-screen structure, pricing wording and every plain-landing specific pass; the owner's chat-photo correction is applied and screenshot-verified in both landing files. Two low-risk observations are noted (§4.3, §4.4) without silent changes. Remaining unverified areas are listed honestly in §5 — the only significant one is a real two-device LiveKit call, which needs two live endpoints.
