import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import type { ReactNode } from "react";

import { PAGE_DESCRIPTION, PAGE_TITLE, SITE_NAME } from "@/lib/constants";

import "./globals.css";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const viewport: Viewport = { themeColor: "#0e1510" };

export async function generateMetadata(): Promise<Metadata> {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";

  return {
    metadataBase: new URL(`${protocol}://${host}`),
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    applicationName: SITE_NAME,
    alternates: { canonical: "/" },
    openGraph: {
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      url: "/",
      siteName: SITE_NAME,
      type: "website",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: PAGE_TITLE }],
    },
    twitter: {
      card: "summary_large_image",
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      images: ["/opengraph-image"],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${bricolage.variable} ${geistMono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
