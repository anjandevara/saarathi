import type { Metadata } from "next";
import "./globals.css";
import Chrome from "@/components/Chrome";

export const metadata: Metadata = {
  // Per-route titles: the home page shows "Saarathi", inner pages show
  // "Agents · Saarathi" etc. Bug 5 fix.
  title: { default: "Saarathi", template: "%s · Saarathi" },
  description: "Command center for the Playwright automation project.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Google Fonts, hoisted to <head> by React 19. Falls back gracefully offline. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Manrope:wght@400;500;600;700;800&display=swap"
        />
        <div className="grain" aria-hidden="true" />
        <div className="field-vign" aria-hidden="true" />
        <Chrome />
        {children}
      </body>
    </html>
  );
}
