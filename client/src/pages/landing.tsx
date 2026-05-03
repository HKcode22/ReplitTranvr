import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/phone-input";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sparkles, ArrowRight, Phone, FileText, CalendarDays, Shield, Globe, Mic, Check, Loader2,
  MapPin, Plane, Star, Menu, LogIn, LifeBuoy, Settings2,
} from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";


const WORDS = ["trip", "vacation", "excursion", "getaway", "work trip", "weekend", "honeymoon"];

// Mobile-only landing header menu (Sign in / Manage a Trip / Contact us).
function MobileLandingMenu() {
  const [, navigate] = useLocation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu" data-testid="button-landing-menu">
          <Menu className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={() => navigate("/auth")} data-testid="menu-landing-sign-in">
          <LogIn className="w-4 h-4 mr-2" /> Sign in
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/manage-trip")} data-testid="menu-landing-manage-trip">
          <Settings2 className="w-4 h-4 mr-2" /> Manage a Trip
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate("/contact")} data-testid="menu-landing-contact">
          <LifeBuoy className="w-4 h-4 mr-2" /> Contact us
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
      className="w-full max-w-md mx-auto bg-[hsl(215,25%,12%)] dark:bg-[hsl(215,25%,8%)] border-[hsl(215,20%,18%)] overflow-visible"
      role="region"
      aria-label="Sample concierge call demo"
    >
      <div className="p-3 sm:p-4 border-b border-[hsl(215,20%,18%)] flex items-center gap-3">
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
      <div className="p-3 sm:p-4 space-y-3 min-h-[260px] sm:min-h-[280px]">
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
      trackEvent("call_requested", { source: "landing" });
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card className="max-w-md mx-auto p-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
            <Check className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="font-medium" data-testid="text-callback-success">We'll be in touch!</p>
          <p className="text-sm text-muted-foreground">Expect a call shortly. We'll also send you an email to create your account.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto p-6 bg-[hsl(207,50%,98%)] dark:bg-[hsl(210,25%,14%)] border-[hsl(207,45%,88%)] dark:border-[hsl(210,20%,22%)]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-[hsl(207,55%,90%)] dark:bg-[hsl(210,30%,22%)] border border-[hsl(207,50%,82%)] dark:border-[hsl(210,25%,30%)] flex items-center justify-center">
          <Phone className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold" data-testid="text-callback-title">Request a Call</h3>
          <p className="text-sm text-muted-foreground">We'll call you right away</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Your name</label>
          <Input
            type="text"
            placeholder="John Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-testid="input-callback-name"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Phone number</label>
          <PhoneInput
            value={phone}
            onChange={setPhone}
            data-testid="input-callback-phone"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Email address</label>
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
          Get a Call
          {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
        </Button>
      </form>
    </Card>
  );
}


const features = [
  { icon: Phone, title: "AI concierge call", description: "A 2-minute AI phone call captures where you want to go, when, and what matters to you." },
  { icon: FileText, title: "Curated trip options", description: "Get a short, AI-curated set of flight and trip options instead of a wall of search results." },
  { icon: CalendarDays, title: "Travel calendar", description: "See every upcoming trip at a glance in a clean monthly calendar." },
  { icon: Shield, title: "Secure booking", description: "Book the option you like with secure payment, and get a confirmation by email." },
  { icon: Globe, title: "Traveler profile", description: "Save your preferences and travel style so the AI tailors options to you." },
  { icon: Sparkles, title: "End-to-end planning", description: "From the first AI call to the day you fly, Travnr keeps the trip details in one place." },
];

const steps = [
  { num: "1", title: "Tell us where", description: "Request a quick AI call and share your destination and dates", icon: MapPin },
  { num: "2", title: "AI calls you", description: "Our AI concierge dials you in seconds for a 2-minute chat", icon: Phone },
  { num: "3", title: "Review & book", description: "Get tailored trip options and book the one you like", icon: Plane },
];

const faqs = [
  {
    q: "What is Travnr?",
    a: "Travnr is an AI travel concierge. You take a quick AI phone call, share where you want to go, and we send back tailored flight and trip options you can review and book.",
  },
  {
    q: "How is Travnr different from a regular travel site?",
    a: "Instead of clicking through dozens of tabs and filters, you talk for about 2 minutes and Travnr's AI does the searching for you. You get a short, curated set of options instead of a wall of results.",
  },
  {
    q: "How long does the AI call take?",
    a: "Most calls take about 2 minutes. We ask where you're going, when, and what matters to you (budget, direct flights, etc.).",
  },
  {
    q: "Is Travnr really AI, or is it a human travel agent?",
    a: "The phone call and the trip option generation are powered by AI. A human team reviews edge cases and helps with anything tricky during this beta.",
  },
  {
    q: "How much does Travnr cost?",
    a: "Trying Travnr and getting trip options is free during beta. You only pay for flights or other travel you choose to book.",
  },
  {
    q: "Can I book through Travnr?",
    a: "Yes. When you pick an option you like, you can book it through Travnr with secure payment. You'll get a confirmation email with your booking details.",
  },
  {
    q: "Is my information private?",
    a: "Yes. We only use the information you share to plan your trip and operate the service. See our Privacy Policy for details.",
  },
  {
    q: "How do I get help?",
    a: "Email hello@travnr.com any time. During beta we respond personally — usually within a few hours.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Homepage <title>, meta description, canonical, OG, Twitter, and
          JSON-LD structured data are all defined statically in
          `client/index.html` so crawlers see them in the initial HTML
          response. Non-home routes manage their own head via the <SEO>
          wrapper. */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center" data-testid="link-landing-logo">
            <span className="font-serif font-semibold text-lg">Travnr</span>
          </Link>
          <div className="hidden sm:flex items-center gap-2">
            <Link href="/manage-trip">
              <Button variant="ghost" size="sm" data-testid="link-manage-trip">Manage a Trip</Button>
            </Link>
            <Link href="/auth">
              <Button data-testid="button-sign-in">Sign In</Button>
            </Link>
          </div>

          <div className="sm:hidden">
            <MobileLandingMenu />
          </div>
        </div>
        <div className="h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      </header>

      <section className="relative overflow-hidden py-14 sm:py-20 md:py-28">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-1/4 w-72 h-72 bg-primary/8 rounded-full blur-3xl animate-pulse motion-reduce:animate-none" style={{ animationDuration: "4s" }} aria-hidden="true" />
          <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse motion-reduce:animate-none" style={{ animationDuration: "6s" }} aria-hidden="true" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
          <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <Badge variant="outline" className="border-0 bg-primary/10 text-primary mb-6 px-4 py-1.5">
              <Sparkles className="w-3 h-3 mr-1.5" />
              AI Travel Concierge
            </Badge>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 opacity-0 animate-fade-in-up break-words" style={{ animationDelay: "0.3s" }}>
            Your{" "}
            <span className="inline-block min-w-[3ch]">
              <TypingAnimation />
            </span>
            <span className="block">planned through one quick AI call</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
            Travnr is your AI travel concierge. Take a 2-minute AI phone call and get tailored flight and trip options — no endless tabs, no comparison spreadsheets.
          </p>
        </div>
        <div className="max-w-6xl mx-auto px-4 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.7s" }}>
          <CallbackForm />
        </div>
      </section>

      <section className="py-16 border-y bg-[hsl(207,60%,96%)] dark:bg-[hsl(210,30%,12%)]">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={s.num} className="flex flex-col items-center text-center opacity-0 animate-fade-in-up" style={{ animationDelay: `${0.2 + i * 0.2}s` }} data-testid={`card-step-${s.num}`}>
                <div className="w-14 h-14 rounded-2xl bg-[hsl(207,55%,90%)] dark:bg-[hsl(210,30%,20%)] border border-[hsl(207,50%,82%)] dark:border-[hsl(210,25%,28%)] flex items-center justify-center mb-4 relative">
                  <s.icon className="w-6 h-6 text-primary" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{s.num}</span>
                </div>
                <h3 className="font-semibold mb-1" data-testid={`text-step-title-${s.num}`}>{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20 max-w-6xl mx-auto px-4">
        <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4">How the AI travel call works</h2>
        <p className="text-muted-foreground text-center mb-8 sm:mb-12 max-w-lg mx-auto">A quick 2-minute conversation — here's what it sounds like.</p>
        <VoiceAnimation />
      </section>

      <section className="py-20 bg-[hsl(207,60%,96%)] dark:bg-[hsl(210,30%,12%)]">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-center mb-4">Travel planning without endless tabs</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-lg mx-auto">Why travelers use Travnr as their AI travel planner.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <Card key={f.title} className="p-6 hover-elevate opacity-0 animate-fade-in-up bg-[hsl(207,50%,98%)] dark:bg-[hsl(210,25%,15%)] border-[hsl(207,45%,88%)] dark:border-[hsl(210,20%,22%)]" style={{ animationDelay: `${0.1 + i * 0.1}s` }} data-testid={`card-feature-${i}`}>
                <div className="w-10 h-10 rounded-lg bg-[hsl(207,55%,90%)] dark:bg-[hsl(210,30%,22%)] border border-[hsl(207,50%,82%)] dark:border-[hsl(210,25%,30%)] flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2" data-testid={`text-feature-title-${i}`}>{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 border-t" data-testid="section-stats">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 text-center">
          <div className="rounded-xl bg-[hsl(207,50%,97%)] dark:bg-[hsl(210,25%,14%)] border border-[hsl(207,45%,90%)] dark:border-[hsl(210,20%,22%)] p-4 sm:p-5" data-testid="stat-availability">
            <p className="text-2xl sm:text-3xl font-bold text-primary tabular-nums">24/7</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Concierge Available</p>
          </div>
          <div className="rounded-xl bg-[hsl(207,50%,97%)] dark:bg-[hsl(210,25%,14%)] border border-[hsl(207,45%,90%)] dark:border-[hsl(210,20%,22%)] p-4 sm:p-5" data-testid="stat-airlines">
            <p className="text-2xl sm:text-3xl font-bold text-primary tabular-nums">100+</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Airlines Covered</p>
          </div>
          <div className="rounded-xl bg-[hsl(207,50%,97%)] dark:bg-[hsl(210,25%,14%)] border border-[hsl(207,45%,90%)] dark:border-[hsl(210,20%,22%)] p-4 sm:p-5" data-testid="stat-pickup">
            <p className="text-2xl sm:text-3xl font-bold text-primary tabular-nums">30s</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Avg. Call Pickup</p>
          </div>
          <div className="rounded-xl bg-[hsl(207,50%,97%)] dark:bg-[hsl(210,25%,14%)] border border-[hsl(207,45%,90%)] dark:border-[hsl(210,20%,22%)] p-4 sm:p-5" data-testid="stat-rating">
            <div className="flex items-center justify-center gap-0.5">
              {[1,2,3,4,5].map(s => <Star key={s} className="w-5 h-5 text-primary fill-primary" />)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Traveler Rated</p>
          </div>
        </div>
      </section>

      <section className="py-20 relative overflow-hidden bg-[hsl(207,60%,96%)] dark:bg-[hsl(210,30%,12%)]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[80px]" aria-hidden="true" />
        </div>
        <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">Ready to plan your next trip with AI?</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">Take a 2-minute AI call and get tailored trip options. Your next trip is one phone call away.</p>
          <Link href="/auth">
            <Button size="lg" data-testid="button-start-planning">
              Start Planning
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <section className="py-16 sm:py-20 border-t" data-testid="section-faq">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-center mb-3">Frequently asked questions</h2>
          <p className="text-muted-foreground text-center mb-10 max-w-lg mx-auto">
            Quick answers about Travnr — our AI travel concierge, the AI call, pricing, and bookings.
          </p>
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

      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="font-serif font-semibold text-sm">Travnr</span>
            <span className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <a href="mailto:hello@travnr.com" className="hover:underline" data-testid="link-contact-footer">Contact</a>
            <Link href="/privacy" className="hover:underline" data-testid="link-privacy">Privacy</Link>
            <Link href="/terms" className="hover:underline" data-testid="link-terms">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
