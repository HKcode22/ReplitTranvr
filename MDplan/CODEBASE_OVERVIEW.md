# Travnr Codebase — Complete Overview

> Created to help you understand what's in every folder, how everything connects, and what's important.

---

## 1. WHAT IS TRAVNR?

Travnr is a **full-stack web application** — a "Personal Travel Concierge" platform. It's NOT just a predictive model. It's a complete business:

- **End users** sign up, get AI phone calls (Bland AI) to discuss trips, receive flight proposals, book flights (Duffel API), and pay (Stripe).
- **Agencies** can monitor their clients' flights for disruptions and get alerts.
- **Admins** manage users, payments, and the system.

The **disruption prediction** (what you asked about) is just ONE feature — the `/server/lib/disruption/` folder.

---

## 2. THE TECH STACK

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui |
| **Backend** | Node.js + Express.js + TypeScript |
| **Database** | PostgreSQL 16 (relational, NOT Firebase) |
| **ORM** | Drizzle ORM (type-safe SQL for TypeScript) |
| **Session Store** | express-session + connect-pg-simple (sessions in PostgreSQL) |
| **Client Routing** | wouter (lightweight React router) |
| **Data Fetching** | TanStack React Query v5 |
| **Styling** | Tailwind CSS 3/4 + CSS variables for dark/light mode |

### External APIs (the "external dependencies")

| Service | What it does | Why it matters |
|---------|-------------|----------------|
| **Duffel API** | Flight search, pricing, booking, and card tokenization | The core flight booking engine. Duffel aggregates airline inventory. The frontend uses `@duffel/components` for PCI-compliant credit card forms. |
| **Bland AI** | AI-powered voice phone calls | When a user requests a concierge call, Bland AI places an automated phone call to the user. The AI agent talks like a travel concierge, looks up user data dynamically mid-call, and extracts trip details. After the call, it auto-generates a flight proposal. |
| **Stripe** | Payment processing | Handles payments for flight bookings. Supports Apple Pay, Google Pay, saved cards. |
| **SendGrid** | Transactional emails | Email verification, password reset, booking confirmations, disruption alerts. |
| **Twilio** | SMS messages | Disruption alerts sent via text message. |
| **AeroDataBox** | Live flight status + historical data | Provides real-time flight tracking, delay info, cancellation status, and on-time performance history for the disruption monitoring engine. |
| **SerpApi (Google Flights)** | Alternative flight search | Used to find alternative flights when a monitored flight is disrupted. Also used as a secondary flight search source for low-cost carriers. |
| **Anthropic (Claude API)** | AI call summaries | After a Bland AI call completes, Claude Sonnet 4.5 generates a summary of the call. |
| **Sentry** | Error monitoring | Tracks crashes and errors in both frontend and backend. |
| **PostHog** | Product analytics | Tracks page views and key business events (signups, bookings, etc.). |

---

## 3. WHERE IS FIREBASE? (You mentioned confusion about Firebase)

**There is NO Firebase anywhere in this codebase.** Zero. Nothing.

The confusion likely came from:
1. The `.local/` folder has Replit's internal state databases (SQLite files like `scribble.db`, `log-query.db`) — these are Replit's own tools, not your app's database.
2. The `.claude/` folder has Claude Code's session history, also stored locally.
3. The PostgreSQL connection string (`DATABASE_URL`) is provisioned automatically by Replit — you see `psql` and `pg` in the code so you may have assumed it was Firebase, but PostgreSQL is a completely different thing (relational SQL database, not Google Firebase).

**Your actual database is PostgreSQL 16**, managed through Drizzle ORM. Migrations are in `/migrations/`. Schema is in `/shared/schema.ts`.

---

## 4. WHY REPLIT? (And what's with all the `.` folders?)

This project was **built on Replit** (the cloud IDE). Replit auto-generates:

| Folder/File | Purpose | Important? |
|-------------|---------|------------|
| `.replit` | Replit config (modules, ports, deployment) | ✅ Yes — defines how Replit runs the app |
| `replit.nix` | Nix package manager config for Replit env | ❌ Not for you |
| `.claude/` | Claude Code's session history, cache, backups, tasks | ❌ Claude Code was the AI coding assistant used to build this. All session logs, settings, and backups. Ignore this. |
| `.local/` | Replit's local tools (skills, workflows, state DBs, tasks) | ❌ 80+ skill templates, workflow logs, internal state. Ignore this. |
| `.agents/` | Metadata about agent-generated assets (OG image) | ❌ Ignore |
| `.config/` | VSCode server + npm global config (both empty) | ❌ Ignore |
| `.npmrc` | npm config | ❌ Not important |
| `replit.md` (root) | Instructions for Claude Code about project architecture | ✅ **Very important** — read this first |
| `Travnr-Environment-Setup/replit.md` | A copy/mirror of the same replit.md with more detail | ✅ Important — same info, more detail |

**The `.local/skills/` folder** has 80+ skill templates (like "travel-assistant", "design-thinking", "video-editing"). These are Replit's built-in Claude Code skill library — they are NOT part of your app. They let Claude Code do specialized tasks (e.g., "design this UI", "analyze this data"). Ignore them.

**The `.local/tasks/` folder** has 117 markdown files — these are task logs of what Claude Code did during development. You can ignore these too.

---

## 5. PROJECT STRUCTURE — THE IMPORTANT PARTS

```
Travnr-Environment-Setupzip/
├── client/                          ← THE FRONTEND (React app)
│   ├── index.html                   ← SPA entry + SEO meta tags
│   └── src/
│       ├── App.tsx                  ← Routes, providers, layout
│       ├── main.tsx                 ← React mount point
│       ├── index.css                ← Tailwind + CSS variables
│       ├── assets/images/           ← Destination images (Bali, Paris, etc.)
│       ├── components/
│       │   ├── ui/                  ← 47 shadcn/ui components (buttons, dialogs, etc.)
│       │   ├── app-sidebar.tsx      ← Main navigation sidebar
│       │   ├── seo.tsx              ← Per-page SEO meta tags
│       │   ├── flight-search-modal.tsx ← Flight search popup
│       │   ├── status-badge.tsx     ← Colored status badges
│       │   └── ... (13 total)
│       ├── hooks/
│       │   ├── use-mobile.tsx       ← Mobile detection
│       │   └── use-toast.ts         ← Toast notifications
│       ├── lib/
│       │   ├── auth.tsx             ← Auth context (login/logout/register)
│       │   ├── theme.tsx            ← Dark/light mode
│       │   ├── queryClient.ts       ← API fetch helper + React Query setup
│       │   ├── airports.ts          ← Airport database
│       │   ├── analytics.ts         ← PostHog setup
│       │   ├── sentry.ts            ← Sentry error tracking
│       │   └── utils.ts             ← cn() utility for class merging
│       └── pages/                   ← 35 pages total
│           ├── landing.tsx          ← Public homepage with typing animation, callback form
│           ├── auth.tsx             ← Login/Register/Forgot Password
│           ├── dashboard.tsx        ← User dashboard with stats
│           ├── flight-search.tsx    ← Duffel flight search UI
│           ├── request-call.tsx     ← Request an AI concierge call
│           ├── proposals.tsx        ← View itinerary proposals
│           ├── billing.tsx          ← Payment history + saved cards
│           ├── admin-dashboard.tsx  ← Admin panel
│           ├── guest-booking.tsx    ← Guest checkout flow (no account)
│           ├── disruption/          ← Disruption alert pages
│           │   ├── selection.tsx    ← Choose alternative flight
│           │   └── confirmed.tsx    ← Confirmation after choice
│           └── ... (more)
│
├── server/                          ← THE BACKEND (Express API)
│   ├── index.ts                     ← Server bootstrap (helmet, middleware, startup)
│   ├── routes.ts                    ← ALL API routes (~1278 lines, single file)
│   ├── storage.ts                   ← Database access layer (874 lines)
│   ├── db.ts                        ← PostgreSQL pool + Drizzle connection
│   ├── static.ts                    ← Production static file serving
│   ├── vite.ts                      ← Vite dev middleware + HMR
│   └── lib/
│       ├── bland.ts                 ← Bland AI API wrapper (dispatch calls, get details)
│       ├── callSummary.ts           ← Claude-powered call summarization
│       ├── stripeClient.ts          ← Stripe payment setup (DO NOT MODIFY per instructions)
│       ├── emailTemplates.ts        ← SendGrid email HTML templates
│       ├── sms.ts / smsTemplates.ts ← Twilio SMS sending
│       ├── phone.ts                 ← Phone number formatting/validation
│       ├── redact.ts                ← PII redaction for logs
│       ├── rateLimit.ts             ← Rate limiter configs
│       ├── sentry.ts                ← Server-side Sentry setup
│       ├── isoCountries.ts          ← Country data
│       ├── airportMap.ts            ← Airport code mappings
│       ├── passengerForm.ts         ← Passenger form utilities
│       ├── proposalEmailPersonalizer.ts ← LLM-personalized proposal emails
│       ├── agencyAuth.ts            ← Agency authentication
│       ├── disruption/              ← ⭐ THE PREDICTION ENGINE (13 files)
│       │   ├── monitor.ts           ← Main monitoring loop (every 30 min)
│       │   ├── riskScorer.ts        ← ⭐ Core predictive model (weighted signals)
│       │   ├── flightStatus.ts      ← AeroDataBox flight status fetcher
│       │   ├── weatherSignal.ts     ← METAR weather data + risk contribution
│       │   ├── historicalOtp.ts     ← Historical on-time performance
│       │   ├── nasStatus.ts         ← FAA ground stops/delays (NAS status)
│       │   ├── carrierHealth.ts     ← Carrier-level reliability stats
│       │   ├── alternativeFinder.ts ← SerpApi-based alternative flight search
│       │   ├── alertSender.ts       ← Email/SMS alert dispatch
│       │   ├── aerodataboxLimiter.ts ← Rate limiter for AeroDataBox
│       │   └── testFlightSeeder.ts  ← Test data seeder
│       └── hotels/                  ← Hotel search (admin-only, Phase 2)
│           ├── providers/           ← 5 hotel API providers
│           ├── rank.ts              ← Hotel ranking algorithm
│           └── ...
│
├── shared/
│   └── schema.ts                    ← ⭐ THE DATABASE SCHEMA (738 lines)
│
├── migrations/                      ← SQL migration files
│   ├── 0000_*.sql                   ← Initial schema
│   ├── 0001_trip_requests.sql       ← Trip requests table
│   ├── 0002_agency_disruption_system.sql ← ⭐ Disruption monitoring tables
│   ├── 0003_travelers_health.sql    ← Health reports table
│   ├── 0004_confirmation_alert.sql  ← Confirmation alert tracking
│   ├── 0005_aircraft_data.sql       ← Aircraft data columns
│   ├── 0006_test_flight_seeder.sql  ← Test flight seeder tables
│   ├── 0007_user_monitored_flights.sql ← Consumer user flight monitoring
│   ├── 0008_resolved_flight_status.sql ← Resolution tracking
│   └── 0009_risk_timestamps.sql     ← Risk timestamp columns
│
├── scripts/                         ← Utility scripts
│   ├── backfill-call-summaries.ts   ← Regenerate Claude call summaries
│   ├── test-airport-map.ts          ← Airport mapping test
│   ├── test-pick-three-offers.ts    ← Offer selection algorithm test
│   └── test-voice-pool.ts           ← Voice pool test
│
├── script/
│   └── build.ts                     ← Build script
│
├── drizzle.config.ts                ← Drizzle Kit config
├── tsconfig.json                    ← TypeScript config
├── vite.config.ts                   ← Vite build config
├── tailwind.config.ts               ← Tailwind theme config
├── components.json                  ← shadcn/ui config
├── postcss.config.js                ← PostCSS config
├── package.json                     ← All dependencies & scripts
├── SEO_BACKLINK_PLAN.md             ← SEO outreach strategy
├── replit.md                        ← ⭐ Project documentation (read first!)
├── replit.nix                       ← Replit nix packages
├── attached_assets/                 ← Uploaded files/screenshots
├── screenshots/                     ← App screenshots
├── dist/                            ← Build output (gitignored)
└── zipFile.zip                      ← ZIP archive
```

---

## 6. THE DISRUPTION PREDICTION ENGINE — How It Works

This is the feature you asked about. It's NOT machine learning (no TensorFlow, no Python, no model training). It's a **hand-crafted heuristic scoring system** using real-time data sources.

### How the prediction works (`riskScorer.ts`):

Every 30 minutes, the monitoring engine scores each tracked flight using weighted signals:

| Signal | Data Source | Max Points | What It Measures |
|--------|-------------|------------|------------------|
| **Inbound Aircraft Delay** | AeroDataBox live status | 40 | Is the plane coming from a previous flight delayed? |
| **ATC Ground Stop** | FAA NAS Status API | 20 | Is the FAA stopping departures at origin/destination? |
| **ATC Ground Delay** | FAA NAS Status API | 15 | Is the FAA delaying departures at origin/destination? |
| **Origin Weather** | aviationweather.gov (METAR) | 20 | IFR/LIFR conditions, thunderstorms, freezing at origin |
| **Destination Weather** | aviationweather.gov (METAR) | 15 | Same but for destination |
| **Carrier Health** | Database (24h window) | 10 | How often has this airline had cancellations/delays recently? |
| **Historical OTP** | AeroDataBox (14 days) | 15 | How reliable is this specific flight number historically? |
| **Time of Day** | Heuristic | 4 | Later flights are riskier |
| **Day of Week** | Heuristic | 4 | Monday/Friday are riskiest |
| **Connection Risk** | Heuristic | 5 | Peak in late afternoon (connecting traffic) |

### Horizon-Based Weighting:

The model adjusts which signals matter based on how far the flight is:

- **< 4 hours**: Live operational signals dominate (inbound delay, ATC, weather)
- **4-24 hours**: Balanced weighting
- **> 24 hours**: Historical patterns dominate (OTP, day-of-week, time-of-day)

### Scoring Output:

- **Risk Score**: 0-100 (higher = riskier)
- **Risk Tier**: Green (< threshold) → Amber → Red (>= threshold)
- Thresholds tighten as departure approaches

### When a flight turns Red or Cancelled:

1. The engine searches for up to 3 alternative flights via SerpApi (Google Flights)
2. It risk-scores those alternatives too
3. It sends email + SMS alerts to travelers with CTAs to select an alternative
4. When a traveler selects an alternative, the agency gets notified

---

## 7. DRILLDOWN: KEY FILES EXPLAINED

### `/shared/schema.ts` (738 lines)
The single most important data file. Defines every database table, every relationship, every TypeScript type. Everything in the app derives from this. Tables:
- **Core user system**: `users`, `sessions`, `traveler_profiles`, `saved_cards`
- **Concierge flow**: `call_requests`, `bland_calls`, `callback_requests`
- **Proposals & booking**: `itinerary_proposals`, `proposal_items`, `payments`, `trip_requests`
- **Notifications**: `notifications`, `calendar_entries`
- **Guest flow**: `guest_proposals`, `phone_email_map`
- **Hotels**: `hotel_searches`, `hotel_options`, `hotel_bookings`
- **Disruption system**: `agency_accounts`, `monitored_flights`, `flight_travelers`, `health_reports`, `risk_score_history`, `disruption_alternatives`, `user_monitored_flights`
- **System**: `system_settings`, `promo_codes`

### `/server/routes.ts` (~1278 lines)
A single massive file containing ALL API endpoints. Areas:
- Auth (register, login, logout, verify email, forgot/reset password)
- Duffel flight search & booking
- Bland AI call management & webhooks
- Proposals (CRUD, generate, book)
- Payments & Stripe webhooks
- Guest proposal flow
- Hotel search (admin)
- Agency disruption management
- Promo codes
- Admin dashboard & stats
- Notifications
- Calendar
- Trip requests

### `/server/storage.ts` (874 lines)
The `DatabaseStorage` class — every database query is in here. It implements the `IStorage` interface.

### `/server/lib/bland.ts`
Wraps the Bland AI REST API. Key functions:
- `dispatchCall()` — initiates an AI voice call
- `getCallDetails()` — fetch transcript, recording, status
- `buildPrompt()` — constructs the AI agent's prompt/instructions

### `/server/lib/disruption/monitor.ts` (729 lines)
The `startMonitoringEngine()` function. Runs as a background loop in the server:
1. Every 30 minutes, queries all active monitored flights departing today/tomorrow
2. Scores each flight's risk
3. Stores results in `risk_score_history`
4. Triggers alerts when crossing thresholds
5. Runs a resolution cycle every 6 hours

### `/client/src/App.tsx`
The React app root. Defines all routes, wraps with AuthProvider, ThemeProvider, QueryClientProvider. Route structure:
- Public: `/`, `/auth`, `/privacy`, `/terms`, `/contact`, `/reset-password`
- Auth required: `/dashboard`, `/profile`, `/travelers`, `/trips`, `/call-history`, `/proposals`, `/proposal/:id`, `/flight-search`, `/request-call`, `/notifications`, `/billing`, `/security`, `/manage-trip`, `/monitor-flight`, `/calendar`
- Guest: `/booking/:token`, `/proposal/guest/:token`
- Admin: `/admin`
- Agency: `/agency/*`
- Disruption: `/disruption/:token`, `/disruption/confirmed`

---

## 8. DATA FLOW — Walk Through a Typical User Journey

### User Journey:
1. **User lands on** `/` (landing page with AI concierge animation)
2. **Signs up** at `/auth` → POST to server → bcrypt hashes password → stored in `users` table → SendGrid verification email
3. **Requests a call** at `/request-call` → POST creates `call_request` → server auto-dispatches Bland AI phone call
4. **Bland AI calls user** → AI conversation extracts trip details (destination, dates, preferences) → call transcript stored in `bland_calls` table
5. **Auto-proposal generation** → server searches Duffel API for matching flights → creates `itinerary_proposal` with top 3 offers → proposal items stored in `proposal_items` table
6. **User views proposals** at `/proposals` → approves one → proceeds to checkout
7. **Checkout** → DuffelCardForm tokenizes card (PCI-compliant) → POST to book endpoint → Duffel API creates order → `payments` table records transaction
8. **Trip is booked** → calendar entry created → notification sent → confirmation email via SendGrid

### Disruption Flow (Agency):
1. **Agency adds flights** to monitoring via API → stored in `monitored_flights`
2. **Background engine** (`monitor.ts`) runs every 30 min → scores flights
3. **Score crosses red threshold** → `alertSender.ts` sends email/SMS to travelers with alternative options
4. **Traveler clicks link** → `/disruption/:token` page → sees alternatives → selects one
5. **Selection reported** to agency → agency handles rebooking

---

## 9. DUFFEL API vs BLAND AI — What Are They?

### Duffel API (https://duffel.com)
A travel tech company that provides a single API to search and book flights across multiple airlines. Think of it as "Stripe for flights" — it aggregates airline inventory through one interface. Travnr uses it for:
- Airport/city search (autocomplete)
- Flight offer search (pricing, schedules, cabin classes)
- Offer details (baggage, fare conditions, seat selection)
- Card tokenization (`DuffelCardForm` — PCI-compliant credit card entry)
- Flight booking (creating orders, getting booking references)
- The app uses the **production** Duffel API token (`DUFFEL_API_TOKEN`)

### Bland AI (https://bland.ai)
An AI phone call platform. You give it a phone number and instructions, and it makes an automated AI-powered phone call. Travnr uses it to:
- Call users when they request a concierge call
- The AI speaks like a "travel concierge" — asks about trip preferences, destinations, dates
- Mid-call, it fetches user data dynamically (via a webhook endpoint) to personalize the conversation
- After the call, it sends a transcript and structured data back to Travnr
- Travnr then automatically generates a flight proposal based on the conversation

---

## 10. WHICH FILES ARE TRULY IMPORTANT? (Priority Order)

### 🔴 Critical (you must understand these):

| File | Why |
|------|-----|
| `shared/schema.ts` | The entire database schema. Everything depends on this. |
| `server/routes.ts` | All API endpoints. The backend's brain. |
| `server/storage.ts` | All database queries. |
| `server/lib/disruption/riskScorer.ts` | The "predictive model" you asked about. |
| `server/lib/disruption/monitor.ts` | The background engine running the predictions. |
| `server/index.ts` | Server entry point, bootstrap, middleware. |
| `client/src/App.tsx` | React routing and app structure. |
| `replit.md` (both copies) | Project documentation. Read first. |
| `package.json` | All dependencies and scripts. |
| `migrations/0002_agency_disruption_system.sql` | Disruption schema. |

### 🟡 Important (understand what they do):

| File | Why |
|------|-----|
| `server/lib/bland.ts` | Bland AI integration |
| `server/lib/callSummary.ts` | Claude-powered call summaries |
| `server/lib/stripeClient.ts` | Stripe payments (DO NOT MODIFY) |
| `server/db.ts` | Database connection |
| `client/src/lib/auth.tsx` | Auth context (login/register/logout) |
| `client/src/lib/queryClient.ts` | API fetch helper |
| `client/src/pages/landing.tsx` | Homepage |
| `migrations/` (all SQL files) | Schema evolution |

### 🟢 Nice-to-know (read when needed):

- Individual page components in `client/src/pages/`
- UI components in `client/src/components/ui/`
- Hotel providers in `server/lib/hotels/providers/`
- Test scripts in `scripts/`
- SEO file (`SEO_BACKLINK_PLAN.md`)

### ⚫ Ignore (Replit/Claude Code internal):

- `.claude/` — Claude Code session history
- `.local/` — Replit internal tools and tasks
- `.agents/` — Metadata
- `.config/` — Empty config directories
- `attached_assets/` — Uploaded files
- `screenshots/` — Screenshots
- `dist/` — Build output

---

## 11. RUNNING THE APP

From `package.json` scripts:

```bash
npm run dev       # Start dev server (port 5000) with Vite HMR
npm run build     # Build for production (TypeScript + Vite)
npm run start     # Run production build
npm run check     # TypeScript type checking (tsc --noEmit)
npm run db:push   # Push Drizzle schema changes to database
```

The `.replit` file shows the production deployment runs:
```bash
npm run build   # → outputs to dist/index.mjs
node dist/index.mjs
```

---

## 12. COLD HARD TRUTH ABOUT THE PREDICTION MODEL

**It is NOT machine learning.** It's a weighted heuristic scoring system. There are:
- ❌ No trained ML models
- ❌ No TensorFlow, PyTorch, or sklearn
- ❌ No Python
- ❌ No historical model training
- ❌ No feature engineering pipeline

**What it IS:**
- ✅ Hand-crafted rules with weighted signals
- ✅ Real-time data from AeroDataBox, FAA, NOAA
- ✅ Horizon-aware weighting (different factors matter at different times)
- ✅ Background monitoring loop
- ✅ Automatic alerting with alternative flight suggestions
- ✅ Test flight seeder for demo/testing

The "prediction" comes from combining multiple real-time signals into a single risk score. It's predictive in the sense that it forecasts disruption before it happens, but it's rule-based, not learned.
