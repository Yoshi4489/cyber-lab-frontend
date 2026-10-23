import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { AuthProvider } from "@/features/auth/provider";
import { AppShell } from "@/features/shell/app-shell";
import { connection } from "next/server";
import { getFrontendMode } from "@/features/backend/frontend-mode";
import { themeScript } from "@/features/theme/theme-init";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CiscoKU Lab · Learn. Explore. Grow.",
    template: "%s · CiscoKU Lab",
  },
  description:
    "A space for curious minds. Explore hands-on cybersecurity challenges, build your skills, and learn by doing.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Read the deployment mode at request time, rather than baking it into pages.
  await connection();
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AuthProvider mode={getFrontendMode()}><AppShell>{children}</AppShell></AuthProvider>
      </body>
    </html>
  );
}
