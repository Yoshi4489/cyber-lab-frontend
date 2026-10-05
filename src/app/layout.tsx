import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { AuthProvider } from "@/features/auth/provider";
import { AppShell } from "@/features/shell/app-shell";
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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
        <AuthProvider><AppShell>{children}</AppShell></AuthProvider>
      </body>
    </html>
  );
}
