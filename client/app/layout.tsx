import type { Metadata } from "next";
import localFont from "next/font/local";
import "./styles/globals.css";
import "leaflet/dist/leaflet.css";
import ConditionalLayout from "../components/ConditionalLayout";
import SiteDownBanner from "../components/SiteDownBanner";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { NotificationProvider } from "@/lib/contexts/NotificationContext";
import { I18nProvider } from "@/lib/contexts/I18nContext";
import LanguageWrapper from "../components/LanguageWrapper";

const googleSansFlex = localFont({
  src: "styles/fonts/Google_Sans_Flex/GoogleSansFlex-VariableFont_GRAD,ROND,opsz,slnt,wdth,wght.ttf",
  variable: "--font-google-sans-flex",
});

export const metadata: Metadata = {
  title: {
    default: "Mestermind - Home Services Made Easy",
    template: "%s | Mestermind",
  },
  description: "Home improvement, home repair, and home services made easy. Connect with trusted professionals for all your home service needs.",
  keywords: ["home services", "home improvement", "home repair", "professional services", "service providers", "home maintenance"],
  authors: [{ name: "Mestermind" }],
  creator: "Mestermind",
  publisher: "Mestermind",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://mestermind.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Mestermind",
    title: "Mestermind - Home Services Made Easy",
    description: "Home improvement, home repair, and home services made easy. Connect with trusted professionals for all your home service needs.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Mestermind - Home Services Made Easy",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mestermind - Home Services Made Easy",
    description: "Home improvement, home repair, and home services made easy. Connect with trusted professionals for all your home service needs.",
    images: ["/og-image.jpg"],
    creator: "@mestermind",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "android-chrome-192x192",
        url: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        rel: "android-chrome-512x512",
        url: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },
  manifest: "/site.webmanifest",
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${googleSansFlex.variable} antialiased`}
      >
        <I18nProvider>
          <LanguageWrapper>
            <AuthProvider>
              <NotificationProvider>
                <SiteDownBanner />
                <ConditionalLayout>
                  {children}
                </ConditionalLayout>
              </NotificationProvider>
            </AuthProvider>
          </LanguageWrapper>
        </I18nProvider>
      </body>
    </html>
  );
}
