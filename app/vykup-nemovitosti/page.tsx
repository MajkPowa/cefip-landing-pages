import type { Metadata } from 'next';
import { LandingPage } from '../components/landing-page';
import { buyoutContent } from '../lib/landing-content';

export const metadata: Metadata = {
  title: 'Přímý výkup nemovitostí | CEFIP',
  description: 'Pošlete základní údaje o nemovitosti. Možnost přímého výkupu a další postup posoudíme individuálně.',
  alternates: { canonical: '/vykup-nemovitosti' },
};

export default function BuyoutPage() {
  return <LandingPage content={buyoutContent} />;
}
