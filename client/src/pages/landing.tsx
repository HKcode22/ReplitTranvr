import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plane, Shield, Globe, Menu, LogIn, LifeBuoy, Settings2, ArrowRight, Check, Home, Briefcase,
} from "lucide-react";

function NotificationStack() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timings = [1500, 2500, 2500, 1500];
    let cur = 0;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      cur = (cur + 1) % 4;
      setStage(cur);
      timer = setTimeout(tick, timings[cur]);
    };

    timer = setTimeout(tick, timings[0]);
    return () => clearTimeout(timer);
  }, []);

  const travnrVisible = stage >= 1;
  const cancelVisible = stage >= 2;

  return (
    <div
      className="max-w-sm mx-auto space-y-3 min-h-[260px] sm:min-h-[280px]"
      role="img"
      aria-label="Travnr alert arrives 47 minutes before a flight cancellation, with the rebooking already done."
    >
      <div
        className={`transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${
          travnrVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        }`}
      >
        <div className="rounded-2xl bg-card border border-primary/40 shadow-xl p-3.5 text-left">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground text-xs font-bold tracking-tight">T</span>
            </div>
            <span className="text-xs font-semibold tracking-tight">Travnr</span>
            <span className="text-[11px] text-muted-foreground ml-auto tabular-nums">47 min ago</span>
          </div>
          <p className="text-sm font-semibold leading-snug">Switched you to UA472</p>
          <p className="text-xs text-muted-foreground leading-snug mt-0.5">
            73% delay risk on UA487. New flight departs 7:50am. Tap to view.
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <div className="w-4 h-4 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
            </div>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Rebooked</span>
          </div>
        </div>
      </div>

      <div
        className={`transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${
          cancelVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="rounded-2xl bg-card border border-destructive/30 shadow-lg p-3.5 text-left">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-destructive/15 flex items-center justify-center shrink-0">
              <Plane className="w-3.5 h-3.5 text-destructive" />
            </div>
            <span className="text-xs font-semibold tracking-tight">United Airlines</span>
            <span className="text-[11px] text-muted-foreground ml-auto">just now</span>
          </div>
          <p className="text-sm font-semibold leading-snug line-through decoration-destructive decoration-2 underline-offset-2">
            Flight UA487 cancelled
          </p>
          <p className="text-xs text-muted-foreground leading-snug mt-0.5">
            We apologize for the inconvenience. See our app for rebooking options.
          </p>
        </div>
      </div>
    </div>
  );
}

function MobileLandingMenu() {
  const [, navigate] = useLocation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu" data-testid="button-landing-menu">
          <Menu className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={() => navigate("/")} data-testid="menu-landing-home">
          <Home className="w-4 h-4 mr-2" /> Home
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/travelers")} data-testid="menu-landing-travelers">
          <Plane className="w-4 h-4 mr-2" /> For travelers
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/agencies")} data-testid="menu-landing-agencies">
          <Briefcase className="w-4 h-4 mr-2" /> For agencies
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/manage-trip")} data-testid="menu-landing-manage-trip">
          <Settings2 className="w-4 h-4 mr-2" /> Manage a trip
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/contact")} data-testid="menu-landing-contact">
          <LifeBuoy className="w-4 h-4 mr-2" /> Contact us
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate("/auth")} data-testid="menu-landing-sign-in">
          <LogIn className="w-4 h-4 mr-2" /> Sign in
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const features = [
  {
    icon: Plane,
    title: "Booked in two minutes",
    description:
      "Describe your trip on a quick AI call. Get curated flight and hotel options. Book in one click.",
  },
  {
    icon: Shield,
    title: "Disruption, predicted",
    description:
      "We monitor weather, on-time history, and live air traffic for every flight. When risk crosses 70%, we call you with alternatives ready, before everyone else scrambles.",
  },
  {
    icon: Globe,
    title: "Solo to scale",
    description:
      "One platform, two modes. For individual travelers and the agencies who manage thousands of trips.",
  },
];

const metrics = [
  { value: "2 min", label: "to plan a trip" },
  { value: "24/7", label: "disruption monitoring" },
  { value: "0", label: "hold music" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center" data-testid="link-landing-logo">
            <span className="font-semibold text-lg tracking-tight">Travnr</span>
          </Link>
          <div className="hidden sm:flex items-center gap-2">
            <Link href="/travelers">
              <Button variant="ghost" size="sm" data-testid="link-for-travelers">For travelers</Button>
            </Link>
            <Link href="/agencies">
              <Button variant="ghost" size="sm" data-testid="link-for-agencies">For agencies</Button>
            </Link>
            <Link href="/manage-trip">
              <Button variant="ghost" size="sm" data-testid="link-manage-trip">Manage a trip</Button>
            </Link>
            <Link href="/auth">
              <Button size="sm" data-testid="button-sign-in">Sign in</Button>
            </Link>
          </div>
          <div className="sm:hidden">
            <MobileLandingMenu />
          </div>
        </div>
      </header>

      <section className="relative py-16 sm:py-24 md:py-28">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h1
            className="text-3xl sm:text-5xl md:text-6xl font-semibold tracking-tight mb-6 leading-[1.1] text-balance"
            data-testid="text-home-headline"
          >
            Your flight just got cancelled.
            <span className="block text-primary">
              We rebooked you{" "}
              <span className="whitespace-nowrap">47 minutes ago.</span>
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Travnr is the AI travel concierge that watches every flight in real time and gets you on the next one, before the cancellation ever hits your phone.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12 sm:mb-14">
            <Link href="/travelers">
              <Button size="lg" className="w-full sm:w-auto min-w-[180px]" data-testid="button-home-traveler">
                For travelers
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/agencies">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto min-w-[180px]"
                data-testid="button-home-agency"
              >
                For agencies
              </Button>
            </Link>
          </div>
          <NotificationStack />
        </div>
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
          <div className="grid grid-cols-3 gap-4 sm:gap-8">
            {metrics.map((m) => (
              <div key={m.label} className="text-center" data-testid={`metric-${m.label.replace(/\s+/g, "-")}`}>
                <p className="text-2xl sm:text-4xl font-semibold tracking-tight tabular-nums">{m.value}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="max-w-2xl mb-12 sm:mb-16">
            <p className="text-sm font-medium text-primary mb-3 uppercase tracking-wider">What you get</p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
              The agent that never sleeps, never queues, never forgets.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We replaced the worst parts of travel: the planning, the waiting, the rebooking. With software that's always on.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {features.map((f, i) => (
              <Card
                key={f.title}
                className="p-6 sm:p-8 hover:border-primary/40 transition-colors"
                data-testid={`card-home-feature-${i}`}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2 tracking-tight" data-testid={`text-home-feature-title-${i}`}>
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-muted/30 py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Card className="p-8 sm:p-10 flex flex-col" data-testid="card-split-travelers">
              <p className="text-xs font-medium text-primary uppercase tracking-wider mb-3">For travelers</p>
              <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3">
                Skip the planning. Skip the hold music.
              </h3>
              <p className="text-muted-foreground mb-8 leading-relaxed flex-1">
                One AI call, curated options, automatic rebooking. Like having a great travel agent on speed dial. Except they pick up in under two seconds.
              </p>
              <Link href="/travelers">
                <Button data-testid="button-split-travelers">
                  See how it works <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </Card>
            <Card className="p-8 sm:p-10 flex flex-col" data-testid="card-split-agencies">
              <p className="text-xs font-medium text-primary uppercase tracking-wider mb-3">For agencies</p>
              <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3">
                Give your team an AI ops layer.
              </h3>
              <p className="text-muted-foreground mb-8 leading-relaxed flex-1">
                Travnr watches every booking in your portfolio, flags disruptions before your travelers do, and handles the rebooking your agents would have to do manually.
              </p>
              <Link href="/agencies">
                <Button variant="outline" data-testid="button-split-agencies">
                  Talk to us <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-24 sm:py-32">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight mb-6 leading-tight">
            Stop managing travel. Start arriving.
          </h2>
          <p className="text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
            Two minutes to set up. No card required.
          </p>
          <Link href="/travelers">
            <Button size="lg" data-testid="button-home-cta-final">
              Get started <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
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
