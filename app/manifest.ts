import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LifeOS",
    short_name: "LifeOS",
    description: "Your personal fitness and wellness companion.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#faf7f4",
    theme_color: "#faf7f4",
    icons: [
      {
        src: "/lifeos-logo.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
