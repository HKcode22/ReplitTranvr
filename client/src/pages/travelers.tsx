import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/phone-input";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowRight, Phone, Mic, Check, Loader2,
  MapPin, Plane, Bell, Lock,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";

const WORDS = ["trip", "vacation", "weekend", "honeymoon", "work trip"];

function TypingAnimation() {
  const [text, setText] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const word = WORDS[wordIndex];
    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting && text === word) {
      timeout = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && text === "") {
      setIsDeleting(false);
      setWordIndex((i) => (i + 1) % WORDS.length);
    } else {
      timeout = setTimeout(
        () => {
          setText(isDeleting ? word.slice(0, text.length - 1) : word.slice(0, text.length + 1));
        },
        isDeleting ? 50 : 80
      );
    }
    return () => clearTimeout(timeout);
  }, [text, isDeleting, wordIndex]);

  return (
    <span className="text-primary">
      {text}
      <span className="animate-blink-caret motion-reduce:animate-none border-r-2 border-primary ml-0.5" aria-hidden="true">&nbsp;</span>
    </span>
  );
}

function WaveformBars({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-0.5 bg-emerald-400 rounded-full animate-waveform motion-reduce:animate-none"
          style={{ animationDelay: `${i * 0.12}s`, height: "8px" }}
        />
      ))}
      <span className="text-[10px] text-emerald-400 ml-1 uppercase tracking-wider">{label}</span>
    </div>
  );
}

function VoiceAnimation() {
  const [step, setStep] = useState(0);
  const [callStatus, setCallStatus] = useState("Connecting...");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messages = [
    { from: "travnr", text: "Where are you headed?" },
    { from: "user", text: "New York, next weekend." },
    { from: "travnr", text: "Any preferences?" },
    { from: "user", text: "Direct flight, flexible hotel." },
    { from: "travnr", text: "Got it. I'll take care of it." },
  ];

  useEffect(() => {
    const timings = [1500, 2500, 2000, 2500, 2000, 2500];
    let currentStep = 0;

    const runStep = () => {
      if (currentStep === 0) {
        setCallStatus("Call in progress");
      }
      setStep(currentStep);
      currentStep++;
      if (currentStep <= messages.length) {
        timerRef.current = setTimeout(runStep, timings[currentStep] || 2000);
      } else {
        timerRef.current = setTimeout(() => {
          setStep(0);
          setCallStatus("Connecting...");
          currentStep = 0;
          timerRef.current = setTimeout(runStep, 1500);
        }, 3000);
      }
    };

    timerRef.current = setTimeout(runStep, 1500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const visibleMessages = messages.slice(0, step + 1);
  const lastVisible = visibleMessages[visibleMessages.length - 1];
  const liveSummary = lastVisible
    ? `${lastVisible.from === "travnr" ? "Concierge" : "Caller"} said: ${lastVisible.text}`
    : callStatus;

  return (
    <Card
      className="w-full max-w-md mx-auto bg-[hsl(215,25%,10%)] border-[hsl(215,20%,18%)] overflow-visible shadow-xl"
      role="region"
      aria-label="Sample concierge call demo"
    >
      <div className="p-4 border-b border-[hsl(215,20%,18%)] flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0" aria-hidden="true">
          <Mic className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">Travnr Concierge</p>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${callStatus === "Call in progress" ? "bg-emerald-400" : "bg-amber-400"}`} aria-hidden="true" />
            <p className="text-[11px] text-[hsl(210,15%,60%)]">{callStatus}</p>
          </div>
        </div>
      </div>
      <div className="sr-only" aria-live="polite" aria-atomic="true">{liveSummary}</div>
      <div className="p-4 space-y-3 min-h-[280px]">
        {messages.slice(0, step + 1).map((msg, i) => (
          <div key={i} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}>
            <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
              msg.from === "travnr"
                ? "bg-primary/15 border border-primary/20"
                : "bg-[hsl(215,18%,18%)] border border-[hsl(215,15%,22%)]"
            }`}>
              <p className="text-sm text-white">{msg.text}</p>
              <p className={`text-[10px] mt-1 uppercase tracking-wider ${
                msg.from === "travnr" ? "text-primary/60" : "text-[hsl(210,15%,50%)]"
              }`}>
                {msg.from === "travnr" ? "TRAVNR" : "USER"}
              </p>
            </div>
          </div>
        ))}
        {step < messages.length && step >= 0 && (
          <div className={`flex ${messages[Math.min(step + 1, messages.length - 1)]?.from === "user" ? "justify-end" : "justify-start"} mt-2`}>
            <WaveformBars label={step % 2 === 0 ? "Listening" : "Speaking"} />
          </div>
        )}
      </div>
    </Card>
  );
}

function CallbackForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !email) return;
    setLoading(true);
    try {
      await apiRequest("POST", "/api/callback-request", { name, phone, email });
      trackEvent("call_requested", { source: "travelers" });
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card className="max-w-md mx-auto p-8">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
            <Check className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="font-semibold tracking-tight" data-testid="text-callback-success">You're on the list.</p>
          <p className="text-sm text-muted-foreground">Expect a call from Travnr in the next few minutes. We'll email a setup link too.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto p-6 sm:p-7">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Phone className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold tracking-tight" data-testid="text-callback-title">Get a call now</h3>
          <p className="text-xs text-muted-foreground">Live in 30 seconds.</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Your name</label>
          <Input
            type="text"
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-testid="input-callback-name"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Phone number</label>
          <PhoneInput
            value={phone}
            onChange={setPhone}
            data-testid="input-callback-phone"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email address</label>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="input-callback-email"
          />
        </div>
        <Button className="w-full" disabled={loading} data-testid="button-callback-submit">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Call me now
          {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
        </Button>
        <p className="text-[11px] text-muted-foreground text-center pt-1">
          No card required. Beta access is free.
        </p>
      </form>
    </Card>
  );
}

const steps = [
  { num: "1", title: "Pick up", description: "Tap a button. Travnr calls you in under 30 seconds.", icon: Phone },
  { num: "2", title: "Two-minute brief", description: "Tell us where, when, and what matters. We'll handle the rest.", icon: MapPin },
  { num: "3", title: "Book in one click", description: "Get a short, curated set of options in your inbox. Tap to confirm.", icon: Plane },
];

const benefits = [
  {
    icon: Bell,
    title: "We watch every flight",
    description: "Travnr tracks weather, on-time history, and live air traffic for every booking. You'll know about disruption before anyone at the gate does.",
  },
  {
    icon: Phone,
    title: "Switched before the scramble",
    description: "When delay or cancellation risk crosses 70%, we call or text you with two pre-vetted alternatives. Tap one. Done before the line forms at the desk.",
  },
  {
    icon: Lock,
    title: "Private by default",
    description: "Your trip details are yours. We don't sell data and we don't run ads.",
  },
];

const faqs = [
  {
    q: "What is Travnr?",
    a: "Travnr is an AI travel concierge. Take a quick AI phone call, share where you want to go, and get back tailored flight and trip options you can book in one click.",
  },
  {
    q: "How is it different from a regular travel site?",
    a: "Instead of comparing dozens of tabs, you talk for about two minutes and Travnr's AI does the searching. You get a short, curated set of options instead of a wall of results.",
  },
  {
    q: "How long does the AI call take?",
    a: "Most calls take about two minutes. We ask where you're going, when, and what matters to you (budget, direct flights, hotel style, etc.).",
  },
  {
    q: "Is this really AI, or a human travel agent?",
    a: "The phone call and trip option generation are powered by AI. A human team handles edge cases when needed.",
  },
  {
    q: "How much does it cost?",
    a: "Trying Travnr and getting trip options is free. You only pay for flights or other travel you choose to book.",
  },
  {
    q: "Can I book through Travnr?",
    a: "Yes. Pick an option and book it through Travnr with secure payment. You'll get a confirmation email with your booking details.",
  },
  {
    q: "Is my information private?",
    a: "Yes. We only use what you share to plan your trip and operate the service. See our Privacy Policy for details.",
  },
  {
    q: "How do I get help?",
    a: "Email hello@travnr.com any time. We respond personally, usually within a few hours.",
  },
];

export default function TravelersPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center" data-testid="link-travelers-logo">
            <span className="font-semibold text-lg tracking-tight">Travnr</span>
          </Link>
          <div className="hidden sm:flex items-center gap-1">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="link-home">Home</Button>
            </Link>
            <Link href="/agencies">
              <Button variant="ghost" size="sm" data-testid="link-for-agencies">For agencies</Button>
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

      <section className="relative py-16 sm:py-24 md:py-28">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 mb-6 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
            Your AI travel concierge
          </div>
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight mb-6 leading-[1.05] break-words"
            data-testid="text-travelers-headline"
          >
            Your next{" "}
            <span className="inline-block min-w-[3ch]">
              <TypingAnimation />
            </span>
            <span className="block">planned in one phone call.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            No tabs. No spreadsheets. No hold music. Travnr calls you, asks two minutes of questions, and sends back the trip you'd have built yourself, if you had the time.
          </p>
        </div>
        <div className="max-w-6xl mx-auto px-4">
          <CallbackForm />
        </div>
      </section>

      <section className="border-y border-border bg-muted/30 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-xs font-medium text-primary uppercase tracking-wider mb-3">How it works</p>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Two minutes from idea to booked.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.num} className="flex flex-col items-center text-center" data-testid={`card-step-${s.num}`}>
                <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center mb-4 relative">
                  <s.icon className="w-5 h-5 text-primary" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center tabular-nums">{s.num}</span>
                </div>
                <h3 className="font-semibold tracking-tight mb-1" data-testid={`text-step-title-${s.num}`}>{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-[26ch]">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <p className="text-xs font-medium text-primary uppercase tracking-wider mb-3">The call</p>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
                It feels like talking to a person. Because it should.
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Travnr's voice agent listens, asks the right follow-ups, and writes everything down. No menus. No "press 1 for international." Just a conversation that ends with your trip booked.
              </p>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">Understands accents, preferences, and the way you actually talk.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">Remembers your prior trips, loyalty programs, and seat preferences.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">Sends you a written summary you can review before anything books.</span>
                </li>
              </ul>
            </div>
            <div>
              <VoiceAnimation />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-muted/30 py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12 sm:mb-16">
            <p className="text-xs font-medium text-primary uppercase tracking-wider mb-3">After you book</p>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              The part most apps forget.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {benefits.map((b, i) => (
              <Card key={b.title} className="p-6 sm:p-8" data-testid={`card-benefit-${i}`}>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
                  <b.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold tracking-tight mb-2">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24" data-testid="section-faq">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">Questions, answered.</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Quick answers about the AI call, pricing, and what happens after you book.
            </p>
          </div>
          <Accordion type="single" collapsible className="w-full" data-testid="accordion-faq">
            {faqs.map((item, i) => (
              <AccordionItem key={item.q} value={`faq-${i}`} data-testid={`faq-item-${i}`}>
                <AccordionTrigger className="text-left" data-testid={`faq-question-${i}`}>
                  {item.q}
                </AccordionTrigger>
                <AccordionContent data-testid={`faq-answer-${i}`}>
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-sm tracking-tight">Travnr</span>
            <span className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <a href="mailto:hello@travnr.com" className="hover:text-foreground transition-colors" data-testid="link-contact-footer">Contact</a>
            <Link href="/privacy" className="hover:text-foreground transition-colors" data-testid="link-privacy">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors" data-testid="link-terms">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
