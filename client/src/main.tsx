import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";
import { initSentry } from "./lib/sentry";
import { initAnalytics } from "./lib/analytics";

// Both helpers internally no-op outside production, when Do Not Track is on,
// or when the relevant DSN/key env var is missing.
initSentry();
initAnalytics();

// HelmetProvider lets every page declare its own <title>, meta tags,
// and canonical URL via the <SEO> wrapper in `components/seo.tsx`.
// One provider for the whole app — never mount it inside a route.
createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>,
);
