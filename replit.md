# Travnr - Personal Travel Concierge Platform

## Overview
Travnr is a full-stack web application designed as the central hub for a personal travel concierge service. It enables users to manage traveler profiles, request concierge calls, receive and approve travel itinerary proposals with transparent pricing, view a comprehensive travel calendar, manage notifications, and handle all billing and payment processes. The platform aims to streamline the travel planning experience through automation and personalized service, integrating advanced AI for voice interactions and robust APIs for flight management and payment processing.

## User Preferences
I prefer iterative development, with frequent, small updates rather than large, infrequent ones. When making changes, please ask for confirmation before implementing major architectural shifts or significant code refactors. I value clear, concise explanations of proposed changes and their impact. Please do not make changes to files in the `shared/` directory unless explicitly instructed, as these define core data contracts.

## System Architecture
The application is built on a React 18 frontend with TypeScript, Vite, Tailwind CSS, and shadcn/ui for a modern, responsive user interface. The backend uses Express.js with TypeScript. Data persistence is managed by PostgreSQL with Drizzle ORM. Authentication is custom, utilizing email/password with bcrypt for security.

The frontend includes key components such as an app sidebar, status badges, theme toggle, and custom phone input. Pages cover user authentication (login, registration, password reset), a dashboard, traveler profile management, call request forms, call history with transcripts, itinerary proposals, flight search, trip management, a calendar, notifications, and billing. An admin dashboard provides tools for managing pending manual bookings, payments, users, and calls.

The backend provides API routes for authentication, user profiles, call requests, proposals, notifications, payments, and integrations with external services like Duffel and Bland AI. It includes a `DatabaseStorage` class for data access and a `proposalVerifier.ts` module for AI-driven proposal quality assurance.

Key architectural decisions include:
- **Admin Mode**: Differentiates user experience and grants elevated privileges based on email domain or allowlist.
- **Manual Booking Fallback**: Implements a robust fallback mechanism for flight bookings when Duffel balance is insufficient, notifying customers and administrators.
- **Guest Proposal Flow**: Allows users without accounts to receive and book proposals directly via email, supporting a wider user base.
- **Dynamic Data for AI**: Bland AI integrates with backend endpoints to fetch real-time user data (profiles, bookings, proposals, email info) during voice conversations, enabling personalized interactions.
- **Automated Proposal Generation**: After Bland AI calls, the system automatically searches Duffel for flight options and generates proposals, with options for manual regeneration.

## External Dependencies
- **SendGrid**: For email verification and other system-generated email communications.
- **Duffel API**: Used for real-time flight search, offer retrieval, and flight booking, managed against a pre-funded balance.
- **Bland AI**: Powers automated voice concierge calls, including call dispatch, transcript generation, and dynamic data integration during conversations.
- **PostgreSQL**: The primary database for all application data, managed via Drizzle ORM.
- **Stripe**: Handles all payment processing for flight purchases, including payment intent creation, webhook processing, and supporting various payment methods (cards, Apple Pay, Google Pay).
- **n8n**: Previously used for call request notifications, now fully replaced by direct Bland AI integration.