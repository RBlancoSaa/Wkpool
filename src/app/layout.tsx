import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WK Pool",
  description: "Voorspel het WK — Fun & Winnen pool",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
