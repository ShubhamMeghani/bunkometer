import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bunk-o-Meter",
  description: "Know exactly how many classes you can skip.",
  applicationName: "Bunk-o-Meter",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0d12",
};

// Runs before first paint so the stored theme never flashes (SPEC R44). Dark unless the device chose otherwise.
const themeScript = `(function(){try{var p=localStorage.getItem('theme');var t=p==='light'?'light':p==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
