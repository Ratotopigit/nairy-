import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.NODE_ENV === "production" ? { output: "export" } : {}),
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Turbopack handles barrel file tree-shaking natively.
  // Do NOT add optimizePackageImports here — with Turbopack it forces a full
  // pre-scan of all 3,442 lucide-react icon files at startup, causing a
  // 60+ second "Ready" time.

  // ── Turbopack (next dev --turbo) ──────────────────────────────────────────
  // Only active in dev with --turbo. Webpack config below is used for builds.
  turbopack: {
    resolveAlias: {
      // Use the pre-built browser bundle — prevents Turbopack from trying to
      // resolve pptxgenjs's Node.js internals (fs, zlib, etc.)
      // NOTE: Turbopack resolveAlias requires relative paths from project root.
      pptxgenjs: "./node_modules/pptxgenjs/dist/pptxgen.bundle.js",
      "node:fs": "./lib/empty-node-module.js",
      "node:https": "./lib/empty-node-module.js",
    },
  },

  // ── Webpack (next build) ──────────────────────────────────────────────────
  webpack(config, { webpack, isServer }) {
    if (isServer) {
      // Don't bundle pptxgenjs or firebase on the server analysis pass
      const serverExternals = ["pptxgenjs", "firebase", "firebase/app",
        "firebase/auth", "firebase/firestore", "firebase/storage"];
      const existing = Array.isArray(config.externals)
        ? config.externals
        : [config.externals].filter(Boolean);
      config.externals = [
        ...existing,
        ({ request }, callback) => {
          if (serverExternals.some((e) => request === e || request.startsWith(e + "/"))) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
      ];
    } else {
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
    }
    return config;
  },
};

export default nextConfig;
