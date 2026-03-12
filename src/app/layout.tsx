import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/customers", label: "Kunder" },
  { href: "/economy", label: "Ekonomi" },
  { href: "/quotes", label: "Offerter" },
  { href: "/domains", label: "Domäner" },
  { href: "/seo", label: "SEO" },
  { href: "/prospektering", label: "Prospektering" },
];

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
        <nav className="border-b border-sand-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <Link
              href="/"
              className="font-serif text-xl font-semibold text-brand-900"
            >
              EasyPartner OS
            </Link>
            <div className="flex gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-brand-600 hover:text-brand-900"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-7xl">{children}</main>
      </body>
    </html>
  );
}
