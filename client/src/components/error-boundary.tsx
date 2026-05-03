import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/report-error";

interface ErrorBoundaryProps {
  children: ReactNode;
  boundary?: string;
  fallback?: (args: { error: Error; reset: () => void }) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(error, {
      boundary: this.props.boundary || "anonymous",
      componentStack: info.componentStack,
    });
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback({ error: this.state.error, reset: this.reset });
      }
      return <DefaultErrorFallback onReset={this.reset} />;
    }
    return this.props.children;
  }
}

function DefaultErrorFallback({ onReset }: { onReset: () => void }) {
  const reload = () => {
    onReset();
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };
  const goHome = () => {
    onReset();
    if (typeof window !== "undefined") {
      window.location.assign("/");
    }
  };
  return (
    <div
      className="min-h-[60vh] w-full flex items-center justify-center p-6"
      data-testid="error-boundary-fallback"
      role="alert"
    >
      <div className="max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-amber-600" />
        </div>
        <h1 className="font-serif text-2xl font-bold mb-2" data-testid="text-error-boundary-title">
          Something went wrong
        </h1>
        <p className="text-muted-foreground mb-6">
          We hit an unexpected error. Try reloading the page, or head back home — your trip details are safe.
        </p>
        <div className="flex items-center justify-center gap-2">
          <Button onClick={reload} data-testid="button-error-reload" className="gap-1.5">
            <RefreshCw className="w-4 h-4" /> Reload
          </Button>
          <Button onClick={goHome} variant="outline" data-testid="button-error-home" className="gap-1.5">
            <Home className="w-4 h-4" /> Go home
          </Button>
        </div>
      </div>
    </div>
  );
}
