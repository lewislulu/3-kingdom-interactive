/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@sgyy/schema"],
  allowedDevOrigins: ["127.0.0.1", "localhost"]
};

export default nextConfig;
