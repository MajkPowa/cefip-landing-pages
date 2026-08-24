'use client';

import { useEffect, useState } from 'react';

type FbqFunction = ((...args: unknown[]) => void) & {
  queue: unknown[][];
  loaded: boolean;
  version: string;
  callMethod?: (...args: unknown[]) => void;
};

declare global {
  interface Window {
    fbq?: FbqFunction;
    _fbq?: unknown;
  }
}

const CONSENT_KEY = 'cefip-marketing-consent-v1';
const STANDARD_EVENTS = new Set(['PageView', 'ViewContent', 'Lead', 'Contact']);
// A Meta Pixel ID is public by design. Keep the production fallback in source so
// Firebase's static export cannot silently ship without campaign measurement.
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || '1511661883235296';

export function hasMetaMarketingConsent() {
  return typeof window !== 'undefined' && window.localStorage.getItem(CONSENT_KEY) === 'accepted';
}

export function trackMeta(event: string, parameters: Record<string, unknown> = {}, eventId?: string) {
  if (typeof window === 'undefined' || !window.fbq) return;
  const method = STANDARD_EVENTS.has(event) ? 'track' : 'trackCustom';
  if (eventId) {
    window.fbq(method, event, parameters, { eventID: eventId });
  } else {
    window.fbq(method, event, parameters);
  }
}

function enableMetaPixel(pixelId: string) {
  if (window.fbq) return;

  const queue = function (...args: unknown[]) {
    if (queue.callMethod) queue.callMethod(...args);
    else queue.queue.push(args);
  } as FbqFunction;

  queue.queue = [];
  queue.loaded = true;
  queue.version = '2.0';
  window.fbq = queue;
  window._fbq = queue;

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);

  queue('init', pixelId);
  queue('track', 'PageView');
  document.dispatchEvent(new CustomEvent('cefip:pixel-ready'));
}

export function AnalyticsConsent() {
  const [choice, setChoice] = useState<'accepted' | 'rejected' | 'unknown'>('unknown');

  useEffect(() => {
    const saved = window.localStorage.getItem(CONSENT_KEY);
    if (saved === 'accepted' || saved === 'rejected') {
      const frame = window.requestAnimationFrame(() => setChoice(saved));
      if (saved === 'accepted') {
        enableMetaPixel(META_PIXEL_ID);
      }
      return () => window.cancelAnimationFrame(frame);
    }
  }, []);

  const decide = (nextChoice: 'accepted' | 'rejected') => {
    window.localStorage.setItem(CONSENT_KEY, nextChoice);
    setChoice(nextChoice);
    if (nextChoice === 'accepted') {
      enableMetaPixel(META_PIXEL_ID);
    }
  };

  if (choice !== 'unknown') return null;

  return (
    <aside className="cookie-banner" aria-label="Nastavení marketingových cookies">
      <div>
        <strong>Soukromí máte pod kontrolou</strong>
        <p>
          Nezbytné technologie používáme pro fungování stránky. Měření Meta aktivujeme pouze po vašem souhlasu.
        </p>
      </div>
      <div className="cookie-actions">
        <button type="button" className="cookie-button" onClick={() => decide('rejected')}>Odmítnout</button>
        <button type="button" className="cookie-button cookie-button-primary" onClick={() => decide('accepted')}>Přijmout</button>
      </div>
    </aside>
  );
}
