import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jet Lag Snake – South Korea",
  description: "Multiplayer train snake game on the South Korean KTX network",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white min-h-screen">{children}</body>
    </html>
  );
}
