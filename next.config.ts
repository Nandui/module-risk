import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  experimental: {
    // Register → detail uses the View Transitions API (see useViewTransition).
    viewTransition: true,
  },
  // puppeteer-core is only ever imported from the Node runtime PDF route.
  serverExternalPackages: ["puppeteer-core"],
};

export default nextConfig;
