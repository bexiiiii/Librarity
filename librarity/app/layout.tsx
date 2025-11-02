import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { SubscriptionNotifications } from "@/components/SubscriptionNotifications";
import { VisitorTracker } from "@/components/VisitorTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const advercase = localFont({
  src: "../public/fonts/AdvercaseFont-Demo-Regular.otf",
  variable: "--font-advercase",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Lexent AI - Chat with Your Books Using AI",
    template: "%s | Lexent AI"
  },
  description: "Transform the way you read with AI-powered conversations. Upload any book and unlock deeper understanding through intelligent dialogue. From classics to textbooks, your personal AI reading companion awaits.",
  keywords: [
    "AI book chat",
    "book intelligence",
    "AI reading assistant",
    "book conversation",
    "AI book analysis",
    "intelligent reading",
    "book discussion AI",
    "reading comprehension",
    "book Q&A",
    "AI literature assistant"
  ],
  authors: [{ name: "Lexent AI Team" }],
  creator: "Lexent AI",
  publisher: "Lexent AI",
  metadataBase: new URL("https://lexentai.com"),
  
  // Open Graph
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "Lexent AI - Chat with Your Books Using AI",
    description: "Transform the way you read with AI-powered conversations. Upload any book and unlock deeper understanding through intelligent dialogue.",
    url: "https://lexentai.com",
    siteName: "Lexent AI",
    images: [
      {
        url: "/meet.png",
        width: 1200,
        height: 630,
        alt: "Lexent AI - AI-Powered Book Chat"
      }
    ]
  },
  
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "Lexent AI - Chat with Your Books Using AI",
    description: "Transform your reading experience with AI-powered conversations",
    images: ["/twitter-image.png"],
    creator: "@lexentai"
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
    "name": "Lexent AI",
    "applicationCategory": "EducationalApplication",
    "description": "Transform your reading experience with AI. Chat with your books in 4 intelligent modes.",
    "url": "https://lexentai.com",
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function setViewportHeight() {
                  const vh = window.innerHeight * 0.01;
                  document.documentElement.style.setProperty('--vh', vh + 'px');
                  
                  // Handle visualViewport for better mobile support
                  if (window.visualViewport) {
                    const vvh = window.visualViewport.height * 0.01;
                    document.documentElement.style.setProperty('--vvh', vvh + 'px');
                  }
                }
                
                setViewportHeight();
                window.addEventListener('resize', setViewportHeight);
                if (window.visualViewport) {
                  window.visualViewport.addEventListener('resize', setViewportHeight);
                }
              })();
            `
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${advercase.variable} antialiased`}
        suppressHydrationWarning
      >
        <VisitorTracker />
        <SubscriptionNotifications />
        {children}
      </body>
    </html>
  );
}
