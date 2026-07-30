import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  experimental: {
    // Register → detail uses the View Transitions API (see useViewTransition).
    viewTransition: true,
  },
  // Neither belongs in a client or edge bundle: puppeteer-core is only
  // imported from the Node runtime PDF routes, and Prisma ships a native
  // engine that cannot be bundled.
  serverExternalPackages: ["puppeteer-core", "@prisma/client", "bcryptjs"],
};

export default nextConfig;
