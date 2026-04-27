# Travnr - Personal Travel Concierge Platform

## Overview
Travnr is a full-stack web application designed as the central hub for a personal travel concierge service. It enables users to manage traveler profiles, request concierge assistance, receive and approve travel itineraries with detailed pricing, view a travel calendar, manage notifications, and handle billing and payments. The platform aims to streamline the travel planning process, offering a comprehensive solution for both users and concierge service providers.

## User Preferences
I prefer clear, concise communication and detailed explanations when new features are introduced or significant changes are made. I appreciate an iterative development approach, with regular updates on progress. Before making any major architectural changes or introducing new external dependencies, please ask for my approval. Ensure that the design prioritizes user experience with intuitive interfaces and responsive elements.

## System Architecture
The application is built with a React 18, TypeScript, Vite, and Tailwind CSS frontend, utilizing `shadcn/ui` for UI components. The backend is an Express.js server with TypeScript. PostgreSQL is used for the database, managed by Drizzle ORM. Authentication is custom email/password based with `bcrypt`, `express-session`, and `connect-pg-simple`.

**Key Features:**
- **UI/UX:** Modern, responsive design using Tailwind CSS and `shadcn/ui`. Supports dark/light mode.
- **Authentication:** Custom email/password system with verification, password reset, and session management.
- **Traveler Profiles:** Comprehensive management of traveler details, including passport information.
- **Concierge Call System:** Integration with Bland AI for automated voice concierge calls, including dynamic data lookup during calls, call dispatch, transcripts, and recordings.
- **Flight Search & Booking:** Powered by Duffel API for real-time flight search, offer details, and booking. Supports multi-passenger search and incorporates airline logos, segments, and baggage info.
- **Itinerary Proposals:** Users receive detailed flight proposals with options for approval and direct booking.
- **Payment Processing:** Stripe integration for secure card payments, Apple Pay, and Google Pay, with support for saved cards. Payments are collected via Stripe, and flights are booked on Duffel using the platform's pre-funded balance.
- **Guest Proposals:** A unique flow allows guest callers to receive 3-option flight proposals via email (Best Price, Best Value, Fastest) without requiring an account, with public access and automatic regeneration upon expiry.
- **Admin Functionality:** An admin dashboard for managing users, payments, pending manual bookings, and monitoring system stats (e.g., Duffel balance). Includes a manual booking fallback process when Duffel balance is insufficient, ensuring customer bookings are still handled.
- **Notifications & Calendar:** A notification system for updates and a monthly calendar view for upcoming trips.

## External Dependencies
- **SendGrid:** For sending email notifications, including email verification and guest proposal emails.
- **Duffel API:** For all flight-related functionalities: search, real-time pricing, offer details, and booking.
- **Bland AI:** Provides the voice AI for automated concierge calls, including call dispatch, dynamic data handling, and processing call events.
- **Stripe:** For secure payment processing, including creating payment intents, handling webhooks, and supporting various payment methods (cards, Apple Pay, Google Pay).
- **PostgreSQL:** The primary database for storing all application data.
- **Drizzle ORM:** Used for interacting with the PostgreSQL database.