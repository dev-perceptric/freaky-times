/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Small self-contained server for the Docker image.
  output: 'standalone',
  // Runs instrumentation.ts on start (keeps the AliExpress sign-in fresh).
  experimental: { instrumentationHook: true },
  // Product photos are ready-made WebP files on pub-cf5b5b1875ae4569a8c701274e2ae2bf.r2.dev (see lib/img.ts and scripts/make_sizes.py).
  // This image service is only the fallback for photos that don't have ready-made sizes yet.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'pub-cf5b5b1875ae4569a8c701274e2ae2bf.r2.dev' },
      { protocol: 'https', hostname: 'ae01.alicdn.com' },
    ],
    deviceSizes: [480, 768, 1080, 1600],
    imageSizes: [96, 160, 256],
    formats: ['image/webp'],
    minimumCacheTTL: 31536000,
  },
};

export default nextConfig;
