import "./globals.css";
import type { Metadata } from "next";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Stock Tracker",
  description: "Beautiful stock viewer powered by FastAPI backend",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased")}> 
        <div className="min-h-screen">{children}</div>
        <Footer />
      </body>
    </html>
  );
}

import dynamic from "next/dynamic";
const FooterTrail = dynamic(() => import("@/components/footer-trail").then(m => m.FooterTrail), { ssr: false });

function Footer() {
  return (
    <footer className="mt-16 h-[500px] w-full bg-muted/30">
      <div className="mx-auto flex h-full max-w-5xl items-center justify-center">
        <FooterTrail />
      </div>
    </footer>
  );
}


