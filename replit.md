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
Travnr utilizes a modern full-stack architecture. The frontend is built with **React 18, TypeScript, Vite, Tailwind CSS, and shadcn/ui**, focusing on a responsive and intuitive user interface with dark/light mode support. The backend uses **Express.js with TypeScript** and **PostgreSQL** for data persistence via **Drizzle ORM**.

Key architectural decisions and features include:

-   **Authentication:** Custom email/password system with `bcrypt` for hashing, `express-session` for session management, and SendGrid for email verification and password recovery.
-   **Traveler Profiles:** Comprehensive management of user travel information, including passport details.
-   **Concierge Call Requests:** Integration with **Bland AI** for voice-driven concierge interactions, including dynamic data lookup, call transcripts, and structured trip detail extraction for itinerary generation. Both inbound and outbound calls are supported with a unified configuration.
-   **Itinerary Proposals:** Automated generation of detailed flight proposals using **Duffel API**. Proposals include multiple flight options and support a "Guest Proposal Flow" for non-account holders to receive and book via email.
-   **Guest Booking Flow:** A streamlined process allowing guests to book and pay for flights via email links without an account, integrating Stripe for payments. It includes atomic claim mechanisms and handles concurrency.
-   **Flight Management:** Real-time flight search, booking, and order management through **Duffel API**, supporting multi-passenger and various cabin classes.
-   **Payment Processing:** Secure payment collection via **Stripe** for flight purchases, supporting Apple Pay and Google Pay.
-   **Admin Features:** An administrative dashboard for user management, payment history, and a manual booking fallback system.
-   **Notification System:** Robust user notification system with read/unread states.
-   **Travel Calendar:** A monthly calendar view for managing trip dates.
-   **SMS (Twilio):** Configurable SMS functionality for transactional messages, with built-in dry-run and A2P 10DLC support readiness.
-   **Hotels (Phase 4 — post-call hotel search behind feature flag):** Two new modules under `server/lib/hotels/` — `extract.ts` (pure `extractHotelDetailsFromAnalysis(details, callRequest) → HotelSearchRequest | null` mapping parsed call details + optional CallRequest fallbacks; defaults rooms=1, adults=passenger count, defaults checkout to 3 nights after check-in when no return date) and `runHotelSearch.ts` (orchestrator `runHotelSearchForCall({source, callRequestId, callRequest, details, userId, proposalId, logPrefix})`: persists pending hotel_search row → calls `getHotelProvider().searchHotels()` → on success ranks via `rankHotels()` and `bulkCreateHotelOptions()` then marks "completed"; on failure marks "failed" with truncated error message; single-attempt no retry; never re-throws). Two additive fire-and-forget hooks added to `server/routes.ts`: inbound `generateGuestProposalForInboundCall` (after the SMS block, inside the existing `inboundGuestProposalDispatched` guard) and outbound post-call IIFE site (after the guest-proposal IIFE closes). **Both hooks gated entirely behind `ENABLE_HOTEL_SEARCH=true` — defaults false = zero behavior change.** Email/proposal/SMS/Duffel paths are untouched. The manual regenerate-proposal endpoint is intentionally NOT wired (admins regenerating flight options shouldn't double-charge the hotel search budget). Two new read-only admin endpoints: `GET /api/admin/hotels/searches?callRequestId=<id>` returns `{ search, options }` for the latest search produced by that call request (deterministic — storage orders by createdAt desc), and `GET /api/admin/hotels/searches/:id` returns the same shape for a specific search id. Both endpoints strip the admin-only `sourceRawPayload` (option) and `rawProviderPayloadTruncated` (search) fields by default; pass `?raw=true` to include them (still gated behind `requireAdmin`). `proposalId` is always null in Phase 4 (no proposal exists at hook time); future phases may wire it.
-   **Hotels (Phase 3 — real adapter stubs + provider comparison metadata):** Five real-provider adapters added under `server/lib/hotels/providers/` — `duffelStays.ts`, `expediaRapid.ts`, `hotelbeds.ts`, `amadeusHotels.ts`, `ratehawk.ts`. Each `implements HotelProvider`, declares accurate `capabilities` from public docs, exposes `isConfigured()` against its required env vars, and **throws `HotelProviderNotConfiguredError` on every method** — zero outbound network calls anywhere in this phase, no SDK imports at module load. A new `HotelProviderInfo` type in `types.ts` (status, inventoryType, regions, paymentModel, currencies, commissionModel, supportsInstantConfirmation, certificationRequired, estimatedTimeToProduction, monthlyMinimums, requiredEnv names only, docsUrl, notes) is exported as `providerInfo` from each of the six adapters (mock + 5 real). The factory `getHotelProvider()` now routes `HOTEL_PROVIDER` to the matching adapter; if a real provider's creds are missing it logs `[hotels] provider=<x> not configured, falling back to mock` and returns mock — never throws at startup. New helper `getAllProviderInfo()` returns the metadata + per-provider `configured` boolean for the admin comparison view. New endpoint `GET /api/admin/hotels/providers` (behind `isAuthenticated, requireAdmin`) returns `{ active, providers }` — env values are never returned, only env var names. The Phase 1 test-search endpoint now catches `HotelProviderNotConfiguredError` from stubs and returns `{ stubNotImplemented: true, message }` instead of a 500. Each real implementation is its own future task and requires a contract + certification before going live.
-   **Hotels (Phase 1 + Phase 2 — abstraction, mock, ranking, persistence; no public surface yet):** Phase 1 ships provider-agnostic hotel infrastructure under `server/lib/hotels/` — `types.ts` (interface, capability map, normalized request/option/quote/booking types, typed error classes `HotelProviderError` / `HotelProviderUnsupportedError` / `HotelProviderNotConfiguredError`), `providers/mock.ts` (deterministic seeded mock returning 8-12 hotels per `(destination, checkInDate)` seed), `index.ts` (`getHotelProvider()` singleton factory keyed off `HOTEL_PROVIDER` env, defaults to mock, lazy-logs `[hotels] provider=<name> configured=<bool>` once on first invocation), and `rank.ts` (pure `rankHotels()` with 8 documented per-signal weights — budget fit, refundable, guest rating, amenities, neighborhood, hotel type, star fit, proximity — plus optional `RankingHints` bonuses; returns top 3-5 with `rankScore` + per-signal `rankReasons`). One admin-only sanity-check endpoint `POST /api/admin/hotels/test-search` (behind `isAuthenticated, requireAdmin`, zod-validated body) returns `{ provider, configured, request, options, rankedTop }` — read-only, never persists. Phase 2 ships persistence schema + CRUD wrappers (`hotel_searches`, `hotel_options`, `hotel_bookings`) for future flows. No integration with the call/proposal flow yet — Phases 3 (real adapter stubs), 4 (post-call hotel search behind feature flag), and 5 (booking guardrails) build on top.
-   **Rate Limiting:** Implemented using `express-rate-limit` to protect sensitive endpoints from abuse, with configurable limits for authentication, callback requests, guest bookings, and general API access.
-   **Legal Pages:** Dedicated public pages for privacy policy and terms of service.

The project structure is organized into `client/`, `server/`, and `shared/` directories, with `shared/schema.ts` defining common database schemas and types.

## External Dependencies

-   **SendGrid:** Email delivery service for verification, proposals, and notifications.
-   **Duffel API:** Provides flight search, booking, and order management functionalities.
-   **Bland AI:** Powers voice AI for concierge calls, dynamic data, and call analysis.
-   **Stripe:** Payment gateway for secure credit card processing and payment intents.
-   **PostgreSQL:** Relational database for all application data.
-   **Twilio:** SMS messaging service (currently for transactional messages).
-   **Vite:** Frontend build tool.
-   **Tailwind CSS:** Utility-first CSS framework.
-   **shadcn/ui:** UI component library.
-   **TanStack React Query:** For frontend data fetching and caching.
-   **bcrypt:** Password hashing library.
-   **express-session & connect-pg-simple:** For server-side session management.
-   **wouter:** Client-side router.