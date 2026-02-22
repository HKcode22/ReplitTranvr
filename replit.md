# Travnr - Personal Travel Concierge Platform

## Overview
Travnr is a full-stack web application serving as the "home base" for a personal travel concierge service. Users create accounts, manage traveler profiles, request concierge calls, receive and approve travel itinerary proposals with line-item pricing, view a travel calendar, manage notifications, and handle billing/payments.

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Express.js with TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **Auth:** Custom email/password with bcrypt (12 rounds), express-session, connect-pg-simple
- **Email:** SendGrid for verification emails
- **Flights:** Duffel API (@duffel/api) for flight search, booking, and payments
- **Voice AI:** Bland AI for automated concierge phone calls
- **Routing:** wouter (client-side)
- **Data Fetching:** TanStack React Query v5

## Project Architecture
```
client/src/
  App.tsx              - Main app with routing, auth provider, theme provider
  lib/
    auth.tsx           - AuthProvider context with login/register/logout
    theme.tsx          - ThemeProvider with dark/light mode
    queryClient.ts     - TanStack Query client with apiRequest helper
  components/
    app-sidebar.tsx    - Shadcn sidebar with nav items and user info
    status-badge.tsx   - Colored status badges for various statuses
    theme-toggle.tsx   - Sun/moon theme toggle button
    phone-input.tsx    - Phone number input with country code selector (+1 default)
    ui/                - shadcn/ui components
  pages/
    landing.tsx        - Public landing page with typing animation, voice animation, callback form
    auth.tsx           - Login/Register with email verification flow, forgot password
    reset-password.tsx - Reset password page (from email link)
    dashboard.tsx      - Dashboard with stats, latest data, quick actions, demo seeder
    profile.tsx        - Traveler profile form
    request-call.tsx   - New call request form
    call-history.tsx   - List of call requests with Bland AI call status, transcripts, recordings
    proposals.tsx      - List of proposals
    proposal-detail.tsx - Proposal detail with line items, Duffel flight cards, approve/book actions
    flight-search.tsx  - Flight search page using Duffel API
    calendar-page.tsx  - Monthly calendar with trip dates
    notifications-page.tsx - Notification list with mark read
    billing.tsx        - Payment history and summary
    security.tsx       - Security & compliance information page
server/
  index.ts             - Express server setup
  routes.ts            - All API routes (auth, profile, calls, proposals, notifications, payments, Duffel flights, Bland AI, webhooks)
  storage.ts           - DatabaseStorage class implementing IStorage interface
  db.ts                - Drizzle ORM connection with pg pool
  lib/
    bland.ts           - Bland AI service wrapper (dispatch calls, build prompts, get call details)
shared/
  schema.ts            - All Drizzle schemas, enums, relations, Zod insert schemas, types
```

## Database Tables
- users, sessions, traveler_profiles, call_requests, itinerary_proposals, proposal_items, notifications, payments, callback_requests, saved_cards, bland_calls

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)
- `SESSION_SECRET` - Express session secret (secret)
- `SENDGRID_API_KEY` - SendGrid API key for emails (secret)
- `SENDGRID_FROM_EMAIL` - Sender email (hello@travnr.com)
- `N8N_WEBHOOK_CALL_REQUEST` - n8n webhook URL for call request notifications (fallback when Bland AI is not configured)
- `DUFFEL_API_TOKEN` - Duffel API token for production flight search and booking (secret)
- `DUFFEL_TEST_API_TOKEN` - Duffel test API token (secret, currently unused - app uses production token only)
- `BLAND_AI_API_KEY` - Bland AI API key for voice concierge calls (secret)

## Key Features
- Custom email/password auth with email verification via SendGrid, forgot/reset password flow
- Landing page with typing animation, voice conversation simulation, and public callback form (triggers n8n webhook)
- Dashboard with stats cards and demo data seeder
- Traveler profile management with passport details (legal name, DOB, gender, title, passport number, nationality)
- Call request creation with phone number - auto-dispatches Bland AI voice call when configured, falls back to n8n webhook
- Bland AI voice concierge: automated AI phone calls with travel concierge persona, dynamic data lookup (profiles, bookings, proposals), post-call transcripts and recordings
- Duffel flight search with real-time pricing, cabin classes, baggage info, multi-passenger support (1-9 travelers)
- Flight checkout with profile auto-fill for primary traveler, per-passenger forms for additional travelers
- Saved payment cards in Billing page (add/remove/set default), auto-selected at checkout
- Test card pre-fill (4242...) in development mode for easy testing
- Phone validation requires international format (+1...) for Duffel compatibility
- Itinerary proposals with Duffel flight offers (airline logos, segments, stops, duration), approval, and booking
- Duffel-powered flight booking with card payment (card payment required before booking), booking reference tracking
- Monthly travel calendar
- Notification system with read/unread states
- Billing/payment history with saved cards management and Duffel booking references
- Dark/light mode toggle
- Webhook endpoints for external systems (proposal creation supports duffelOfferId and duffelOfferData in items)

## Bland AI Integration
- **Config**: GET `/api/bland/config` - returns { configured: boolean }
- **Call List**: GET `/api/bland/calls` - all Bland AI calls for the authenticated user
- **Calls by Request**: GET `/api/bland/calls/:callRequestId` - Bland AI calls for a specific call request
- **Dispatch Call**: POST `/api/bland/dispatch` - manually dispatch a Bland AI call for a call request
- **Stop Call**: POST `/api/bland/stop/:callId` - stop an active Bland AI call
- **Webhook**: POST `/api/bland/webhook` (public) - receives Bland AI call events (started, ended, transcript, failed)
- **Dynamic Data**: POST `/api/bland/dynamic-data` (public, secret-authenticated) - Bland AI calls mid-conversation to fetch traveler profiles, bookings, proposals
- **Auto-Dispatch**: When Bland AI is configured, new call requests automatically dispatch a voice call
- **Auto-Proposal**: When a call completes, automatically searches Duffel for flights matching call request details (destination, dates, trip type) and creates a proposal with top 3 offers. Falls back to stub proposal for hotel-only trips or when Duffel is unavailable. Prevents duplicate proposals per call request.
- **Generate Proposal**: POST `/api/call-requests/:id/generate-proposal` - manually trigger proposal generation for completed calls (for retroactive use)
- **Call History UI**: Completed calls show "Generate Flight Proposal" button (if no proposal exists) or "View Proposal" link (if proposal exists)
- **Service Layer**: `server/lib/bland.ts` wraps the Bland AI REST API (POST /v1/calls, GET /v1/calls/:id, etc.)

## Duffel Integration
- **Config**: GET `/api/duffel/config` - returns { testMode: boolean } based on which API token is active
- **Flight Search**: POST `/api/duffel/search` - searches flights by origin/destination/dates/cabin class/passengers (supports multi-passenger)
- **Airport Autocomplete**: GET `/api/duffel/places?query=...` - airport/city search via Duffel Places API
- **Offer Details**: GET `/api/duffel/offers/:offerId` - fetches fresh offer data
- **Component Client Key**: POST `/api/duffel/component-client-key` - creates a Component Client Key JWT for DuffelCardForm authentication
- **Direct Booking**: POST `/api/duffel/book-direct` - books a flight with passenger array support (multi-traveler), requires cardId from DuffelCardForm tokenization, supports optional threeDSecureSessionId
- **Checkout Flow**: Multi-step: passengers -> fetch component client key -> DuffelCardForm (card entry) -> createCardForTemporaryUse -> book order with card payment
- **Frontend Components**: Uses @duffel/components React DuffelCardForm with createCardForTemporaryUse action for PCI-compliant card tokenization
- **Proposal Booking**: POST `/api/proposals/:id/book-duffel` - books all Duffel offers in a proposal
- **Saved Cards**: GET/POST/DELETE `/api/saved-cards` - manage saved payment cards
- **Token**: Uses DUFFEL_API_TOKEN (production) exclusively

## Stripe Integration (Backend Only - Proposal Payments)
- **Stripe Client:** `server/lib/stripeClient.ts` - fetches credentials from Replit connection API
- **Webhook Handler:** `server/lib/webhookHandlers.ts` - processes Stripe webhooks via stripe-replit-sync
- **Config**: GET `/api/stripe/config` - returns { publishableKey } for frontend Stripe.js initialization
- **PaymentIntent**: POST `/api/stripe/create-payment-intent` - creates a PaymentIntent for a proposal item
- **Confirm Booking**: POST `/api/stripe/confirm-booking` - verifies PaymentIntent succeeded, books flight on Duffel with balance payment, records payment
- **Stripe Webhook**: POST `/api/stripe/webhook` - registered BEFORE express.json() for raw Buffer access
- **Initialization**: Stripe schema and webhooks initialized on server startup via stripe-replit-sync
- **Note**: Frontend checkout uses Duffel's built-in card payment (DuffelCardForm) as the primary payment method for both proposal and direct flight bookings

## Integration Status
- **SendGrid** - Configured (SENDGRID_API_KEY + SENDGRID_FROM_EMAIL set)
- **Duffel** - Configured with live API token (DUFFEL_API_TOKEN set)
- **Bland AI** - Configured (BLAND_AI_API_KEY set)
- **n8n** - Configured (N8N_WEBHOOK_CALL_REQUEST set)
- **Stripe** - NOT configured yet. User dismissed Replit Stripe connector setup. The app handles this gracefully by skipping Stripe initialization when the connector is not available. Can be set up later through Replit integrations panel.

## Running
- `npm run dev` starts the Express server (port 5000)
- `npm run db:push` pushes schema changes to database
