import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ConditionalNav } from "@/components/ConditionalNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EasyPartner OS",
  description: "CRM & affärssystem för EasyPartner",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-sand-50 text-foreground antialiased`}
      >
        <ConditionalNav />
        <main className="mx-auto max-w-7xl">{children}</main>
      </body>
    </html>
  );
}
