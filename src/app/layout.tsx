import { SessionProvider } from "@/components/SessionProvider";
import { I18nProvider } from "@/i18n/context";
import { ThemeProvider } from "@/lib/theme";
import { QueryProvider } from "@/components/QueryProvider";
import type { Metadata } from "next";
import { Inter, Geist_Mono, Vazirmatn } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Crypto Sense — Momentum Setup Scanner",
  description:
    "Stop looking for trades. Let Crypto Sense find them for you. Real-time market scanning that identifies high-probability momentum setups.",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${inter.variable} ${geistMono.variable} ${vazirmatn.variable}`}>
      <body className="min-h-screen bg-theme-bg text-theme-text antialiased font-sans">
        <QueryProvider>
          <ThemeProvider>
            <I18nProvider>
              <SessionProvider>
                {children}
              </SessionProvider>
            </I18nProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
