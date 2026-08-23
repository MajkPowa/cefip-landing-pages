import { env } from 'cloudflare:workers';
import { createLead, saveLeadFile } from '../../../db/leads';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 30 * 1024 * 1024;
const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_PHOTO_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

function text(form: FormData, key: string, max = 160) {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function optional(form: FormData, key: string, max = 160) {
  return text(form, key, max) || null;
}

function normalizePhone(input: string) {
  const trimmed = input.trim();
  let digits = trimmed.replace(/\D/g, '');
  if (digits.startsWith('00420')) digits = digits.slice(5);
  if (digits.startsWith('420') && digits.length === 12) digits = digits.slice(3);
  if (digits.length === 9) return `+420${digits}`;
  return trimmed.startsWith('+') ? `+${digits}` : digits;
}

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}

export async function POST(request: Request) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return json({ ok: false, message: 'Neplatný původ požadavku.' }, 403);

  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (contentLength > MAX_BODY_BYTES) return json({ ok: false, message: 'Přílohy jsou příliš velké.' }, 413);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, message: 'Formulář se nepodařilo načíst.' }, 400);
  }

  if (text(form, 'website', 100)) {
    return json({ ok: true, eventId: crypto.randomUUID() }, 201);
  }

  const submissionId = text(form, 'submissionId', 80);
  const serviceType = text(form, 'serviceType', 24);
  const name = text(form, 'name', 100);
  const phone = normalizePhone(text(form, 'phone', 40));
  const email = optional(form, 'email', 254)?.toLowerCase() ?? null;
  const location = text(form, 'location', 120);
  const propertyType = text(form, 'propertyType', 40);
  const scope = optional(form, 'scope', 40);
  const salePath = optional(form, 'salePath', 40);
  const relationship = optional(form, 'relationship', 40);
  const privacyAcknowledged = text(form, 'privacyAcknowledged', 8) === 'true';
  const errors: Record<string, string> = {};

  if (!/^[0-9a-f-]{36}$/i.test(submissionId)) errors.form = 'Formulář obnovte a zkuste to znovu.';
  if (serviceType !== 'reconstruction' && serviceType !== 'buyout') errors.form = 'Neplatný typ poptávky.';
  if (name.length < 2) errors.name = 'Uveďte své jméno.';
  if (phone.replace(/\D/g, '').length < 9) errors.phone = 'Uveďte platné telefonní číslo.';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Zkontrolujte e-mailovou adresu.';
  if (location.length < 2) errors.location = 'Uveďte obec nebo PSČ.';
  if (!propertyType) errors.propertyType = 'Vyberte typ nemovitosti.';
  if (serviceType === 'reconstruction' && !scope) errors.scope = 'Vyberte předpokládaný rozsah.';
  if (serviceType === 'buyout' && !salePath) errors.salePath = 'Vyberte, jakou cestu zvažujete.';
  if (serviceType === 'buyout' && !relationship) errors.relationship = 'Uveďte svůj vztah k nemovitosti.';
  if (!privacyAcknowledged) errors.privacyAcknowledged = 'Potvrďte seznámení s informacemi o zpracování údajů.';

  const photos = form.getAll('photos').filter((item): item is File => item instanceof File && item.size > 0);
  const totalPhotoBytes = photos.reduce((sum, file) => sum + file.size, 0);
  if (photos.length > MAX_PHOTOS || totalPhotoBytes > MAX_TOTAL_PHOTO_BYTES || photos.some((file) => file.size > MAX_PHOTO_BYTES || !ALLOWED_MIME[file.type])) {
    errors.photos = 'Nahrajte nejvýše 5 podporovaných fotografií, každou do 8 MB a celkem do 25 MB.';
  }

  if (Object.keys(errors).length) return json({ ok: false, message: 'Zkontrolujte formulář.', errors }, 422);

  const leadId = crypto.randomUUID();
  const eventId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const landingVariantRaw = text(form, 'landingVariant', 32).toLowerCase();
  const landingVariant = /^(default|r[1-5]|v[1-5])$/.test(landingVariantRaw) ? landingVariantRaw : 'default';
  const landingPathRaw = text(form, 'landingPath', 120);
  const landingPath = landingPathRaw.startsWith('/') ? landingPathRaw : serviceType === 'reconstruction' ? '/rekonstrukce' : '/vykup-nemovitosti';
  const details = {
    scope,
    timeline: optional(form, 'timeline', 40),
    salePath,
    propertyCondition: optional(form, 'propertyCondition', 40),
    relationship,
  };

  try {
    const saved = await createLead({
      id: leadId,
      submissionId,
      eventId,
      createdAt,
      serviceType: serviceType as 'reconstruction' | 'buyout',
      landingVariant,
      name,
      phone,
      email,
      location,
      propertyType,
      message: optional(form, 'message', 1500),
      detailsJson: JSON.stringify(details),
      contactPreference: text(form, 'contactPreference', 20) === 'email' ? 'email' : 'phone',
      utmSource: optional(form, 'utm_source', 64),
      utmMedium: optional(form, 'utm_medium', 32),
      utmCampaign: optional(form, 'utm_campaign', 160),
      utmTerm: optional(form, 'utm_term', 160),
      utmContent: optional(form, 'utm_content', 160),
      campaignId: optional(form, 'campaign_id', 64),
      adsetId: optional(form, 'adset_id', 64),
      adId: optional(form, 'ad_id', 64),
      placement: optional(form, 'placement', 64),
      landingPath,
      referrerOrigin: optional(form, 'referrerOrigin', 180),
      privacyVersion: '1.0-2026-08-24',
    });

    let uploaded = 0;
    if (!saved.duplicate) {
      for (const file of photos) {
        const fileId = crypto.randomUUID();
        const extension = ALLOWED_MIME[file.type];
        const key = `lead-uploads/${saved.id}/${fileId}.${extension}`;
        try {
          await env.FILES.put(key, file.stream(), {
            httpMetadata: { contentType: file.type },
            customMetadata: { leadId: saved.id },
          });
          await saveLeadFile({ id: fileId, leadId: saved.id, r2Key: key, contentType: file.type, sizeBytes: file.size, createdAt });
          uploaded++;
        } catch {
          // Lead remains valid even if an optional photo fails to upload.
        }
      }
    }

    return json({ ok: true, leadId: saved.id, eventId: saved.eventId, uploaded, uploadWarning: !saved.duplicate && uploaded < photos.length }, 201);
  } catch {
    return json({ ok: false, message: 'Poptávku se nyní nepodařilo uložit. Zkuste to znovu nebo zavolejte na +420 730 535 775.' }, 500);
  }
}
