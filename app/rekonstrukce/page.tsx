import type { Metadata } from 'next';
import { LandingPage } from '../components/landing-page';
import { reconstructionContent } from '../lib/landing-content';

export const metadata: Metadata = {
  title: 'Kompletní rekonstrukce bytů a domů | CEFIP',
  description: 'Rekonstrukce bytů, rodinných domů a bytových domů. Pošlete lokalitu, fotografie a představu o rozsahu.',
  alternates: { canonical: '/rekonstrukce' },
};

export default function ReconstructionPage() {
  return <LandingPage content={reconstructionContent} />;
}
