/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [],
  },
  serverExternalPackages: ['@napi-rs/canvas', 'sharp'],
}

export default nextConfig
