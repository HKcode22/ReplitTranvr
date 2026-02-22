import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/phone-input";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sparkles, ArrowRight, Phone, FileText, CalendarDays, Shield, Globe, Mic, Check, Loader2,
  MapPin, Plane, Star,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";


const WORDS = ["trip", "vacation", "excursion", "getaway", "work trip", "weekend", "honeymoon"];

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
      <span className="animate-blink-caret border-r-2 border-primary ml-0.5">&nbsp;</span>
    </span>
  );
}

function WaveformBars({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-0.5 bg-emerald-400 rounded-full animate-waveform"
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

  return (
    <Card className="max-w-sm mx-auto bg-[hsl(215,25%,12%)] dark:bg-[hsl(215,25%,8%)] border-[hsl(215,20%,18%)] overflow-visible">
      <div className="p-4 border-b border-[hsl(215,20%,18%)] flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <Mic className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">Travnr Concierge</p>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${callStatus === "Call in progress" ? "bg-emerald-400" : "bg-amber-400"}`} />
            <p className="text-[11px] text-[hsl(210,15%,60%)]">{callStatus}</p>
          </div>
        </div>
      </div>
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
  { icon: Phone, title: "Personal Concierge Calls", description: "Speak with a real travel concierge who understands your preferences and handles every detail." },
  { icon: FileText, title: "Curated Itineraries", description: "Receive custom travel proposals with flights, hotels, and activities tailored to you." },
  { icon: CalendarDays, title: "Travel Calendar", description: "View all your upcoming trips at a glance with an intuitive calendar view." },
  { icon: Shield, title: "Secure Payments", description: "Pay for approved itineraries directly through the platform with secure processing." },
  { icon: Globe, title: "Traveler Profile", description: "Save your preferences, loyalty programs, and travel style for personalized service." },
  { icon: Sparkles, title: "End-to-End Management", description: "From the first call to your last day of travel, we manage the entire journey." },
];

const steps = [
  { num: "1", title: "Tell us where", description: "Share your destination and dates", icon: MapPin },
  { num: "2", title: "We call you", description: "Our concierge dials you in seconds", icon: Phone },
  { num: "3", title: "Review & book", description: "Get a custom proposal and book instantly", icon: Plane },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center" data-testid="link-landing-logo">
            <span className="font-serif font-semibold text-lg">Travnr</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/auth">
              <Button data-testid="button-sign-in">Sign In</Button>
            </Link>
          </div>
        </div>
        <div className="h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      </header>

      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-1/4 w-72 h-72 bg-primary/8 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "4s" }} />
          <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "6s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
          <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <Badge variant="outline" className="border-0 bg-primary/10 text-primary mb-6 px-4 py-1.5">
              <Sparkles className="w-3 h-3 mr-1.5" />
              Your Personal Travel Concierge
            </Badge>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            We help you book your{" "}
            <span className="block">
              <TypingAnimation />
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
            Skip the endless searching. Tell us where you want to go, and our concierge team handles every detail.
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

      <section className="py-20 max-w-6xl mx-auto px-4">
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-center mb-4">Like having a travel agent on speed dial</h2>
        <p className="text-muted-foreground text-center mb-12 max-w-lg mx-auto">See how a typical concierge conversation works</p>
        <VoiceAnimation />
      </section>

      <section className="py-20 bg-[hsl(207,60%,96%)] dark:bg-[hsl(210,30%,12%)]">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-center mb-4">Everything you need</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-lg mx-auto">A complete platform for managing your travel</p>
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
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="rounded-xl bg-[hsl(207,50%,97%)] dark:bg-[hsl(210,25%,14%)] border border-[hsl(207,45%,90%)] dark:border-[hsl(210,20%,22%)] p-5" data-testid="stat-availability">
            <p className="text-3xl font-bold text-primary">24/7</p>
            <p className="text-sm text-muted-foreground mt-1">Concierge Available</p>
          </div>
          <div className="rounded-xl bg-[hsl(207,50%,97%)] dark:bg-[hsl(210,25%,14%)] border border-[hsl(207,45%,90%)] dark:border-[hsl(210,20%,22%)] p-5" data-testid="stat-airlines">
            <p className="text-3xl font-bold text-primary">100+</p>
            <p className="text-sm text-muted-foreground mt-1">Airlines Covered</p>
          </div>
          <div className="rounded-xl bg-[hsl(207,50%,97%)] dark:bg-[hsl(210,25%,14%)] border border-[hsl(207,45%,90%)] dark:border-[hsl(210,20%,22%)] p-5" data-testid="stat-pickup">
            <p className="text-3xl font-bold text-primary">30s</p>
            <p className="text-sm text-muted-foreground mt-1">Avg. Call Pickup</p>
          </div>
          <div className="rounded-xl bg-[hsl(207,50%,97%)] dark:bg-[hsl(210,25%,14%)] border border-[hsl(207,45%,90%)] dark:border-[hsl(210,20%,22%)] p-5" data-testid="stat-rating">
            <div className="flex items-center justify-center gap-0.5">
              {[1,2,3,4,5].map(s => <Star key={s} className="w-5 h-5 text-primary fill-primary" />)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Traveler Rated</p>
          </div>
        </div>
      </section>

      <section className="py-20 relative overflow-hidden bg-[hsl(207,60%,96%)] dark:bg-[hsl(210,30%,12%)]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[80px]" />
        </div>
        <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">Ready to transform how you travel?</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">Join Travnr and let our concierge team handle the details. Your next adventure is just a phone call away.</p>
          <Link href="/auth">
            <Button size="lg" data-testid="button-start-planning">
              Start Planning
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="font-serif font-semibold text-sm">Travnr</span>
            <span className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <a href="#" className="hover:underline" data-testid="link-privacy">Privacy</a>
            <a href="#" className="hover:underline" data-testid="link-terms">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
