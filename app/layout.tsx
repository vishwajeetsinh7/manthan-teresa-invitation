import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Pinyon_Script } from "next/font/google";
import { invitation } from "@/src/content/invitation";
import { assets } from "@/src/config/assets";
import "./globals.css";

const script = Pinyon_Script({
  variable: "--font-script",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const serif = Cormorant_Garamond({
  variable: "--font-serif",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: invitation.shareTitle,
  description: invitation.shareDescription,
  openGraph: {
    title: invitation.shareTitle,
    description: invitation.shareDescription,
    type: "website",
    images: [{ url: assets.og, width: 1200, height: 630, alt: "Gold wax seal with T&M on a burgundy velvet envelope" }],
  },
  twitter: {
    card: "summary_large_image",
    title: invitation.shareTitle,
    description: invitation.shareDescription,
    images: [assets.og],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#4A0A12",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${script.variable} ${serif.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
