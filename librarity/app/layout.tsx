import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SubscriptionNotifications } from "@/components/SubscriptionNotifications";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Librarity - Chat with Your Books Using AI",
    template: "%s | Librarity"
  },
  description: "Transform your reading experience with AI. Upload any book and have intelligent conversations in 4 modes: Book Brain, Author Mode, Coach Mode, and Citations. Read smarter, learn faster.",
  keywords: [
    "AI book chat",
    "book assistant",
    "AI reading companion",
    "book brain",
    "interactive reading",
    "book coaching",
    "AI author mode",
    "book citations",
    "smart reading",
    "AI education",
    "book learning",
    "PDF chat",
    "EPUB reader",
    "AI tutor"
  ],
  authors: [{ name: "Librarity Team" }],
  creator: "Librarity",
  publisher: "Librarity",
  metadataBase: new URL("https://librarity.1edu.kz"),
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Librarity - Chat with Your Books Using AI",
    description: "Transform your reading experience with AI. Upload any book and have intelligent conversations in 4 modes.",
    url: "https://librarity.1edu.kz",
    siteName: "Librarity",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Librarity - AI-Powered Book Chat"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Librarity - Chat with Your Books Using AI",
    description: "Transform your reading experience with AI. Upload any book and have intelligent conversations.",
    images: ["/og-image.png"],
    creator: "@librarity"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png"
  },
  manifest: "/site.webmanifest",
  verification: {
    google: "your-google-verification-code",
    yandex: "your-yandex-verification-code"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Librarity",
    "applicationCategory": "EducationalApplication",
    "description": "Transform your reading experience with AI. Chat with your books in 4 intelligent modes.",
    "url": "https://librarity.1edu.kz",
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "USD",
      "lowPrice": "0",
      "highPrice": "25",
      "offers": [
        {
          "@type": "Offer",
          "name": "Free Plan",
          "price": "0",
          "priceCurrency": "USD"
        },
        {
          "@type": "Offer",
          "name": "Pro Plan",
          "price": "10",
          "priceCurrency": "USD"
        },
        {
          "@type": "Offer",
          "name": "Ultimate Plan",
          "price": "25",
          "priceCurrency": "USD"
        }
      ]
    },
    "featureList": [
      "Book Brain Mode - Chat with books as if they're alive",
      "Author Mode - Talk directly with the book's author",
      "Coach Mode - Get personalized guidance and actionable advice",
      "Citation Mode - Get precise references and quotes"
    ],
    "operatingSystem": "Web Browser",
    "browserRequirements": "Requires JavaScript. Requires HTML5."
  };

  return (
     <html lang="en"  suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <SubscriptionNotifications />
        {children}
      </body>
    </html>
  );
}
