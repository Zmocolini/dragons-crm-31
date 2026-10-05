import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dezactivat: în dev, StrictMode dublează render-urile & efectele → lag simțit pe
  // orice interacțiune (click select, focus, hover). Impact zero în producție.
  reactStrictMode: false,
};

export default nextConfig;
// build 2026-09-23-owner-scope-v3
