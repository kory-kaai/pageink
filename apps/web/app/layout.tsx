import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PageInk — PDF text editor",
  description:
    "Add text to any PDF in your browser. Private, open source, no upload.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
