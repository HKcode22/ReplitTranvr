import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";

// HelmetProvider lets every page declare its own <title>, meta tags,
// and canonical URL via the <SEO> wrapper in `components/seo.tsx`.
// One provider for the whole app — never mount it inside a route.
createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>,
);
