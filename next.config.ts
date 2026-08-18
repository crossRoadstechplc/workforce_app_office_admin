import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const portalRoot = path.dirname(fileURLToPath(import.meta.url));
const backend = (process.env.BACKEND_API_BASE_URL ?? "http://localhost:4000/api/v1").replace(/\/$/, "");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" }
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: { root: portalRoot },
  async rewrites() {
    return [{ source: "/backend/:path*", destination: `${backend}/:path*` }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  }
};

export default nextConfig;
