import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

// The docs are published to GitHub Pages under a project sub-path
// (https://malikons.github.io/dashdotplus/), so every asset and internal link
// has to carry that prefix. A custom domain later on would serve from the root,
// which is what an empty value gives you - hence the env override rather than a
// hard-coded path.
const basePath = process.env.DOC_BASE_PATH ?? '';

/** @type {import('next').NextConfig} */
const config = {
  serverExternalPackages: ['@takumi-rs/image-response'],

  output: 'export',
  basePath,
  assetPrefix: basePath || undefined,
  // Static export: Next rewrites image and link URLs inside MDX, but not raw
  // <img> and <a> tags in the landing page component, so that page has to know
  // the prefix itself. NEXT_PUBLIC_ is inlined into the client bundle at build
  // time, which is what makes it usable from a 'use client' component.
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
};

export default withMDX(config);
