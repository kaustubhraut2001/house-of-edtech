import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow images from common avatar providers
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },

  // Ensure server-only packages are not bundled for the client
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;
