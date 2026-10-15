import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ConsistFit",
    short_name: "ConsistFit",
    description: "Train consistently. Progress confidently.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#0a1a33",
    theme_color: "#0a1a33",
    icons: [
      {
        src: "/pwa-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/pwa-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
