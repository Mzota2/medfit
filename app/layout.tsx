import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { AppProvider } from "@/contexts/AppContext";
import { ToastProvider } from "@/components/ui/Toast";
import {ThemeProvider} from "@/providers/ThemeProvider";
import { SITE_CONFIG } from '@/lib/config/siteConfig';
import RecaptchaFix from '@/components/ui/RecaptchaFix';

export const metadata: Metadata = {
  title: SITE_CONFIG.appTitle,
  description: SITE_CONFIG.appDescription,
  openGraph: {
    images: [
      {
        url: SITE_CONFIG.brandImageUrl || '', // Must be an absolute URL
        width: 1200,
        height: 630,
        alt: SITE_CONFIG.appTitle,
      },
    ],
  },
  // Also add Twitter-specific tags for better control on X (Twitter)
  twitter: {
    card: 'summary_large_image', // Use summary_large_image for a prominent image
    title: SITE_CONFIG.appTitle,
    description: SITE_CONFIG.appDescription,
    images: [SITE_CONFIG.brandImageUrl || ''], // Must be an absolute URL
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <QueryProvider>
          <AuthProvider>
            <AppProvider>
              <ThemeProvider>
                <ToastProvider>
                  <AnalyticsProvider>
                    {children}
                    <RecaptchaFix />
                  </AnalyticsProvider>
                </ToastProvider>
              </ThemeProvider>
            </AppProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
