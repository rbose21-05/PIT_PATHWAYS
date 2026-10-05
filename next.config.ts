import type { NextConfig } from "next";

function pagesBasePath() {
  const value = process.env.BASE_PATH?.trim();
  if (!value || value === "/") return undefined;
  return value.startsWith("/") ? value : `/${value}`;
}

const nextConfig: NextConfig = {
  // Static files in `out/`, which GitHub Pages can host.
  output: "export",
  basePath: pagesBasePath(),
  // The dev server is opened at 127.0.0.1 while Next listens on 0.0.0.0.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
