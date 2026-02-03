/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable Edge Runtime for better Vercel performance
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig
