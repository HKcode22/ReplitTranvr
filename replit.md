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
-   **Legal Pages:** Dedicated public pages for privacy policy and terms of service.
-   **SEO & Social Share:** Optimized with Open Graph, Twitter Card meta blocks, canonical links, `robots.txt`, and `sitemap.xml`.

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