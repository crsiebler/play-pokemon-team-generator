/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable webpack configuration for Turbopack
  // webpack: (config) => {
  //   config.resolve.fallback = { fs: false, net: false, tls: false };
  //   return config;
  // },
};

export default nextConfig;
