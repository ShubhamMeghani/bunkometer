import { ImageResponse } from "next/og";

// PNG app icons rendered at build time with next/og (no extra dependencies). SPEC R47.
const ICONS: Record<string, { size: number; maskable: boolean }> = {
  "icon-192.png": { size: 192, maskable: false },
  "icon-512.png": { size: 512, maskable: false },
  "maskable-512.png": { size: 512, maskable: true },
};

export const dynamic = "force-static";

export function generateStaticParams() {
  return Object.keys(ICONS).map((name) => ({ name }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const icon = ICONS[(await params).name];
  if (!icon) return new Response("Not found", { status: 404 });
  const { size, maskable } = icon;
  // Maskable icons keep the mark inside the central 80% safe zone.
  const inner = Math.round(size * (maskable ? 0.62 : 0.84));
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0d12" }}>
        <div
          style={{
            width: inner,
            height: inner,
            borderRadius: maskable ? inner / 2 : Math.round(inner * 0.24),
            background: "#8b9cff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#0b0d12",
            fontSize: Math.round(inner * 0.5),
            fontWeight: 800,
            letterSpacing: -2,
          }}
        >
          B%
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
