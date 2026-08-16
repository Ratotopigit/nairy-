import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      ],
    }];
  },
  images: {
    unoptimized: true,
  },
  webpack(config, { webpack }) {
    config.resolve.alias.pptxgenjs = path.join(
      projectDir,
      "node_modules/pptxgenjs/dist/pptxgen.bundle.js",
    );
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^node:(fs|https)$/,
        path.join(projectDir, "lib/empty-node-module.js"),
      ),
    );
    return config;
  },
};

export default nextConfig;
