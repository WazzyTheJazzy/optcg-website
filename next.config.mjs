/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'en.onepiece-cardgame.com',
        pathname: '/images/cardlist/card/**',
      },
      {
        protocol: 'https',
        hostname: 'onepiece-cardgame.com',
      },
      {
        protocol: 'https',
        hostname: 'images.onepiece-cardgame.com',
      },
      {
        protocol: 'https',
        hostname: 'onepiece-cardgame.dev',
      },
    ],
  },
  // Allow CORS for Three.js texture loading
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS' },
        ],
      },
    ];
  },
};

export default nextConfig;
