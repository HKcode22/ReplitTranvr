# Travnr - Personal Travel Concierge Platform

## Overview
Travnr is a full-stack web application designed as the central hub for a personal travel concierge service. It enables users to create accounts, manage traveler profiles, request concierge calls, receive and approve travel itinerary proposals with detailed pricing, view a travel calendar, manage notifications, and handle billing and payments. The platform automates aspects of the concierge service, from voice AI interactions to flight bookings, aiming to streamline travel planning and management for both users and administrators.

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

Travnr utilizes a modern full-stack architecture. The frontend is built with **React 18, TypeScript, Vite, Tailwind CSS, and shadcn/ui**, ensuring a responsive and visually appealing user interface. UI/UX design emphasizes a clean, intuitive experience with dark/light mode support.

The backend operates on **Express.js with TypeScript**, providing a robust API layer. Data persistence is managed by **PostgreSQL** through **Drizzle ORM**. Authentication is custom, using email/password with `bcrypt` for hashing and `express-session` for session management.

Key features and their technical implementations include:

-   **Authentication:** Custom email/password system with SendGrid for email verification, and a comprehensive forgot/reset password flow.
-   **Traveler Profiles:** Users can manage detailed traveler profiles including passport information.
-   **Concierge Call Requests:** Users can initiate call requests, which are automatically dispatched to **Bland AI** for voice-driven concierge interactions. Bland AI integration includes dynamic data lookup for personalized conversations, call transcripts, and recordings.
-   **Itinerary Proposals:** After a call, the system automatically generates itinerary proposals by searching **Duffel API** for flights. Proposals include detailed line items, Duffel flight cards, and options for user approval and booking. A "Guest Proposal Flow" allows users to receive and book proposals via email without requiring an account.
-   **Flight Management:** Integrated with **Duffel API** for real-time flight search, booking, and order management. This includes multi-passenger support, cabin class selection, and baggage information.
-   **Payment Processing:** **Stripe** is integrated for secure payment collection. Payment intents are created for flight purchases, supporting various payment methods including Apple Pay and Google Pay. The platform uses a pre-funded Duffel balance for actual flight bookings, with customer payments collected via Stripe.
-   **Admin Features:** An admin mode (for `@travnr.com` emails or whitelisted users) provides an administrative dashboard with stats, user management, payment history, and a manual booking fallback system for cases where Duffel balance is insufficient, ensuring bookings can still be processed.
-   **Notification System:** A robust system for user notifications with read/unread states.
-   **Travel Calendar:** A monthly calendar view for managing trip dates.

The project structure is organized into `client/`, `server/`, and `shared/` directories, with `shared/schema.ts` defining common database schemas and types across the application.

## External Dependencies

-   **SendGrid:** Used for sending email notifications, specifically for email verification and guest proposal emails.
-   **Duffel API:** Integrated for all flight-related operations, including searching flights, retrieving offer details, and booking flights.
-   **Bland AI:** Provides voice AI capabilities for automated concierge calls, including call dispatch, dynamic data interaction, and post-call analysis (transcripts, recordings).
-   **Stripe:** Utilized for payment processing, handling credit card transactions, and managing payment intents for flight purchases. Integrates via `@stripe/react-stripe-js` on the frontend and server-side webhooks.
-   **PostgreSQL:** The primary database for storing all application data, managed through Drizzle ORM.
-   **Vite:** Frontend build tool.
-   **Tailwind CSS:** Utility-first CSS framework for styling.
-   **shadcn/ui:** UI component library.
-   **TanStack React Query:** For data fetching and caching on the frontend.
-   **bcrypt:** For hashing user passwords.
-   **express-session & connect-pg-simple:** For server-side session management.
-   **wouter:** Client-side router.