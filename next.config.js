/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = nextConfig
module.exports = {
    // other Next.js config...
    api: {
      bodyParser: false, // Disables Next.js's automatic body parsing for API routes.
    },
  };
  