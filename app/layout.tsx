import type { Metadata } from 'next';
import './globals.css';
import { AnalyticsConsent } from './components/analytics';

export const metadata: Metadata = {
  title: {
    default: 'CEFIP — řešení pro vaši nemovitost',
    template: '%s',
  },
  description: 'Kompletní rekonstrukce a individuálně posuzovaný přímý výkup nemovitostí v Praze, Středních a Severních Čechách.',
  icons: {
    icon: '/favicon.png',
  },
  openGraph: {
    title: 'CEFIP: řešení pro vaši nemovitost',
    description: 'Kompletní rekonstrukce • Přímý výkup',
    type: 'website',
    locale: 'cs_CZ',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'CEFIP — rekonstrukce a přímý výkup' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CEFIP: řešení pro vaši nemovitost',
    description: 'Kompletní rekonstrukce • Přímý výkup',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body>{children}<AnalyticsConsent /></body>
    </html>
  );
}
