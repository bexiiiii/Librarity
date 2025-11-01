import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "../globals.css";
import { SubscriptionNotifications } from "@/components/SubscriptionNotifications";
import { i18n, type Locale } from "@/i18n/config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const advercase = localFont({
  src: "../../public/fonts/AdvercaseFont-Demo-Regular.otf",
  variable: "--font-advercase",
  display: "swap",
});

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }));
}

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ lang: Locale }> 
}): Promise<Metadata> {
  const { lang } = await params;
  
  const titles = {
    en: "Lexent AI - Chat with Your Books Using AI",
    ru: "Lexent AI - Общайтесь с вашими книгами используя ИИ",
  };
  
  const descriptions = {
    en: "Transform the way you read with AI-powered conversations. Upload any book and unlock deeper understanding through intelligent dialogue. From classics to textbooks, your personal AI reading companion awaits.",
    ru: "Трансформируйте способ чтения с помощью разговоров на основе ИИ. Загружайте любую книгу и открывайте более глубокое понимание через интеллектуальный диалог. От классики до учебников, ваш персональный ИИ-компаньон для чтения ждет вас.",
  };

  return {
    title: {
      default: titles[lang],
      template: `%s | Lexent AI`
    },
    description: descriptions[lang],
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
    
    openGraph: {
      type: "website",
      locale: lang === 'ru' ? "ru_RU" : "en_US",
      title: titles[lang],
      description: descriptions[lang],
      url: "https://lexentai.com",
      siteName: "Lexent AI",
      images: [
        {
          url: "/book 1.png",
          width: 1200,
          height: 630,
          alt: "Lexent AI - AI-Powered Book Chat"
        }
      ]
    },
    
    twitter: {
      card: "summary_large_image",
      title: titles[lang],
      description: descriptions[lang],
      images: ["/twitter-image.png"],
      creator: "@lexentai"
    }
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: Locale }>;
}>) {
  const { lang } = await params;
  
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
    <html lang={lang} suppressHydrationWarning>
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
        <SubscriptionNotifications />
        {children}
      </body>
    </html>
  );
}
