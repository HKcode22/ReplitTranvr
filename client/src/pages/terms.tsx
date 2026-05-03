// Template policy. Review with legal counsel before public launch.
// Do not ship as-is for production legal compliance.
//
// TODO: legal entity name — when Travnr is incorporated, replace the
// stand-alone "Travnr" references below with the registered legal entity
// name (e.g., "Travnr, Inc." / "Travnr LLC") on first mention.

import { Link } from "wouter";
import SEO from "@/components/seo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Terms of Service"
        description="The terms governing your use of Travnr's website, AI travel concierge, and related services."
        path="/terms"
      />
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center" data-testid="link-terms-logo">
            <span className="font-serif font-semibold text-lg">Travnr</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="button-terms-back">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <h1 className="font-serif text-4xl sm:text-5xl font-bold mb-3" data-testid="text-terms-title">
          Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground mb-10" data-testid="text-terms-updated">
          Last updated: May 2, 2026
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-serif prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-p:leading-relaxed prose-li:my-1">
          <p>
            These Terms of Service ("Terms") govern your use of Travnr's website, AI travel concierge, call services, travel option delivery, and related services ("Services"). By using Travnr, submitting a request, calling Travnr, receiving a call from Travnr, or otherwise interacting with our Services, you agree to these Terms.
          </p>
          <p>If you do not agree, do not use Travnr.</p>

          <h2>1. Travnr's Service</h2>
          <p>
            Travnr is an AI-powered travel concierge. We help you share travel preferences through calls, forms, email, SMS, or other interactions, and we may send you tailored travel options. Travnr may use AI systems and third-party providers to deliver the Services.
          </p>

          <h2>2. Eligibility</h2>
          <p>
            You must be at least 18 years old, or the age of majority in your jurisdiction, to make a booking through the Services. By using Travnr, you represent that you meet this requirement.
          </p>

          <h2>3. Your Responsibilities</h2>
          <ul>
            <li>Provide accurate and complete travel and contact information.</li>
            <li>Carefully review itinerary details, traveler names, dates, and prices before authorizing any purchase.</li>
            <li>Comply with airline, hotel, and travel-provider rules, including identification, baggage, check-in, and travel-document requirements.</li>
            <li>Use the Services lawfully and in good faith.</li>
          </ul>

          <h2>4. AI and Concierge Limitations</h2>
          <p>
            Travnr uses AI and third-party providers to gather your preferences and surface travel options. AI outputs may be incomplete, outdated, or inaccurate. You are responsible for reviewing all final details before confirming any booking.
          </p>

          <h2>5. No Guarantee of Availability or Pricing</h2>
          <p>
            Prices, schedules, fares, fees, taxes, and availability shown by Travnr are subject to change until a booking is fully ticketed and confirmed by the underlying travel provider. We do not guarantee that any specific option will remain available or at the displayed price.
          </p>

          <h2>6. Third-Party Travel Providers</h2>
          <p>
            Flights, hotels, ground transportation, and related services are provided by airlines, online travel agencies, global distribution systems, travel API providers, and other third parties. Their own terms, fare rules, and policies apply to those services in addition to these Terms. Travnr is not responsible for the acts, omissions, or performance of any third-party travel provider.
          </p>

          <h2>7. Payments, Refunds, Cancellations, and Changes</h2>
          <p>
            If booking or payment features are available, charges, refunds, cancellations, baggage fees, change fees, and travel credits may be governed by the policies of the underlying travel provider and/or our payment processor. Travnr does not guarantee refunds, fee waivers, or schedule changes unless expressly stated in writing.
          </p>

          <h2>8. Communications Consent</h2>
          <p>
            By providing your phone number or email or by calling Travnr, you agree that Travnr and its providers may contact you about your request and the Services by telephone call, SMS message, or email, including using automated systems. Message and data rates may apply. If we send SMS messages, you may be able to opt out by replying STOP. Opting out of marketing communications does not stop service-related messages about your requests, bookings, account, or security.
          </p>

          <h2>9. Call Recording and Transcription</h2>
          <p>
            Calls between you and Travnr may be recorded, transcribed, summarized, and analyzed by AI or other automated systems for service delivery, quality assurance, training, safety, and support. By placing or accepting a call with Travnr, you consent to this recording and processing.
          </p>

          <h2>10. Prohibited Uses</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Services for any unlawful, fraudulent, or abusive purpose.</li>
            <li>Interfere with, disrupt, or attempt to gain unauthorized access to the Services or related systems.</li>
            <li>Reverse-engineer, scrape, or extract data from the Services in violation of these Terms or applicable law.</li>
            <li>Submit false, misleading, or impersonating information.</li>
            <li>Use the Services to harass, threaten, or harm any other person.</li>
          </ul>

          <h2>11. Account Security</h2>
          <p>
            If you create an account, you are responsible for maintaining the confidentiality of your credentials and for all activity under your account. Notify us promptly of any unauthorized access.
          </p>

          <h2>12. Intellectual Property</h2>
          <p>
            The Services, including software, content, design, branding, and trademarks, are owned by Travnr or its licensors and are protected by intellectual property laws. We grant you a limited, non-exclusive, non-transferable, revocable license to use the Services for their intended purpose, subject to these Terms.
          </p>

          <h2>13. Feedback</h2>
          <p>
            If you send us feedback, suggestions, or ideas, you grant Travnr a perpetual, royalty-free, worldwide license to use them without restriction or compensation to you.
          </p>

          <h2>14. Disclaimers</h2>
          <p>
            The Services are provided on an "as is" and "as available" basis, without warranties of any kind, whether express, implied, or statutory. To the fullest extent permitted by law, Travnr disclaims all warranties, including merchantability, fitness for a particular purpose, non-infringement, accuracy, and uninterrupted availability.
          </p>

          <h2>15. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, Travnr and its affiliates, officers, employees, and providers will not be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or for any loss of profits, revenue, data, goodwill, or travel opportunity, arising out of or related to your use of the Services. Travnr's total liability for any claim arising out of or related to the Services is limited to the greater of (a) the amounts you paid to Travnr for the Services in the twelve months before the claim or (b) one hundred U.S. dollars (US$100).
          </p>

          <h2>16. Indemnification</h2>
          <p>
            You agree to defend, indemnify, and hold harmless Travnr and its affiliates, officers, employees, and providers from any claims, damages, liabilities, costs, and expenses (including reasonable attorneys' fees) arising out of or related to your use of the Services, your content, your violation of these Terms, or your violation of any law or third-party right.
          </p>

          <h2>17. Termination</h2>
          <p>
            We may suspend or terminate your access to the Services at any time, with or without notice, for any reason, including suspected fraud, abuse, or violation of these Terms. You may stop using the Services at any time.
          </p>

          <h2>18. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. The updated version will be posted on this page with a new "Last updated" date. Your continued use of Travnr after an update means you accept the updated Terms.
          </p>

          <h2>19. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the State of Missouri, USA, without regard to its conflict-of-laws principles. You and Travnr agree to submit to the exclusive jurisdiction of the state and federal courts located in Missouri for any dispute arising out of or relating to these Terms or the Services, except where prohibited by applicable law.
          </p>

          <h2>20. Contact Us</h2>
          <p>For questions about these Terms or the Services, contact us at:</p>
          <ul>
            <li>
              <a href="mailto:hello@travnr.com" data-testid="link-terms-contact-hello">hello@travnr.com</a> (primary)
            </li>
            <li>
              <a href="mailto:support@travnr.com" data-testid="link-terms-contact-support">support@travnr.com</a> (support requests)
            </li>
          </ul>
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
