import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiRequest } from "@/lib/queryClient";
import {
  Activity, AlertTriangle, Zap, MessageCircle, CheckCircle2, Loader2,
  Lock, Plug, Eye, ArrowRight,
} from "lucide-react";

function useInView<T extends Element = HTMLDivElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

const steps = [
  {
    num: "1",
    title: "Monitor",
    icon: Activity,
    description:
      "Travnr watches every active booking. Weather, on-time history, live air traffic, schedule changes. Around the clock, across every PNR.",
  },
  {
    num: "2",
    title: "Predict",
    icon: AlertTriangle,
    description:
      "We score disruption probability in real time. When risk crosses your threshold, we identify affected travelers and triage by urgency.",
  },
  {
    num: "3",
    title: "Act",
    icon: Zap,
    description:
      "Rebooking options surface instantly with seats already located. Your team approves, or Travnr executes end-to-end, per your policy.",
  },
  {
    num: "4",
    title: "Communicate",
    icon: MessageCircle,
    description:
      "Travelers get clean, branded updates. Your agents stay in the loop. You get the credit.",
  },
];

const capabilities = [
  {
    icon: Eye,
    title: "Always-on monitoring",
    description: "Schedule changes, gate moves, weather cascades, equipment swaps. No more learning about disruptions from your client.",
  },
  {
    icon: Plug,
    title: "Works with your stack",
    description: "Drop-in on top of your GDS, mid-office, and CRM. We add a layer; we don't replace anything.",
  },
  {
    icon: Lock,
    title: "Policy-aware automation",
    description: "Configure how aggressive Travnr is per client, per fare class, per traveler tier. You stay in control.",
  },
];

const stats = [
  {
    value: "73%",
    label: "of corporate travel managers say disruption handling is their biggest client retention risk.",
  },
  {
    value: "4.2 hrs",
    label: "spent per disruption event on manual rebooking, on average.",
  },
  {
    value: "1",
    label: "bad disruption is enough to lose a corporate account.",
  },
];

function ContactForm() {
  const [name, setName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setSubmitting(true);
    setError(false);
    try {
      await apiRequest("POST", "/api/public/contact", {
        name: name.trim(),
        email: email.trim(),
        subject: agencyName.trim() || null,
        message: message.trim(),
      });
      setSubmitted(true);
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="max-w-xl mx-auto p-8 text-center space-y-3" data-testid="card-agencies-success">
        <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold tracking-tight">Request received.</h3>
        <p className="text-sm text-muted-foreground">We'll be in touch within one business day.</p>
      </Card>
    );
  }

  return (
    <Card className="max-w-xl mx-auto p-6 sm:p-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="agencies-name">Your name</Label>
          <Input
            id="agencies-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
            maxLength={120}
            data-testid="input-agencies-name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="agencies-company">Agency</Label>
          <Input
            id="agencies-company"
            value={agencyName}
            onChange={(e) => setAgencyName(e.target.value)}
            autoComplete="organization"
            maxLength={200}
            data-testid="input-agencies-company"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="agencies-email">Work email</Label>
          <Input
            id="agencies-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            maxLength={200}
            data-testid="input-agencies-email"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="agencies-message">Tell us about your operation</Label>
          <Textarea
            id="agencies-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={4000}
            placeholder="Volume, client types, current stack. Whatever's relevant."
            required
            data-testid="textarea-agencies-message"
          />
        </div>
        {error && (
          <p className="text-sm text-destructive" data-testid="text-agencies-error">
            Something went wrong. Please email us at{" "}
            <a href="mailto:hello@travnr.com" className="underline">
              hello@travnr.com
            </a>
          </p>
        )}
        <Button
          type="submit"
          disabled={submitting}
          className="w-full"
          data-testid="button-agencies-submit"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Request early access
          {!submitting && <ArrowRight className="w-4 h-4 ml-2" />}
        </Button>
      </form>
    </Card>
  );
}

export default function AgenciesPage() {
  const scrollToContact = () => {
    const el = document.getElementById("contact");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center" data-testid="link-agencies-logo">
            <span className="font-semibold text-lg tracking-tight">Travnr</span>
          </Link>
          <div className="hidden sm:flex items-center gap-1">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="link-home">Home</Button>
            </Link>
            <Link href="/travelers">
              <Button variant="ghost" size="sm" data-testid="link-for-travelers">For travelers</Button>
            </Link>
            <Link href="/contact">
              <Button variant="ghost" size="sm" data-testid="link-contact">Contact</Button>
            </Link>
            <ThemeToggle />
          </div>
          <div className="flex sm:hidden items-center gap-1">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="link-home-mobile">Home</Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className="relative py-20 sm:py-28 md:py-32">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 mb-6 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
            For travel agencies and TMCs
          </div>
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight mb-6 leading-[1.05]"
            data-testid="text-agencies-hero-headline"
          >
            An AI ops layer for the moment things go wrong.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Travnr sits on top of your stack, monitors every active booking, and handles disruptions before your agents or your clients find out something happened.
          </p>
          <Button size="lg" onClick={scrollToContact} data-testid="button-agencies-cta">
            Request early access
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      <section className="border-t border-border py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <FadeIn>
            <div className="max-w-2xl mx-auto text-center mb-12 sm:mb-16">
              <p className="text-xs font-medium text-primary uppercase tracking-wider mb-3">The cost of doing nothing</p>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                Disruption is when accounts get won. Or lost.
              </h2>
            </div>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <FadeIn>
              <Card
                className="p-6 sm:p-8 h-full bg-muted/40"
                data-testid="card-pain-agency"
              >
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <h3 className="font-medium text-xs uppercase tracking-wider text-muted-foreground">
                    Without Travnr
                  </h3>
                </div>
                <p className="text-base sm:text-lg leading-relaxed">
                  It's 11:42pm. A storm grounds 40 flights out of O'Hare. Your phone starts ringing. Your agent is asleep. Your corporate client is stranded with a 9am board meeting in New York. No system is watching. No protocol fires without a human. You have a problem.
                </p>
              </Card>
            </FadeIn>
            <FadeIn delay={150}>
              <Card
                className="p-6 sm:p-8 h-full border-primary/30"
                data-testid="card-pain-travnr"
              >
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <h3 className="font-medium text-xs uppercase tracking-wider text-primary">
                    With Travnr
                  </h3>
                </div>
                <p className="text-base sm:text-lg leading-relaxed">
                  Travnr flagged the disruption at 11:38pm. It identified every affected traveler, surfaced three rebooking options, picked the best one per your policy, and notified your client. All before your phone rang. They land in New York at 8:15am. They don't know how close it was. They just know you handled it.
                </p>
              </Card>
            </FadeIn>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-muted/30 py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <FadeIn>
            <div className="max-w-2xl mx-auto text-center mb-12 sm:mb-16">
              <p className="text-xs font-medium text-primary uppercase tracking-wider mb-3">How it works</p>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                Four steps. Zero handoffs.
              </h2>
            </div>
          </FadeIn>

          <div className="relative">
            <div
              className="hidden md:block absolute top-6 left-0 right-0 h-px bg-border"
              aria-hidden="true"
            />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-6 relative">
              {steps.map((s, i) => (
                <FadeIn key={s.num} delay={i * 120}>
                  <div className="flex flex-col items-center text-center" data-testid={`step-agencies-${s.num}`}>
                    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm mb-5 relative z-10 ring-8 ring-background tabular-nums">
                      {s.num}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <s.icon className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold tracking-tight">{s.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-[26ch]">{s.description}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24 border-t border-border">
        <div className="max-w-6xl mx-auto px-4">
          <FadeIn>
            <div className="max-w-2xl mb-12 sm:mb-16">
              <p className="text-xs font-medium text-primary uppercase tracking-wider mb-3">Capabilities</p>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
                Built to plug into how your agency already works.
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                You don't need to rip anything out. Travnr adds intelligence to the stack you've already invested in.
              </p>
            </div>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {capabilities.map((c, i) => (
              <FadeIn key={c.title} delay={i * 100}>
                <Card className="p-6 sm:p-8 h-full" data-testid={`card-capability-${i}`}>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
                    <c.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold tracking-tight mb-2">{c.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{c.description}</p>
                </Card>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 border-t border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
            {stats.map((stat, i) => (
              <FadeIn key={stat.value} delay={i * 120}>
                <div className="text-center px-2" data-testid={`stat-agencies-${i}`}>
                  <p className="text-5xl sm:text-6xl font-semibold tracking-tight text-primary mb-4 tabular-nums">
                    {stat.value}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                    {stat.label}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 sm:py-32 border-t border-border">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <FadeIn>
            <h2
              className="text-3xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-tight"
              data-testid="text-agencies-closing"
            >
              You focus on the relationship.
              <span className="block text-muted-foreground">We handle the rest.</span>
            </h2>
          </FadeIn>
        </div>
      </section>

      <section id="contact" className="py-20 sm:py-24 border-t border-border bg-muted/30">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-10">
            <p className="text-xs font-medium text-primary uppercase tracking-wider mb-3">Early access</p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
              Let's build this together.
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              We're working with a small group of agencies to shape Travnr for Agencies. If you manage corporate or high-volume travel, we want to hear from you.
            </p>
          </div>
          <ContactForm />
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-sm tracking-tight">Travnr</span>
            <span className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <a
              href="mailto:hello@travnr.com"
              className="hover:text-foreground transition-colors"
              data-testid="link-contact-footer"
            >
              Contact
            </a>
            <Link href="/privacy" className="hover:text-foreground transition-colors" data-testid="link-privacy">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors" data-testid="link-terms">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
