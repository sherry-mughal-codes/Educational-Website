/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable polling for file changes inside Docker if needed on Windows/WSL
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default nextConfig;
