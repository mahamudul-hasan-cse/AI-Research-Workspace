import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AI Research Workspace",
    template: "%s | AI Research Workspace",
  },
  description:
    "A workspace for organizing research, sources, and AI-assisted notes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main-content"
          className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:block focus:h-auto focus:w-auto focus:overflow-visible focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-md focus:outline-2 focus:outline-offset-2 focus:outline-accent"
        >
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
        <footer className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted sm:px-6">
            AI Research Workspace — FlyRank capstone skeleton
          </div>
        </footer>
      </body>
    </html>
  );
}
