import type { MetadataRoute } from "next";

// SPEC R47: installable PWA.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bunk-o-Meter",
    short_name: "Bunk-o-Meter",
    description: "Know exactly how many classes you can skip.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    background_color: "#0b0d12",
    theme_color: "#0b0d12",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
