# Talk App — Functionality Specification

Source of truth: the owner's approved design/build instruction (`Talk-App-Design-Instruction.md`). Preview reference: the approved single-file preview (`index.html`, pages `#page-landing`, `#page-desktop`, `#page-tablet`, `#page-mobile`, `#page-login`, `#page-register`, `#page-admin-login`, `#page-admin`). Where the two sources are silent on a point, this document says so — nothing here is invented.

## 1. Global layout — one layout per device

- **Comes from:** Preview — device pages `#page-desktop` (`.desk-app` with left `.sidebar`), `#page-tablet` (`.tablet-screen` with icon `.rail`), `#page-mobile` (`.phone` / `.screen`); Instruction §5.
- **What it does:** Desktop and Tablet use left navigation and a full-width content area (the People page is full width on desktop). Mobile uses bottom navigation instead. Production is one responsive app that reproduces each device's preview layout exactly.
- **Do:** Match each device's preview page separately — layout, order, cards and spacing. Keep the top-right order on Desktop/Tablet as Notification button first, then Profile button. Keep the call window inside the device frame on mobile and tablet.
- **Do NOT:** Do not compress one device's layout into another or overcrowd a page. Do not put a profile block at the bottom of the sidebar (it was removed). Do not use "Bangonix" as the app's brand name (the app may live at talk.bangonix.app; Bangonix is the owner's company, not the app brand).

## 2. Page transition — colour sweep, 1.05s

- **Comes from:** Preview — `#page-wipe` (three `.pw-panel` panels plus `.pw-logo` "talk."); Instruction §5.
- **What it does:** Every page change inside the app plays a colour-sweep transition lasting 1.05s (the preview was slowed from 0.72s to 1.05s).
- **Do:** Run the sweep on every in-app page/view change, at 1.05s, on Desktop, Tablet and Mobile.
- **Do NOT:** Do not use an instant swap, a fade-only change, or a different duration. A different transition style is not specified in the preview/instruction — do not add without the owner's word.

## 3. Landing page — structure and sections

- **Comes from:** Preview — Landing page `#page-landing`: sticky `.lp-nav`, hero, realistic app showcase `.lp-app`, `#lp-features` ("/ 01 Everything, visible."), `#lp-how` ("/ 02 Tap. Talk. Grow.", 8 steps), `#lp-pricing` ("/ 03 Fair prices. In taka."), `#lp-ai` ("/ 04 AI reports. Your call."), `#lp-safety` ("/ 05 Safety & privacy, in plain words."), `#lp-faq` ("/ 06 Questions, answered straight."), final call-to-action and `.lp-foot`; Instruction §6.
- **What it does:** Presents what the app is, features with which plan includes what, how it works (create account → land on Dashboard → Start Calling / join a room → talk in the floating call → connect & rate → watch progress → go unlimited), fair pricing in taka, the AI features teaser, safety/privacy, and FAQ — with very little text, facilities shown visually with realistic app visuals and smooth animations.
- **Do:** Keep the landing sections in the preview's order and keep text minimal. Keep the AI teaser on the landing page. Keep the footer links (Log in · Register · Open the app · Super admin) working.
- **Do NOT:** Do not add extra sections, blocks or copy that are not in the preview. Do not move the AI teaser off the landing page into the app Dashboard. Do not show any English level anywhere on the landing page.

## 4. Landing page — Dashboard showcase accuracy

- **Comes from:** Preview — Landing page hero showcase `.lp-app` (the app's own frame, browser bar, sidebar and centre) and the Dashboard feature visual in `#lp-features` (`.lp-feat-chart` with stat row 24 min today / 342 min all time / 9 days streak); Instruction §6.
- **What it does:** Shows the real app Dashboard inside the landing page as the product visual.
- **Do:** Make the landing Dashboard showcase match the real Dashboard exactly — same cards, same numbers format, same design.
- **Do NOT:** Do not draw a simplified or invented mock dashboard for the landing page that differs from the in-app Dashboard.

## 5. Landing page — package click flow

- **Comes from:** Preview — Landing page pricing cards `.sub-card[data-plan]` in `#lp-pricing` ("Start on Free", "Choose Plus — ৳100/month", "Choose Pro — ৳150/month") and the comparison table; Instruction §6.
- **What it does:** Clicking any package on the landing page goes to Create account. After registering, the user lands inside the app and chooses/pays for the plan there, with the clicked plan preselected.
- **Do:** Route every landing package click to Register first, carry the clicked plan through registration, and preselect it on the in-app Subscription page where the manual payment flow happens.
- **Do NOT:** Do not take payment on the landing page, do not activate a paid plan at registration, and do not lose the clicked-plan preselection.

## 6. Landing page — Chart.js gradient graph

- **Comes from:** Preview — Landing page Dashboard feature visual, `canvas.lp-chart` ("Gradient Chart.js chart of minutes talked this week"); Instruction §3 and §6.
- **What it does:** Shows minutes talked as a real Chart.js line/area chart with a gradient fill.
- **Do:** Use real Chart.js with a gradient fill, driven by data, matching the preview's look.
- **Do NOT:** Do not fake the graph with a static image, CSS bars, or a flat non-gradient fill.

## 7. Landing page — thin voice waveform

- **Comes from:** Preview — matching visual `.lp-wave[data-spikes]` in `#lp-features` (JS rebuilds it densely on load) and the hero live-call visual; Instruction §6.
- **What it does:** Shows a live voice waveform while matching/speaking: many thin spikes of sharply varying height, centred on a midline, animating like a real voice.
- **Do:** Render thin 2 px bars, many spikes, centred on the midline, animated.
- **Do NOT:** Do not draw the waveform as big/small blocks, thick bars, or a few chunky rectangles.

## 8. Landing page — live-call window

- **Comes from:** Preview — Landing page hero live-call float `.lp-callfloat` (LIVE CALL header, "End-to-end encrypted" line, partner row with timer, icon-only round call controls including a working camera button); Instruction §6 and §9.
- **What it does:** Shows a realistic in-progress call on the landing page, with icon-only round controls; its camera button works because video is open.
- **Do:** Keep the controls icon-only and round with centred icons, keep the encryption line, and keep the camera control functional in the visual's behaviour.
- **Do NOT:** Do not disable the camera button, and do not put a "Soon" / "Coming soon" badge on it or on any video option.

## 9. Login

- **Comes from:** Preview — Login page `#page-login` (`.auth-card`: "Welcome back", Email address, Password, "Log in & continue →", "Continue with Facebook", "Continue with Google", "New to talk.? Create an account →", "← Back to app"); Instruction §7.
- **What it does:** Signs an existing user in with email + password only, or via Facebook/Google social login. The first screen after login is the Dashboard.
- **Do:** Keep Login as its own separate full-screen page with a clean form only — email + password, plus the Facebook and Google options shown in the preview. Land the user on the Dashboard after login.
- **Do NOT:** Do not present Login as a modal. Do not put a name, profile, user badge, or any extra field on the Login page.

## 10. Register

- **Comes from:** Preview — Register page `#page-register` (`.auth-card`: Your name, Username, Email, Password, profile picture upload, Phone number with "Who can see my phone number?" chips, Your gender chips, "I want to talk to" chips, "I want to practise for" select, "Create account →", Facebook/Google options); Instruction §7.
- **What it does:** Creates the account with name, email address, password, profile picture, phone number with a visibility choice, gender, and talk preference (women / men / both). The talk preference chosen here becomes the Start Calling default partner gender. Gender and talk preference can be changed later in Profile/Settings.
- **Do:** Keep Register as its own separate full-screen page. Collect the phone visibility choice at registration (see §13 of this document). Apply the talk-to preference as the Start Calling default.
- **Do NOT:** Do not present Register as a modal. Do not add an English level field or any field that is not in the preview/instruction. Note: the preview form also shows Username and a practise-for goal select, which the instruction's Register list does not name — do not add without the owner's word beyond what the preview shows.

## 11. Social login (Facebook / Google)

- **Comes from:** Preview — Login page `#page-login` and Register page `#page-register` ("Continue with Facebook", "Continue with Google" buttons); Instruction §7.
- **What it does:** Offers Facebook and Google as sign-in routes alongside email + password. After social login, gender and talk preference are set in the profile.
- **Do:** Show both social options where the preview shows them, and route a social-login user who has not set gender/talk preference to set them in Profile.
- **Do NOT:** Do not replace email + password login with social login, and do not invent additional social providers. The exact post-social-login set-up screen is not specified in the preview/instruction — do not add without the owner's word.

## 12. Email — locked after registration

- **Comes from:** Instruction §7 and §13; Preview — Settings view `.settingsview` `.sv-form` contains no email field, and the My Profile edit cards contain no editable email.
- **What it does:** The email address given at registration can never be changed afterwards; it stays locked in every edit form.
- **Do:** Keep email read-only/locked in Profile, Settings and every other edit form.
- **Do NOT:** Do not offer an email-change field, link or flow anywhere.

## 13. Phone number visibility — Only me / Friends only / Public

- **Comes from:** Preview — Register page phone-visibility chips, Settings view `.sv-phonevis-chips` ("Only me / Friends only / Public"), My Profile details row ("Phone visibility Friends only") and room-card visibility pills `.vis-pub` / `.vis-priv`; Instruction §12.
- **What it does:** Every user has a phone number with exactly three visibility options — Only me / Friends only / Public — default Only me. The choice is set on Register and can be changed in Profile and in Settings. The owner's own Profile always shows their number with its visibility label. Other surfaces show another person's number only when that person's setting allows it: Public = everyone, Friends only = their friends/people, Only me = nobody else.
- **Do:** Offer exactly these three options everywhere the choice appears, default to Only me, and enforce the setting in People rows, the chat profile drawer, and every other place a number could show.
- **Do NOT:** Do not add a fourth visibility option, do not change the default, and do not show a number anywhere the owner's setting forbids it.

## 14. Profile dropdown (Desktop / Tablet)

- **Comes from:** Preview — top-right profile button `.js-profile-trigger` opening `#profile-menu` (`.profile-menu`: header with avatar/name, then Dashboard, Room, My profile, Chats, Settings, Subscription with plan badge, Support, Super admin, Log out); Instruction §5.
- **What it does:** Opens the account menu from the top-right profile button. The instruction's core items are: Dashboard, My profile, Chats, Settings, Log out.
- **Do:** Open the dropdown from the top-right profile button, keep Notification before Profile in the top-right corner, and make every item navigate to its real view.
- **Do NOT:** Do not add a profile block at the bottom of the sidebar instead. Do not leave any dropdown item dead.

## 15. Mobile bottom navigation + More bottom drawer

- **Comes from:** Preview — Mobile page `#page-mobile` `.bottomnav` (Dashboard, Rooms, People, Chats, More) and bottom drawer `.m-drawer` with scrim `.m-scrim` (rows: Create room, My profile, Settings, Subscription, Support); Instruction §5.
- **What it does:** Mobile navigation is a bottom bar. Tapping More slides a drawer up from the bottom containing Create room, My profile, Settings, Subscription and Support.
- **Do:** Slide the More drawer up from the bottom with its scrim, keep the five bottom-nav items in the preview's order, and hide the bottom menu with a smooth slide-down when an individual chat is open or the mobile profile drawer is open, restoring it on return to the Chats list / drawer close.
- **Do NOT:** Never make More a side drawer. Do not keep the bottom menu visible over an open individual chat on mobile.

## 16. Mobile profile right drawer

- **Comes from:** Preview — Mobile page `#page-mobile` `.p-drawer` with `.p-scrim`, opened from the top-right profile picture (`.m-head .avatar`); CSS comment: slides in from the RIGHT edge of the mobile screen, mobile only; Instruction §5.
- **What it does:** Tapping the profile picture on mobile opens a drawer from the right with the user's identity header and menu rows (Dashboard, My profile, Chats, Settings, Log out in the preview). While it is open, the bottom menu hides with a smooth slide-down animation and returns when the drawer closes.
- **Do:** Use the right-side drawer on mobile only, animate the bottom menu down while it is open and back up when it closes, and close it from the scrim or its close control.
- **Do NOT:** Do not use the desktop profile dropdown on mobile, and do not open this drawer from the left or bottom.

## 17. Dashboard — stats

- **Comes from:** Preview — Dashboard built by the preview script into `.dash-view` on Desktop/Tablet/Mobile (`.dash-stats` stat cards: "24 min talked today" with daily-goal bar, "168 min talked this week", "342 min all-time talking · 26 calls", "9 days practice streak"); Instruction §8.
- **What it does:** Shows the user's own practice totals: minutes talked today, minutes this week, all-time minutes (with call count), and streak — the user's minutes per day with the weekly total beside it in the graph card.
- **Do:** Show only the Dashboard items the preview/instruction list, in the preview's order and design, with real per-user data in production.
- **Do NOT:** Do not add extra stat cards, blocks or figures that are not in the preview.

## 18. Dashboard — Chart.js graph with Weekly / Monthly / Yearly switch

- **Comes from:** Preview — Dashboard `.dash-grid` chart card (`canvas.wk-chart`, `.chart-head` with title/subtitle, custom `.period-dd` dropdown with Weekly / Monthly / Yearly `.period-opt` items; preview data sets `PERIODS` weekly/monthly/yearly); Instruction §8.
- **What it does:** Plots the user's minutes as a Chart.js chart with gradient fill. The default view is Monthly — the current month, day by day. A custom-designed dropdown (matching the app design) switches the same graph between Weekly (this week, day by day), Monthly and Yearly (month by month), updating the title and subtitle totals.
- **Do:** Use real Chart.js with gradient fill, default to the current month, and make the custom dropdown switch Weekly / Monthly / Yearly on the same graph.
- **Do NOT:** Do not use a native plain select styled unlike the app, a static image, or bar-only fake chart. Do not default to Weekly or Yearly.

## 19. Dashboard — rating card

- **Comes from:** Preview — Dashboard `.dash-grid` rating card ("Your rating", overall star value with "from N partner ratings", rows for Fluency / Speaking / Behaviour with tracks); Instruction §8 and §9.
- **What it does:** Shows the rating the user has received from partners, overall and split by Fluency, Speaking and Behaviour.
- **Do:** Show the overall rating, the number of partner ratings it comes from, and the three category rows exactly as in the preview.
- **Do NOT:** Do not add rating categories beyond fluency / speaking / behaviour, and do not show any English level next to the rating.

## 20. Dashboard — Start Calling card

- **Comes from:** Preview — Dashboard `.start-card` (dark card, "128 people online now" tag, "Start calling" heading, `.sc-btn.js-start-random` button); Instruction §8 and §9.
- **What it does:** The Dashboard's entry point to random calling. Tapping Start calling opens the Start Calling options (partner gender) and then matching — see §21 of this document.
- **Do:** Keep the card in the preview's position and design, with the live online count tag as shown.
- **Do NOT:** Do not turn the card into a direct call with no options step, and do not add a level choice to it.

## 21. Dashboard — what is NOT on it

- **Comes from:** Instruction §8 and §18; Preview — the script-built Dashboard (`.dash-view`) contains only the Start Calling card, stats, graph and rating.
- **What it does:** Defines the Dashboard by exclusion: the AI block and the "Recommended for you" block were removed, and room components do not live here.
- **Do:** Keep the Dashboard to Start Calling card, stats, graph and rating only. Keep rooms on the Room page and AI on the landing page, the Subscription AI plan and Super Admin AI settings.
- **Do NOT:** Do not bring back the AI block or "Recommended for you" on the Dashboard, and do not put room lists or room cards on the Dashboard.

## 22. Start Calling — options, matching and fallback

- **Comes from:** Preview — Start Calling overlay `#ov-match` (`#match-gender-chips`: Anyone / Female / Male; live `#match-count` line; "Start calling" `#match-go`) and the matching script (match order comment: (1) a random online person who fits the choice; (2) if nobody fits, join immediately to anyone looking for a call); Instruction §9.
- **What it does:** Tapping Start Calling first shows partner gender options — Female shown with a pink female icon, Male with a strong dark-blue male icon; Anyone is the third option. The registration talk preference preselects the default. Matching is random among online, non-blocked people who fit. If no user matches the chosen preferences, the caller is immediately joined to any person who is looking for a call — no waiting — and the call window says so while it rings.
- **Do:** Show the gender options first, every time; keep the Female = pink and Male = dark-blue icon colours in both plain and selected states; match randomly; apply the instant fallback to anyone looking.
- **Do NOT:** Do not offer any level choice (level is removed app-wide). Do not leave the caller waiting when the fallback applies, and do not match a blocked person.

## 23. Call window — in-place popup, minimisable and movable

- **Comes from:** Preview — floating call window `#callwin` (header `#callwin-head` with drag dots, partner name/status, minimise `#cw-min` and end `#cw-end-top` buttons; stage `#cw-stage`; minimised pill `#callmin` with avatar, name, timer, mic `#cm-mic`, restore `#cm-restore`, end `#cm-end`); Instruction §9.
- **What it does:** Every call button — on People, Profile, Chat, Rooms, everywhere — opens the call popup in place. The window can be dragged by its header, minimised to a small pill that keeps the call timer and mic/restore/end controls, and restored. On mobile/tablet it stays inside the device frame.
- **Do:** Open the popup in place from every call entry point, support drag-move and minimise/restore, and keep the minimised pill functional (timer keeps running, mic and end work from the pill).
- **Do NOT:** Never redirect to the Dashboard first to start a call. Do not let the window leave the device frame on mobile/tablet.

## 24. Call window — controls, video fully open, encryption line

- **Comes from:** Preview — call controls `#cw-controls` (mic `#cw-mic`, speaker `#cw-spk`, camera `#cw-video`, add people `#cw-add`, minimise `#cw-min2`, red end call `#cw-end`), self-view `#cw-selfview` ("You · camera on"), encryption line `.cw-enc` ("Encrypted. Only people in the call can hear you."), and the safety row (Report `#cw-report-btn`, Block this person `#cw-block-btn`); Instruction §9.
- **What it does:** Provides icon-only round controls: mic, speaker, camera (video), add people, minimise, and the red end-call button. Video is fully open: turning the camera on shows the self video view; turning it off returns to the audio view. Video entry points (chat header video button, profile drawer video button, People video call) start the call with the camera on. The only text line inside the call window is the approved encryption line: calls are end-to-end encrypted, only people in the call can hear you.
- **Do:** Keep every control icon-only, round and perfectly centred; keep the camera control enabled everywhere; keep the single encryption line visible in the call window.
- **Do NOT:** Do not disable any video/camera control and do not put a "Soon" / "Coming soon" badge on any video option. Do not add an English-check block or a "rating unlocks at five minutes" line inside the call window, and do not add any other text line inside it.

## 25. Incoming call

- **Comes from:** Preview — call window incoming state (`#cw-incoming` Decline / Accept call buttons, ringing stage) and the Desktop callzone "Simulate incoming call" button `#dz-incoming`; Instruction §9 (call popup behaviour).
- **What it does:** An incoming call rings in the same floating call window, showing the caller and Decline / Accept call actions; accepting connects the call, declining dismisses it. A declined/missed call feeds the missed-calls notifications.
- **Do:** Present incoming calls in the same in-place popup with working Decline and Accept actions.
- **Do NOT:** Do not open a separate incoming-call page. What happens to the caller after a decline beyond the missed-call notification is not specified in the preview/instruction — do not add without the owner's word.

## 26. Post-call rating — only at 5 minutes or more

- **Comes from:** Preview — rating overlay `#ov-rate` (partner row with duration, friend-request row `#rate-friend-row`, Report/Block row, star rows for Fluency / Speaking / Behaviour in `#rate-form`, "Skip" and "Save rating →"; locked state `#rate-locked` "This call was too short to rate"); Instruction §9.
- **What it does:** After a call ends, users can rate each other on fluency / speaking / behaviour — only if the call lasted at least 5 minutes. Under 5 minutes rating does not work (the locked state is shown instead). The rating shows on the user's profile. The same overlay offers Send friend request (which is how a partner later appears in People once accepted), plus Report and Block.
- **Do:** Gate rating strictly on call duration ≥ 5 minutes, rate exactly the three categories, and show received ratings on the profile.
- **Do NOT:** Do not allow rating after a call under 5 minutes, do not mention the 5-minute rating rule inside the call window, and do not add extra rating categories.

## 27. English nudge in chat

- **Comes from:** Preview — chat nudge bar `.eng-nudge` above the composer (manual Bengali-word matcher `findBengali()` over a fixed word list and the Bengali script range; dismiss button) and the landing feature visual `.lp-nudgepill`; Instruction §19 (Platform controls lists an "English nudge" switch).
- **What it does:** When the user types a Bengali word (Latin-script word matched against the manual list, or Bengali script) in chat, a gentle suggestion appears: "Talk in English. It will help you." — with the matched word and its meaning where the preview shows it. It is dismissible. There is no AI behind it.
- **Do:** Use the manual word match exactly as in the preview, show the approved nudge line, and let the user dismiss it.
- **Do NOT:** Do not use AI to detect language, do not block or alter the user's message, and do not turn the nudge into a warning or penalty. Whether the nudge also fires inside calls is not specified in the preview/instruction — do not add without the owner's word.

## 28. Rooms — Room page, Public / Private

- **Comes from:** Preview — Desktop centre rooms view (`.room` cards with faces, speaking counts and "Join room" `.join` buttons; search; create bar), Tablet and Mobile room lists; demo private room "IELTS Speaking — Part 2"; Instruction §10.
- **What it does:** All room components live on the page named Room. A room is Public or Private; anyone can join a Public room, and joining a Private room requires its password (the preview's demo private room uses password `ielts123`, a prototype value only).
- **Do:** Keep every room component on the Room page, label Public/Private as in the preview, and gate Private rooms behind the password prompt.
- **Do NOT:** Do not put room components on the Dashboard, and do not let anyone into a Private room without the correct password.

## 29. Create room

- **Comes from:** Preview — Create room overlay `#ov-create` (`#form-create`: Room title, "What will you talk about?" description, Room type select Audio + Video / Audio only / Video only, "Who can join?" `#room-vis-chips` Public/Private, password field `#room-pass-field` shown only for Private, "Create & join room →"); Instruction §10.
- **What it does:** A user creates a room with a title, description and type, chooses Public or Private, sets a password when Private is chosen, and is taken into the new room on creation.
- **Do:** Show the password field only when Private is selected, require a title, and join the creator to the room on submit.
- **Do NOT:** Do not add a level field or any other field to the create-room form, and do not show the password field for Public rooms.

## 30. Private room password entry

- **Comes from:** Preview — room password overlay `#ov-roompass` (`#form-roompass`, password input `#in-roompass`, error `#rp-err` "That password is not right — check it and try again.", "Join room →"); Instruction §10.
- **What it does:** Joining a Private room opens the password prompt; a wrong password shows the error and does not join; the correct password joins the room.
- **Do:** Validate against the room's password and show the preview's short error message on failure.
- **Do NOT:** Do not reveal the room's password anywhere in the prompt, and do not join on a wrong or empty password. A retry limit is not specified in the preview/instruction — do not add without the owner's word.

## 31. Mobile Room page — search-row icon buttons

- **Comes from:** Preview — Mobile Room page `.m-room-search-row` (full-row search input plus `.m-room-iconbtn.create` accent/orange plus button and `.m-room-iconbtn.people` dark people button, both with tooltips); Instruction §10.
- **What it does:** On mobile the search input takes the full row, with two round icon buttons beside it: the accent (orange) plus icon starts a practice room (opens Create room), and the dark people icon finds people to call (opens the People page). Both keep their actions and tooltips.
- **Do:** Keep both round buttons beside the mobile search, centred icons, with their actions and tooltips working.
- **Do NOT:** Do not add the two full-width buttons below the search on mobile — they do not exist there.

## 32. Chat — layout and scrolling

- **Comes from:** Preview — chat view `.chatview` (left `.cv-list` with header, search and `.cv-convs` conversation rows; right `.cv-main` with `.cv-head`, `.cv-msgs`, `.cv-form` composer) on Desktop/Tablet/Mobile; Instruction §11.
- **What it does:** Chat is a full screen: the left pane is the people/conversation list, the right pane is the main conversation with the input at the bottom. The left list scrolls only up/down. Conversations are end-to-end encrypted.
- **Do:** Keep the two-pane full-screen layout, vertical-only scrolling in the list (rows shrink and long text truncates instead of scrolling sideways), and the active-conversation styling from the preview.
- **Do NOT:** Do not allow horizontal scrolling in the chat list, and do not open chat as a modal or a small popover.

## 33. Chat — composer, emoji picker and photos

- **Comes from:** Preview — composer `.cv-form` (full-width input `.cv-in` on its own row; toolbar row with emoji button `.cv-emoji-btn`, photo button `.cv-img-btn`, send button `.cv-send`), emoji panel `.emoji-panel` with `.emoji-grid`, photo bubbles `.bubble.has-img` with `.chat-img`, and the device note `.cv-device-note`; Instruction §11.
- **What it does:** The composer is two rows on every device: the writing input takes the full width on top; underneath, emoji and photo buttons sit left and send sits at the right end, every icon centred. The emoji picker inserts emoji into the message. Photos can be sent and appear in the conversation, but photos are stored only on the users' phones, never on the server — phone-to-phone, so both users must be online at the same time.
- **Do:** Keep the two-row composer on desktop, tablet and mobile; keep the emoji picker working; deliver photos device-to-device only while both users are online.
- **Do NOT:** Do not upload or store chat photos on the server, and do not crowd the input and the icon buttons onto one row.

## 34. Chat — mobile header and bottom-menu behaviour

- **Comes from:** Preview — Mobile chat view header (back arrow `.cv-back`, round face with green online dot, name, one small online-status line, one call button) and the `#page-mobile.chat-open` rule that slides `.bottomnav` down and gives its height back to the conversation; Instruction §5 and §11.
- **What it does:** On mobile an open conversation has a clean WhatsApp-style header: back arrow, round face with green online dot, name, one small online-status line, one call button. While a conversation (not the Chats list) is open, the bottom menu hides with a slide-down animation and the composer sits at the very bottom; going back to the Chats list brings the menu back.
- **Do:** Keep the mobile header to exactly those elements and hide/restore the bottom menu exactly as the preview does.
- **Do NOT:** Do not add extra buttons or lines to the mobile chat header, and do not show any English level in it (the preview's mobile header text still carries a level word in one place — the instruction removes level app-wide, so it must not be built).

## 35. Chat — profile drawer from the right

- **Comes from:** Preview — profile drawer `.pdrawer` inside `.cv-main`, opened by tapping the name/avatar `.cv-id` in the chat header (hero avatar with presence dot, name, `.pd-status` online/last-online, `.pd-actions` call/video round buttons, About rows including Phone and Encryption, shared media `.pd-media` / `.pd-media-empty`, Report/Block buttons); Instruction §11.
- **What it does:** Tapping a person's name at the top of a conversation slides a profile drawer in from the right showing name, online status, last online, shared media, and phone number only if that person's phone visibility allows it.
- **Do:** Slide the drawer from the right over the conversation, close it from its X or scrim, start audio/video calls from its round buttons (video starts with camera on), and apply the phone-visibility rule to the Phone row.
- **Do NOT:** Do not show a level in this drawer, do not show the phone number when the person's visibility forbids it, and do not open the drawer as a separate page.

## 36. People — a page, with the privacy rule

- **Comes from:** Preview — People page `.peoplepage` (header `.pp-head`, body `.pp-body` with `.pp-search-row` and `.people-list`; person rows `.person` with avatar + presence, name, note, rating and icon-only `.acts` round buttons) present on Desktop, Tablet and Mobile; Instruction §12.
- **What it does:** People is a real full page on every device — never a modal, popup or sheet. Desktop shows it full width; mobile has no "People" header/back-navigation block. Privacy rule: People does not show all people — a person appears only after a random call has connected them and a friend request between them has been accepted. Online status is a green circle on the profile picture.
- **Do:** Switch the current app view to the People page from every People control, list only connected-and-accepted people (plus people added via the Add popup flow), and keep the approved row design: face, name, online status, rating, icon-only action buttons with centred icons.
- **Do NOT:** Do not open People as a popup/modal/sheet anywhere, do not list strangers or all users, and do not add a level to any row.

## 37. People — Add person popup

- **Comes from:** Preview — People page `.pp-search-row` with the small `.pp-add-trigger` "Add person" button flexed to the right of the full-width search, opening the Add person overlay `#ov-addperson` (`#form-addperson`, search input `#addperson-search` "Search by name or email", results `#addperson-results` with Add buttons, hint/empty states `.ap-state`); Instruction §12.
- **What it does:** Add works by email address or by searching a name, finds the real existing person, and adds them from the results. The popup is opened by the small Add button beside the search, not by a long full-width button.
- **Do:** Search real existing users by name or email, show the found person with an Add action, and keep the trigger as the small button to the right of the search.
- **Do NOT:** Do not add a level field to this popup, do not create a new/fake person from typed text, and do not make the Add trigger a full-width button.

## 38. People — block / unblock

- **Comes from:** Preview — People row block button `.mini-block`, block confirmation overlay `#ov-block` ("Block this person?", "Block" `#block-confirm`), and blocked-call overlay `#ov-blocked-call` ("Blocked", "Got it"); Instruction §12.
- **What it does:** Block/unblock controls live in the People list. A blocked person does not disappear from People — the row stays, marked blocked, with an Unblock action. While blocked, chat with that person is disabled; when the blocked person tries to call, a modal pops up: "sorry, that person has blocked you". Unblocking restores call and chat.
- **Do:** Keep blocked people listed, disable their chat, show the blocked-call modal on their call attempts, and restore everything on unblock.
- **Do NOT:** Do not remove a blocked person from People, do not let a blocked person's call or chat go through, and do not change the modal's meaning.

## 39. People — report a person (user side)

- **Comes from:** Preview — report overlay `#ov-report` (`#form-report`, reason chips `#report-reason-chips`: Harassment, Inappropriate behaviour, Spam or scam, Hate speech, Impersonation, Other; optional details textarea; "Send report →"), also reachable from the rating overlay and the chat profile drawer; Instruction §12.
- **What it does:** A user can report another user without blocking them: pick a reason, optionally add details, and send. The report goes to Super Admin, who reviews it and can block that user from the whole platform.
- **Do:** Keep report and block as separate actions, keep the preview's reason list and optional details field, and send reports to Super Admin Reports.
- **Do NOT:** Do not make reporting block the person automatically, and do not show the reporter any admin outcome beyond what the preview shows. The reporter's confirmation beyond the preview's success toast is not specified in the preview/instruction — do not add without the owner's word.

## 40. Online presence — green dot

- **Comes from:** Preview — `.av-wrap` + `.presence` green circle on avatars (People rows, chat list `.conv`, chat header, profile drawers, notification items, sidebar "Friends online" `.online-mini` with `.on` dot); Instruction §12.
- **What it does:** Anyone who is online carries a green circle on their profile picture, everywhere the avatar appears; offline people show their last-online text where the preview shows it.
- **Do:** Render the green presence dot consistently on every avatar surface for online users.
- **Do NOT:** Do not use a different colour or a text-only "online" label in place of the dot where the preview uses the dot.

## 41. My Profile page

- **Comes from:** Preview — profile view `.profileview` (header `.pv-head` with `.pv-av` avatar and photo-change button `.pv-photo-btn`, name/username/bio, stats `.pv-stats`: minutes today / this week / total / calls, detail rows `.pv-row` including phone + visibility label, gender, talk preference, rooms joined, streak, member since; practice partners `.pv-person` with Call buttons; recent activity `.pv-act`); Instruction §13.
- **What it does:** Profile is its own separate page showing the user's information, minutes, calls, streak, rooms, partners, activity and rating. The user can change profile picture, password and all information — except email, which is locked. The owner's own number is always shown here with its visibility label.
- **Do:** Keep Profile as a separate page with the preview's blocks, wire the photo-change button and partner Call buttons, and keep the password-change flow working with its success confirmation.
- **Do NOT:** Do not merge Profile into Settings or a dropdown, do not make email editable, and do not show any level on the profile.

## 42. Settings

- **Comes from:** Preview — settings view `.settingsview` (`.sv-form`: Your name, Username, Phone number, "Who can see my phone number?" chips, Your gender chips, "I want to talk to" chips, "I want to practise for" select, "Save settings"; Account card with member-since / speaks / learning rows); Instruction §13.
- **What it does:** Lets the user edit name, username, phone number and its visibility, gender, talk preference and practise goal, and save them. Phone visibility and gender/preference changes made here apply app-wide (including the Start Calling default).
- **Do:** Save all fields from the one form, keep the phone-visibility chips identical to Register/Profile, and keep the Account card read-only.
- **Do NOT:** Do not add an email field (email is locked), do not add a level field, and do not split these fields across extra tabs or pages that are not in the preview.

## 43. Notifications tray

- **Comes from:** Preview — bell button `.js-bell` with `.bell-badge`, tray `#notif-tray` (header "Notifications" + "Mark all read" `#nt-clear`, list `#notif-list` with sections: Payments, Missed calls, Messages); Instruction §14.
- **What it does:** The Notification button sits top-right, before the Profile button, with a badge counting unread items. The tray shows new messages, missed calls and subscription reminders. Tapping a missed call calls the person back in the call popup; tapping a message opens that chat; "Mark all read" clears the unread state.
- **Do:** Keep the bell before the profile button on every device page, group the tray as in the preview, and keep every tray item actionable.
- **Do NOT:** Do not add notification categories that are not in the preview/instruction, and do not leave the badge counting items that have been read.

## 44. Subscription page

- **Comes from:** Preview — subscription view `.subscriptionview` built by the preview script (header, current-plan banner `.sub-current` "You're subscribed — Free plan", plan cards `.sub-grid` / `.sub-card` from the shared `PLANS` data, AI plan block `.sub-ai` with "Notify me when AI launches" button) and the sidebar "Subscription" item with plan badge `.js-sub-badge`; Instruction §15.
- **What it does:** Shows all packages with Free selected by default as the current plan, stated clearly that the user is on Free but not forever — no end date is promised. Free = 15 minutes of calling per day; paid plans remove the daily limit (unlimited). Prices are in taka only: Plus ৳100/month, Pro ৳150/month. Choosing a paid plan opens the manual payment flow (see §45 of this document); it never activates instantly.
- **Do:** Default to Free as current/selected, keep the "free is not forever" wording honest with no invented end date, render the cards from the same package data Super Admin controls so admin changes show immediately, and route paid choices into the manual payment flow.
- **Do NOT:** Do not promise a Free end date, do not price anything in dollars, and do not activate a paid plan before Super Admin approval. ⚠️ The Plus = ৳100 / Pro = ৳150 mapping was the builder's interpretation and has not yet been confirmed by the owner — do not treat it as final until the owner confirms.

## 45. Manual payment flow — bKash / Nagad

- **Comes from:** Preview — manual payment overlay `#ov-manualpay` (plan/amount header `.mp-amount` with "SEND MONEY" tag, "I will pay with" custom dropdown `.paydd` `#mp-dd-pay`, numbers block `#mp-nums`, steps `#mp-steps`, proof form `#mp-form` with "How did you pay?" dropdown `#mp-dd-proof`, sender number `#mp-sender`, TrxID `#mp-trx`, "Submit — I have paid →"); Instruction §15. Preview dummy numbers: bKash 01712-345678, Nagad 01812-345678 (prototype values only).
- **What it does:** Payments are manual because there is no payment gateway: the user sends money to the number shown for the chosen method, then submits their sender number + TrxID. The plan then shows "Waiting for confirmation" until Super Admin → Payments approves (activates the plan) or rejects it. The payment-method choice is a custom dropdown carrying the official bKash and Nagad logos. The bKash logo file (`public/assets/bkash-logo.png`) was supplied by the owner on 2026-11-21 (transparent background); the Nagad logo is `public/assets/nagad-logo.png`.
- **Do:** Use the custom logo dropdown for both the pay-with and proof steps, require sender number + TrxID, set the plan to "Waiting for confirmation" on submit, and activate only on admin approval.
- **Do NOT:** Do not use logos from third-party/gambling sites — official sources only. Do not add a payment gateway, card form or instant activation, and do not ship the preview's dummy numbers as real payment numbers.

## 46. Subscription expiry — automatic switch to Free

- **Comes from:** Instruction §15; Preview — admin script rule `applyPlanExpiry()` (a paid plan whose period has ended and is not renewed switches to Free automatically, keeping access until the paid month ends, and the expired-from plan is remembered).
- **What it does:** When a paid subscription expires unrenewed, the plan automatically switches to Free everywhere the plan is shown; the user keeps paid access until the paid period ends.
- **Do:** Apply the switch automatically at period end with no manual step, and reflect Free in the Subscription page, sidebar badge and admin user lists.
- **Do NOT:** Do not cut paid access before the paid period ends, and do not leave an expired user shown as paid.

## 47. Subscription reminder — tray + modal

- **Comes from:** Preview — payment reminder overlay `#ov-pay-remind` (plan/due line, "Overdue" badge, buttons "Not now" / "I've already paid" / "Go to Subscription →") and the Payments section pinned in `#notif-tray`; Super Admin Payments "Send reminder" / "Remind" actions; Instruction §15.
- **What it does:** Super Admin can send payment reminders. The user sees the reminder in the notification tray and as a popup modal on desktop and mobile, with "Go to Subscription" / "I've already paid" / "Not now".
- **Do:** Deliver reminders both ways (tray + modal), keep the three actions working ("Go to Subscription" opens the Subscription page), and count an unread reminder in the bell badge as the preview does.
- **Do NOT:** Never show the reminder to paid users, and do not add extra buttons or text to the reminder modal.

## 48. Support — user tickets

- **Comes from:** Preview — support view `.supportview` built by the preview script (Create a ticket form with issue-type chips from `SUP_CATS`: Calls & audio, Account & login, Subscription & payment, AI daily report, Safety / report a user, App bug, Other; subject and body fields; My tickets list `.ticket` with status badges Open / In progress / Answered / Resolved and `.sup-reply` "Support reply" blocks) and the sidebar Support item with open-count badge; Instruction §16.
- **What it does:** The user creates a ticket — writes what they are facing and chooses the issue kind — and the ticket goes to Super Admin. When Super Admin adds a short note/message to the ticket, the user sees it as a reply on their ticket.
- **Do:** Keep the preview's issue kinds, keep the user's own tickets listed with their statuses, and show admin replies on the ticket they belong to.
- **Do NOT:** Do not show other users' tickets, and do not add ticket fields beyond the preview's kind/subject/body.

## 49. Super Admin — separate login

- **Comes from:** Preview — Super admin login page `#page-admin-login` (`.auth-card`: "Super admin / Owner access only", Admin email, Admin password, "Enter control panel →", "← Back to app"); Instruction §19.
- **What it does:** The Super Admin panel is a complete, separate panel with its own login, separate from the user login, owner only.
- **Do:** Keep the admin login separate from the user Login page and gate the whole panel behind it.
- **Do NOT:** Do not reuse the user login for admin access, and do not expose admin routes to regular users.

## 50. Super Admin — sidebar and Overview

- **Comes from:** Preview — Super Admin page `#page-admin` (sidebar with owner header, nav items Overview, Users & activity, Activity log, Reports, Support tickets, Packages, Payments, AI & API settings, Platform controls, "← Back to app", "Log out of admin") and Overview section `#adm-sec-overview` (stat cards: registered users, talk minutes today, calls today, average call length, people online; weekly Chart.js graph `#adm-chart`; Top talkers today; Devices people use; Where people practise from; Payments summary strip); Instruction §19.
- **What it does:** Overview summarises the whole platform in metrics: user count, minutes, calls, average talk time, online count, the week's minutes graph, top talkers with city/device/minutes/calls, device breakdown and country/city location breakdown, plus a payments snapshot linking to Payments.
- **Do:** Keep the sidebar order and items as in the preview, keep "Back to app" and admin "Log out", and drive every Overview figure from real platform metrics.
- **Do NOT:** Do not put the text "everything is here, owner only" at the bottom of the Super Admin sidebar (removed), and do not show any conversation content on Overview.

## 51. Super Admin — Users & activity

- **Comes from:** Preview — section `#adm-sec-users` (search `#adm-user-search`, filter chips All / Online now / Paid plans / Free / AI reports on, user list `#adm-users-list`, pagination `#adm-users-pgn`, detail panel `#adm-user-detail` with plan/city/device/IP/minutes/calls and "Change plan" / "Suspend user"–"Reinstate user" actions, platform activity feed `#adm-activity-feed`); Instruction §19.
- **What it does:** Lists all users with plan, city, device, IP, minutes and calls; supports search/filter; opens a per-user detail with plan change and suspend/reinstate. Avatars are small and round (40 px in rows, 52 px in detail).
- **Do:** Keep search and filters resetting pagination to page 1, keep avatars at the preview's small round sizes, and make plan change and suspend take effect on the user's account.
- **Do NOT:** Do not show exact location (country/city level only), do not show chat/call content, and do not use large avatars in these lists.

## 52. Super Admin — Packages and Create Package page

- **Comes from:** Preview — Packages section `#adm-sec-packages` (header with `#adm-create-pkg-btn` "Create package" at the TOP, package list `#adm-pkg-list`) and the separate Create Package section `#adm-sec-create-package` (`#adm-pkg-form`: Package name, Badge text, Price (৳), Billing, Best for, Daily call limit, Short description, Included, Not included, "Visible to users" switch, "AI daily reports in this package" switch, "Create package →" / edit mode with "Cancel editing"); Instruction §19.
- **What it does:** Super Admin creates and edits multiple packages and controls what is Included / Not included, the daily call limit, visibility and AI-report inclusion. Changes show immediately on the users' Subscription page (both render from the same package data). The Create Package button sits at the top of the Packages page and opens a separate create-package page; editing reuses that page in edit mode.
- **Do:** Keep Create Package at the top, use the separate create/edit page, and sync saved changes to the user Subscription page immediately.
- **Do NOT:** Do not put the create form inline on the Packages list page, do not add package fields beyond the preview's, and do not price packages in anything but taka.

## 53. Super Admin — Payments

- **Comes from:** Preview — Payments section `#adm-sec-payments` ("Payment requests — waiting for confirmation" `#pay-req-list` with Approve / Reject, collection stat cards, "Who paid — recent payments" `#pay-paid-list`, "Who is going to pay — upcoming & overdue" `#pay-due-list` with "Remind" buttons, How people paid / By plan breakdowns, pagination); Instruction §19.
- **What it does:** Shows who has paid, who is going to pay / is due, totals, recent payments, and the waiting-confirmation requests from the manual payment flow. Approve activates the user's plan; Reject refuses the request. "Remind" / "Send reminder" sends the subscription reminder to a due user.
- **Do:** Keep Approve/Reject on every waiting request, activate the plan on approval only, and keep the paid/due lists and totals driven by real payment records.
- **Do NOT:** Do not auto-approve manual payments, and do not delete payment history. What the user is told on rejection beyond the preview's behaviour is not specified in the preview/instruction — do not add without the owner's word.

## 54. Super Admin — Reports

- **Comes from:** Preview — Reports section `#adm-sec-reports` (stat cards: new reports waiting, different users reported, blocked from the platform, reviewed today; filter chips All / New / Reviewed / Handled · note added / Platform-blocked; report rows `.rep-row` with 40 px round avatars, detail block, note field and platform-block action; pagination `#adm-reports-pgn`); Instruction §16 and §19.
- **What it does:** Super Admin reviews user reports, can add a short note/message to a report, and can block the reported user from the whole platform.
- **Do:** Keep the filters, newest-first order, note-adding and platform-block actions working, with small round avatars.
- **Do NOT:** Do not expose reports to regular users, and do not treat a report as an automatic block — blocking is the admin's decision.

## 55. Super Admin — Support tickets

- **Comes from:** Preview — Support tickets section `#adm-sec-tickets` (stat cards: open/in progress, total received, with your short note, resolved; ticket list `#adm-tickets-list`, pagination `#adm-tickets-pgn`); Instruction §16 and §19.
- **What it does:** Super Admin receives and reviews user tickets and can add a short note/message to any ticket (for example "Taken care of"); on a ticket, the user sees that note as a reply.
- **Do:** Keep tickets newest-first with working pagination, and show the admin note to the ticket's owner as a reply.
- **Do NOT:** Do not show a ticket's content to any other user, and do not add admin-only internal fields to what the user sees.

## 56. Super Admin — AI & API settings (DeepSeek)

- **Comes from:** Preview — AI & API settings section `#adm-sec-ai` (API connection form: provider, API base URL, masked API key with Show toggle, speech-to-text model, report analysis model, report language, temperature; "Save API settings" / "Test connection"; credit balance panel "$25.00" with used-this-month bar and "Buy more credit"; reports-this-month figures; soft-limit form; daily-report rules panel); Instruction §17 and §19.
- **What it does:** Holds the AI provider configuration and credit state: the provider is DeepSeek (the owner has an account with $25 credit), with base URL, masked API key, speech-to-text and analysis models, the $25 balance with the ~25–50 premium-users/month estimate from the instruction, and the daily-report rules.
- **Do:** Configure DeepSeek as the provider per the instruction, keep the API key masked with a Show toggle, and keep balance/usage figures visible to the owner.
- **Do NOT:** Do not display the raw API key unmasked by default. Note: the preview's provider dropdown and model fields still show other providers/models (OpenAI, Gemini, Azure, whisper-1, gpt-4o-mini) — the instruction names DeepSeek as the provider, so do not build the settings around another provider without the owner's word.

## 57. Super Admin — Platform controls

- **Comes from:** Preview — Platform controls section `#adm-sec-controls` (feature switches: New registrations, Start Calling — random matching, Create rooms, Partner ratings, Blocking & safety tools, English nudge, Video calls, Maintenance mode; Limits form `#adm-limits-form`: Free plan call minutes per day = 15, Longest single call, Most people in one room; Announcement banner form `#adm-ann-form`); Instruction §19.
- **What it does:** Lets the owner switch platform features on/off, set the Free plan's daily call minutes (15), the longest single call and the room size cap, and publish an announcement banner.
- **Do:** Make every switch and limit take real effect across the app (for example the Free daily limit drives the 15-minute Free rule), and keep Maintenance mode available.
- **Do NOT:** Do not add control switches for features that do not exist in the app, and do not let a limit contradict the Subscription page's stated plan terms.

## 58. Super Admin — Activity log

- **Comes from:** Preview — Activity log section `#adm-sec-activity` (stat cards: daily reports generated today, AI minutes used today, subscription changes today, users who hit the AI soft limit; search `#log-search`, filter chips All / Daily reports / Subscriptions / AI limits / Opt-ins, log rows `#log-list`, "AI minutes today — against the soft limit" usage panel, "Subscriptions — today" panel, pagination `#log-pgn`); Instruction §19.
- **What it does:** Records how daily reports and subscriptions are used — report generations, opt-ins/opt-outs, soft-limit events, upgrades, renewals and downgrades — with per-user AI-minutes usage against the soft limit. It contains no private call or chat content.
- **Do:** Log report, subscription, limit and opt-in events with the preview's fields, keep search/filter/pagination working, and keep usage bars accurate per user per day.
- **Do NOT:** Do not log conversation content, transcripts or message text in the activity log.

## 59. Super Admin — metrics-only privacy

- **Comes from:** Instruction §19 and §20; Preview — admin sections show only counts, minutes, device, city/country and IP fields.
- **What it does:** Super Admin sees metrics only: how many minutes people talk, average talk time, how many users, users' device information, users' location at country/city level only, and users' IP addresses. Chats and calls stay end-to-end encrypted and unread by admin.
- **Do:** Limit every admin view to those metric fields.
- **Do NOT:** Never surface chat messages, call audio, transcripts or exact location in any admin view, and do not add an admin "view conversation" capability.

## 60. Super Admin — pagination and avatars

- **Comes from:** Preview — shared pagination renderer (`.pgn` controls) used by Users, Activity feed, Activity log, Reports, Support tickets and Payments lists, with the CSS rule that controls sit on the RIGHT; small round avatars in admin rows (`.rep-row .avatar` 40 px); Instruction §19.
- **What it does:** Every long admin list/table is paged with a real page count computed from the real rows; controls sit at the bottom-right; search/filter resets to page 1. Admin avatars are small and round — 40 px in rows, 52 px in detail (also on Reports and Support).
- **Do:** Paginate every long admin list with real counts, keep controls bottom-right, and reset to page 1 on search/filter.
- **Do NOT:** Do not fake page counts, do not centre or left-align pagination, and do not enlarge admin list avatars.

## 61. AI reports — consent, content and delivery

- **Owner decision (2026-11-21, supersedes the preview's separate AI plan):** AI reports are included in the paid packages by frequency — **Pro = daily report, Plus = weekly report**, Free = none. Packages carry this in `ai_report_frequency` (`none`/`weekly`/`daily`); Super Admin's package editor sets it with a None / Weekly / Daily choice. The DeepSeek API key is entered by the owner himself in Super Admin → AI & API settings — never seeded or stored elsewhere.

- **Comes from:** Instruction §17; Preview — landing AI section `#lp-ai` ("The rules — always your choice": opt-in only, asked once on the first premium call; off anytime in Profile → Settings → Preferences; your voice only; fair limit 30 AI minutes/day), Subscription AI plan block `.sub-ai`, and Super Admin AI settings / activity log opt-in events.
- **What it does:** For premium users, each call is analysed — fluency, English proficiency, grammar, lexical resources, and what to improve — and delivered as one daily report. Premium = AI reports + unlimited use; premium revenue funds more DeepSeek credit. Consent: when a premium user taps Start Calling for their first call, a form/toggle asks whether they want daily reports; if ON it stays on for all their calls, and they can turn it off any time in Profile Settings → Preferences. Only the user's own voice is analysed.
- **Do:** Ask once, on the first premium Start Calling call; keep the choice until the user changes it in Preferences; analyse only the consenting user's own voice; deliver exactly one report per day covering the five named areas.
- **Do NOT:** Do not analyse the partner's voice, do not generate reports without consent, and do not put an AI block on the Dashboard. The exact design of the first-call consent form/toggle is not specified in the preview/instruction — do not add without the owner's word.

## 62. AI — soft daily AI-minutes limit

- **Comes from:** Preview — Super Admin AI settings soft-limit form (`#adm-ai-limit-form`: "AI minutes per user, per day" = 30, warn-at options, on-limit behaviour options) and activity-log usage rows ("30 / 30 min — Limit reached, AI paused until tomorrow"; "25 / 30 min — Near the limit, gentle note shown"); Instruction §19.
- **What it does:** A soft daily AI-minutes limit per user (30 minutes in the preview) stretches the DeepSeek credit fairly. Near the limit the user gets a gentle in-app note and nothing stops; at the limit, AI analysis pauses until tomorrow while calls keep working as normal.
- **Do:** Count only analysed (own-voice) minutes per user per day, warn at the admin-set threshold, and pause only the AI analysis at the limit.
- **Do NOT:** Never cut, block or shorten a call because of the AI limit, and do not make the limit a hard account restriction.

## 63. Safety suggestion — topics

- **Comes from:** Instruction §20; Preview — landing Safety section `#lp-safety`.
- **What it does:** The platform gently suggests users do not talk about politics, religion, gender or anything explicit, but there is no hard ban — users can talk about what they are comfortable with (freedom of speech).
- **Do:** Keep any such suggestion gentle, as the preview/instruction present it.
- **Do NOT:** Do not hard-ban topics, block calls or chats over topics, or add moderation rules beyond this. The exact placement/wording of the suggestion beyond the landing safety section is not specified in the preview/instruction — do not add without the owner's word.

## 64. Global rule — no English level anywhere

- **Comes from:** Instruction §18; Preview — the removal applies across People, room cards, chat headers, the profile drawer, My Profile, Register/Settings/Create-room forms, Start Calling options, call screens, Super Admin and the landing page.
- **What it does:** English level does not exist in the app in any form, because there is no matrix measuring reading, writing, listening and speaking to give a level fairly.
- **Do:** Build every surface without level data, and do not store a level for matching, display or admin.
- **Do NOT:** Do not show A2 / B1 / B2 / C1 / C2, Beginner / Intermediate / Advanced / Native labels, level badges, level progress, level fields or level filters anywhere — including any stray level word still visible in a preview dummy string.

## 65. Global rule — no instructional text

- **Comes from:** Instruction §2 (Golden Rule 3) and §18.
- **What it does:** No instructional / helper / dummy text appears anywhere — not in the user app, not in Super Admin, not in forms, placeholders, modals or empty states. Only headings, field labels, buttons, menu items, names, data, numbers, prices, Included / Not included lists, status badges, short functional messages (validation errors, success confirmations), and the one approved encryption line inside the call window are allowed.
- **Do:** Limit every surface to the allowed text kinds above, and keep functional messages short.
- **Do NOT:** Do not add helper paragraphs, hints, explanations, placeholder essays or "how to" copy anywhere, and do not add any extra or invented fields, features, blocks, badges or defaults that are not in the preview or the instruction — anything added must be flagged to the owner separately.

## 66. Global design rules — scrollbars, centred icons, dead controls, light theme, taka font

- **Comes from:** Instruction §2 and §3; Preview — global CSS (scrollbars hidden on all elements, `.taka` class using "Noto Sans Bengali", round-button icon centring rules for `.mini-btn`, `.cv-send`, `.pd-actions`, `.m-room-iconbtn` and call controls).
- **What it does:** The app is light theme only, Awwwards-inspired, with a real-app look and minimal text. No scrollbar is visible anywhere, though scrolling still works. Every icon inside a fully rounded button is perfectly centred on both axes. Every button, icon, tab, dropdown and link shown works. Prices are always in taka, and the ৳ sign renders in a font that contains it (Noto Sans Bengali; Hind Siliguri also works).
- **Do:** Hide scrollbars globally (thinnest possible only if one is unavoidable), centre every round-button icon, test every control, keep the single light theme, use one consistent line-icon set, and wrap every ৳ in the taka font.
- **Do NOT:** Do not add a dark theme, do not let Manrope render the ৳ sign (it has no Bengali glyph and renders broken), do not price anything in dollars, and do not ship any dead control or off-centre round-button icon.
