# Travnr - Personal Travel Concierge Platform

## Overview
Travnr is a full-stack web application designed as a personal travel concierge service. It allows users to create accounts, manage traveler profiles, request concierge calls, receive and approve travel itinerary proposals with detailed pricing, view a travel calendar, manage notifications, and handle billing and payments. The platform aims to automate and streamline travel planning and management through AI-driven interactions and direct booking capabilities.

## User Preferences
I prefer simple language in explanations.
I prefer detailed explanations when new concepts or complex solutions are introduced.
I want an iterative development approach, with frequent small updates rather than large, infrequent ones.
Please ask before making any major architectural changes or introducing new external dependencies.
Do not make changes to the `server/lib/stripeClient.ts` file.
Do not make changes to the `shared/schema.ts` file.
I prefer clear and well-structured code with comments for complex logic.
I want the agent to prioritize security best practices in all implementations.

## System Architecture
Travnr utilizes a modern full-stack architecture. The frontend is built with React 18, TypeScript, Vite, Tailwind CSS, and shadcn/ui, focusing on a responsive and intuitive user interface with dark/light mode support. The backend uses Express.js with TypeScript and PostgreSQL for data persistence via Drizzle ORM. The project structure is organized into `client/`, `server/`, and `shared/` directories.

Key architectural decisions and features include:

-   **Authentication:** Custom email/password system with `bcrypt` for hashing and `express-session` for session management.
-   **Traveler Profiles:** Comprehensive management of user travel information.
-   **Concierge Call Requests:** Integration with Bland AI for voice-driven concierge interactions, including dynamic data lookup, call transcripts, and structured trip detail extraction for itinerary generation.
-   **Itinerary Proposals:** Automated generation of detailed flight proposals using Duffel API, supporting a "Guest Proposal Flow" for non-account holders.
-   **Guest Booking Flow:** Streamlined process for guests to book and pay for flights via email links, integrating Stripe for payments.
-   **Flight Management:** Real-time flight search, booking, and order management through Duffel API.
-   **Payment Processing:** Secure payment collection via Stripe for flight purchases, supporting Apple Pay and Google Pay.
-   **Admin Features:** Administrative dashboard for user management, payment history, and manual booking fallback.
-   **Notification System:** Robust user notification system with read/unread states.
-   **Travel Calendar:** Monthly calendar view for managing trip dates.
-   **SMS:** Configurable SMS functionality for transactional messages using Twilio.
-   **Hotel Search & Booking (Admin-only):** Phased implementation of hotel search and booking capabilities behind feature flags, including abstraction layers, mock providers, ranking algorithms, and booking guardrails. This includes an approval token system and multiple independent checks before booking.
-   **Rate Limiting:** Implemented using `express-rate-limit` for authentication, callback requests, guest bookings, and general API access.
-   **Security Headers:** Utilizes `helmet` for robust HTTP security headers, including Content Security Policy (CSP) allowing only whitelisted third-party origins.
-   **Legal Pages:** Dedicated public pages for privacy policy and terms of service. Both carry a "Version 1.0 · Last updated" line with a stable anchor (`#policy-v1`, `#terms-v1`) for future versioning. The registered legal entity is left as a clearly labeled `[LEGAL ENTITY NAME]` placeholder on first mention in each document — swap in the real entity name in one place when finalized; jurisdiction is set to Missouri, USA in Terms §19. Contact address (`hello@travnr.com`) is consistent across both pages and the transactional email footer.
-   **PII Redaction in Logs:** The request logger never prints response bodies by default — only the response size. A `redact()` helper in `server/lib/redact.ts` masks known sensitive fields (`email`, `phone`, `name`, `dateOfBirth`, `passportNumber`, `address`, tokens, secrets, transcripts, summaries) wherever request/response/webhook payloads are still logged for debugging. Bland AI webhook payloads and dynamic-data bodies are routed through `redactJSON()`; ad-hoc emails/phones in log lines use `maskEmail()` / `maskPhone()`. Set `LOG_RESPONSE_BODIES=1` in development to enable a redacted preview of `/api` response bodies for debugging.
-   **SEO & Social Share:** Marketing surface positions Travnr as an AI travel concierge / AI travel planner. The homepage `<title>`, meta description, OG/Twitter tags, and four JSON-LD blocks (`Organization`, `WebSite`, `SoftwareApplication`, `FAQPage`) live statically in `client/index.html` so crawlers see them in the initial HTML — the landing page intentionally does **not** mount the `<SEO>` Helmet wrapper to avoid duplicate canonical/OG tags. Non-home public routes (`/privacy`, `/terms`, `/auth`, 404) set their own per-route title/description/canonical via `client/src/components/seo.tsx` (a thin `react-helmet-async` wrapper). The visible homepage FAQ (`section[data-testid="section-faq"]` in `client/src/pages/landing.tsx`) and the `FAQPage` JSON-LD share the same 8 Q&A pairs and must be edited together. `robots.txt` disallows all auth/admin/guest-token routes; `sitemap.xml` lists only `/`, `/privacy`, `/terms`. Off-site backlink ideas live in `SEO_BACKLINK_PLAN.md` at the repo root and require external outreach (cannot be automated). No fake reviews, ratings, offers, or `aggregateRating` are emitted anywhere.
-   **Error Monitoring & Product Analytics:** Sentry (browser + Node) reports unhandled exceptions, React error-boundary catches (via `client/src/lib/report-error.ts`), and 5xx responses with route/method/status context — never request bodies, headers, or PII. PostHog (browser only) captures sanitized page views on every wouter route change plus a strict allowlist of business events: `call_requested`, `proposal_viewed`, `guest_booking_started`, `guest_booking_completed`, `signup_completed`, `login`. Both SDKs only initialize when `NODE_ENV=production`, the relevant env var is set, and the browser is not sending Do Not Track. Users are identified by opaque user id only — emails, names, phone numbers, payment data, and free-text booking input are never sent. Token-bearing path segments (e.g. `/book/:optionToken`, `/proposal/:token`) are replaced with `:token` / `:id` placeholders before any URL leaves the browser. Configure with: client `VITE_SENTRY_DSN`, `VITE_SENTRY_RELEASE`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` (default `https://us.i.posthog.com`); server `SENTRY_DSN`, `SENTRY_RELEASE`. CSP allowlists for `*.ingest.sentry.io` and `*.i.posthog.com` are wired in `server/index.ts`.
-   **AI Call Summaries:** After a Bland call completes, a Claude Sonnet 4.5 helper (`server/lib/callSummary.ts`) generates a one-line triage summary plus a small structured object and caches it on `bland_calls.variables.aiSummary` (jsonb). Generation is fire-and-forget post-webhook, gracefully degrades when `ANTHROPIC_API_KEY` is unset, and is rendered in the admin "Recent Calls" table with a confidence badge and a regenerate action (`POST /api/admin/calls/:id/resummarize`). Backfill script at `scripts/backfill-call-summaries.ts`.

## External Dependencies

-   **SendGrid:** Email delivery service.
-   **Duffel API:** Flight search, booking, and order management.
-   **Bland AI:** Voice AI for concierge calls.
-   **Stripe:** Payment gateway.
-   **PostgreSQL:** Relational database.
-   **Twilio:** SMS messaging service.
-   **Vite:** Frontend build tool.
-   **Tailwind CSS:** Utility-first CSS framework.
-   **shadcn/ui:** UI component library.
-   **TanStack React Query:** Frontend data fetching and caching.
-   **bcrypt:** Password hashing.
-   **express-session & connect-pg-simple:** Server-side session management.
-   **wouter:** Client-side router.
-   **Sentry:** Error monitoring for browser and Node server.
-   **PostHog:** Product analytics (page views and key events).