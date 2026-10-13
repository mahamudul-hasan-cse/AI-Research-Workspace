import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Inlined at build time so the test-only chat sabotage hooks cannot be
  // switched on in a deployed build by setting a runtime variable.
  env: {
    NEXT_PUBLIC_ENABLE_CHAT_SABOTAGE:
      process.env.NEXT_PUBLIC_ENABLE_CHAT_SABOTAGE === "1" ? "1" : "0",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
