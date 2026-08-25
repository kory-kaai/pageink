import type { Metadata } from "next";
import { KorykaaiSiteFooter } from "@/components/site/KorykaaiSiteFooter";
import { KorykaaiSiteHeader } from "@/components/site/KorykaaiSiteHeader";
import "./globals.css";
import "./korykaai-shell.css";
import "./pageink.css";

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
      <body>
        <KorykaaiSiteHeader />
        <div className="pageink-app-main">{children}</div>
        <KorykaaiSiteFooter />
      </body>
    </html>
  );
}
