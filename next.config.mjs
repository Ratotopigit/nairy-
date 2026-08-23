import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  reactStrictMode: true,
  poweredByHeader: false,
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
