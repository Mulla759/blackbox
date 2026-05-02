import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";

/** Ensure `.env` / `.env.local` are loaded before Next evaluates config or bundles routes. */
loadEnvConfig(process.cwd());

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
