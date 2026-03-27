import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/layout/nav-bar";
import { QueryProvider } from "@/providers/query-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SkillMapper — Find the Right AI Skill",
  description:
    "Index, search, and match AI agent skills to your tasks. Discover skills from 10+ repositories with intelligent matching.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background font-sans`}
      >
        <QueryProvider>
          <NavBar />
          <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        </QueryProvider>
      </body>
    </html>
  );
}
