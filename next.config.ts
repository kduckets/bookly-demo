import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The default procedures are read from .md files at runtime; ship them with the server functions.
  outputFileTracingIncludes: {
    "/api/chat": ["./lib/agent/procedures/*.md"],
    "/api/procedures": ["./lib/agent/procedures/*.md"],
  },
};

export default nextConfig;
