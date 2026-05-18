// Travnr Privacy Policy. Versioned via the "Last updated" line + the
// `#policy-v2` anchor below; bump both when the substantive copy changes.
// Registered legal entity is BMA North America LLC, doing business as Travnr.

import { Link } from "wouter";
import SEO from "@/components/seo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Privacy Policy"
        description="How Travnr collects, uses, and protects your information when you use our AI travel concierge — including AI calls, transcripts, and bookings."
        path="/privacy"
      />
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center" data-testid="link-privacy-logo">
            <span className="font-serif font-semibold text-lg">Travnr</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="button-privacy-back">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <h1 className="font-serif text-4xl sm:text-5xl font-bold mb-3" data-testid="text-privacy-title">
          Privacy Policy
        </h1>
        <p
          id="policy-v2"
          className="text-sm text-muted-foreground mb-10"
          data-testid="text-privacy-updated"
        >
          Version 1.1 · Last updated: May 18, 2026
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-serif prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-p:leading-relaxed prose-li:my-1">
          <p>
            <strong>BMA North America LLC</strong>, doing business as Travnr ("Travnr," "we," "us," or "our"), provides an AI-powered travel concierge service that helps users share travel preferences through calls, forms, email, SMS, or other interactions so we can provide tailored travel options.
          </p>
          <p>
            This Privacy Policy explains how we collect, use, disclose, and protect information when you use Travnr's website, call our travel concierge, submit a request, receive travel options, or otherwise interact with our services.
          </p>

          <h2>1. Information We Collect</h2>
          <p>We may collect the following information:</p>
          <ul>
            <li><strong>Contact and account information</strong>, such as your name, email address, phone number, and account details.</li>
            <li><strong>Travel request information</strong>, such as departure city or airport, destination, travel dates, flexibility, number of travelers, budget, cabin preferences, time preferences, airline preferences, baggage needs, notes, and other trip details you choose to provide.</li>
            <li><strong>Call information</strong>, such as call recordings, transcripts, summaries, AI-extracted travel details, call metadata, phone numbers, call timing, and related support information.</li>
            <li><strong>Booking and transaction information</strong>, if booking or payment features are available, such as selected itinerary details, booking references, payment status, refunds, credits, and transaction records. Payment card details may be processed by third-party payment processors and may not be stored by Travnr.</li>
            <li><strong>Device and usage information</strong>, such as IP address, browser type, device information, pages viewed, referral information, logs, cookies, and analytics data.</li>
            <li><strong>Communications</strong>, such as emails, SMS messages, support requests, feedback, survey responses, and other messages you send to us.</li>
          </ul>

          <h2>2. How We Use Information</h2>
          <p>We may use information to:</p>
          <ul>
            <li>Provide, operate, and improve Travnr.</li>
            <li>Identify returning callers or users.</li>
            <li>Understand your travel request and generate tailored travel options.</li>
            <li>Send travel options, confirmations, reminders, support messages, and service updates.</li>
            <li>Communicate with you by phone, email, or SMS.</li>
            <li>Process bookings or transactions if those features are available.</li>
            <li>Improve our AI systems, product experience, call quality, and customer support.</li>
            <li>Detect, prevent, and address fraud, abuse, security issues, and technical problems.</li>
            <li>Comply with legal obligations and enforce our terms.</li>
          </ul>

          <h2>3. Calls, Recordings, Transcripts, and AI Processing</h2>
          <p>
            When you call Travnr or receive a call from Travnr, the call may be recorded, transcribed, summarized, and analyzed by AI or other automated systems. We use this information to understand your request, generate travel options, improve service quality, provide support, and maintain safety and reliability.
          </p>
          <p>
            Do not share sensitive personal information during a call unless it is necessary for your travel request.
          </p>

          <h2>4. How We Share Information</h2>
          <p>We may share information with service providers and partners that help us operate Travnr, including:</p>
          <ul>
            <li>Voice and AI call providers.</li>
            <li>SMS and phone providers.</li>
            <li>Email delivery providers.</li>
            <li>Travel search, booking, airline, hotel, transportation, and travel API providers.</li>
            <li>Payment processors.</li>
            <li>Hosting, database, infrastructure, and security providers.</li>
            <li>Analytics and product improvement providers.</li>
            <li>Professional advisors, such as legal, accounting, or compliance advisors.</li>
          </ul>
          <p>
            We may also disclose information if required by law, to protect rights and safety, to investigate fraud or abuse, or as part of a merger, acquisition, financing, or sale of assets.
          </p>
          <p>
            <strong>Travnr does not sell your personal information, and we do not share your personal information — including your mobile phone number — with third parties or affiliates for marketing or promotional purposes.</strong> Information is shared only with the service providers listed above, and only as needed to operate and deliver the Services to you. We may use aggregated or de-identified travel insights that do not identify individual users. If we engage in activities that legally require opt-out rights or additional disclosures, we will provide those rights and disclosures as required by law.
          </p>

          <h2>5. Cookies and Analytics</h2>
          <p>
            We may use cookies, pixels, logs, and analytics tools to understand how users interact with Travnr, improve the website, measure performance, and support security. You can control cookies through your browser settings, but some features may not work properly if cookies are disabled.
          </p>

          <h2>6. Your Choices</h2>
          <p>
            You may contact us to request access, correction, or deletion of your personal information. You may also request that we stop using your information for certain purposes, subject to legal and operational limits.
          </p>
          <p>
            You can opt out of marketing emails by using the unsubscribe link if available. If we send SMS messages, you may be able to opt out by replying STOP. Even if you opt out of marketing, we may still send service-related messages about your requests, bookings, account, or security.
          </p>

          <h2>7. SMS and Mobile Messaging</h2>
          <p>
            If you provide a mobile phone number, Travnr may send you SMS messages related to your travel requests, bookings, account, or service updates, including alerts about flight disruptions and alternative options.
          </p>
          <ul>
            <li><strong>Mobile numbers are not shared with third parties</strong> or affiliates for marketing or promotional purposes. We share mobile numbers only with the service providers that help us deliver these messages (for example, our SMS gateway), and only as needed to operate the service.</li>
            <li><strong>Message frequency varies</strong> based on your activity, the travel requests you make, and the status of any flights or bookings we are monitoring on your behalf.</li>
            <li><strong>Message and data rates may apply</strong>, depending on your mobile carrier and plan.</li>
            <li>You can opt out of SMS at any time by replying <strong>STOP</strong> to any message from Travnr. You can reply <strong>HELP</strong> for help. Opting out of SMS does not affect your ability to receive service-related communications by email.</li>
          </ul>

          <h2>8. Data Retention</h2>
          <p>
            We retain information for as long as reasonably necessary to provide Travnr, complete transactions, support users, comply with legal obligations, resolve disputes, prevent fraud, and improve our services. Retention periods may vary depending on the type of information and the reason it was collected.
          </p>

          <h2>9. Security</h2>
          <p>
            We use reasonable administrative, technical, and organizational safeguards designed to protect information. However, no method of transmission or storage is completely secure, and we cannot guarantee absolute security.
          </p>

          <h2>10. Children's Privacy</h2>
          <p>
            Travnr is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us personal information, contact us and we will take appropriate steps.
          </p>

          <h2>11. U.S. State Privacy Rights</h2>
          <p>
            Depending on where you live, you may have privacy rights under applicable state laws, such as the right to access, correct, delete, or receive a copy of certain personal information, and the right to opt out of certain uses of personal information. We will respond to valid requests as required by applicable law.
          </p>
          <p>
            California residents may have additional rights under the California Consumer Privacy Act, as amended, if it applies to Travnr. These rights may include the right to know, delete, correct, and opt out of certain sales or sharing of personal information.
          </p>

          <h2>12. International Users</h2>
          <p>
            Travnr is operated from the United States. If you use Travnr from outside the United States, your information may be processed and stored in the United States or other countries where our service providers operate.
          </p>

          <h2>13. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. The updated version will be posted on this page with a new "Last updated" date. Your continued use of Travnr after an update means you acknowledge the updated policy.
          </p>

          <h2>14. Contact Us</h2>
          <p>
            For privacy questions or requests, contact us at{" "}
            <a href="mailto:hello@travnr.com" data-testid="link-privacy-contact-hello">hello@travnr.com</a>.
          </p>
        </div>
      </main>

      <footer className="border-t py-8 mt-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="font-serif font-semibold text-sm">Travnr</span>
            <span className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:underline" data-testid="link-footer-privacy">Privacy</Link>
            <Link href="/terms" className="hover:underline" data-testid="link-footer-terms">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
