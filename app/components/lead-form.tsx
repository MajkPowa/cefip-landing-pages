'use client';

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { trackMeta } from './analytics';
import type { ServiceType } from '../lib/landing-content';

type LeadFormProps = {
  serviceType: ServiceType;
  title: string;
  intro: string;
  primaryCta: string;
  landingVariant: string;
};

type FormValues = {
  propertyType: string;
  location: string;
  scope: string;
  timeline: string;
  salePath: string;
  propertyCondition: string;
  relationship: string;
  message: string;
  name: string;
  phone: string;
  email: string;
  contactPreference: string;
  privacyAcknowledged: boolean;
  website: string;
};

const initialValues: FormValues = {
  propertyType: '',
  location: '',
  scope: '',
  timeline: '',
  salePath: '',
  propertyCondition: '',
  relationship: '',
  message: '',
  name: '',
  phone: '',
  email: '',
  contactPreference: 'phone',
  privacyAcknowledged: false,
  website: '',
};

const inputClass = 'form-control';

export function LeadForm({ serviceType, title, intro, primaryCta, landingVariant }: LeadFormProps) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<FormValues>(initialValues);
  const [photos, setPhotos] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [serverMessage, setServerMessage] = useState('');
  const attribution = useRef<Record<string, string>>({});
  const interacted = useRef(false);
  const submissionId = useRef('');

  useEffect(() => {
    submissionId.current = crypto.randomUUID();
    const params = new URLSearchParams(window.location.search);
    const allowed = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'campaign_id', 'adset_id', 'ad_id', 'placement'];
    const captured: Record<string, string> = {};
    for (const key of allowed) {
      const value = params.get(key);
      if (value) captured[key] = value.slice(0, 160);
    }
    attribution.current = captured;
  }, []);

  const update = (field: keyof FormValues, value: string | boolean) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const trackStart = () => {
    if (interacted.current) return;
    interacted.current = true;
    trackMeta('LeadFormStart', {
      content_category: serviceType,
      landing_variant: landingVariant,
    });
  };

  const validateStep = (currentStep: number) => {
    const nextErrors: Record<string, string> = {};

    if (currentStep === 0) {
      if (!values.propertyType) nextErrors.propertyType = 'Vyberte typ nemovitosti.';
      if (values.location.trim().length < 2) nextErrors.location = 'Uveďte obec nebo PSČ.';
      if (serviceType === 'reconstruction' && !values.scope) nextErrors.scope = 'Vyberte předpokládaný rozsah.';
      if (serviceType === 'buyout' && !values.salePath) nextErrors.salePath = 'Vyberte, jakou cestu zvažujete.';
    }

    if (currentStep === 1 && serviceType === 'buyout' && !values.relationship) {
      nextErrors.relationship = 'Uveďte svůj vztah k nemovitosti.';
    }

    if (currentStep === 2) {
      if (values.name.trim().length < 2) nextErrors.name = 'Uveďte své jméno.';
      if (values.phone.replace(/\D/g, '').length < 9) nextErrors.phone = 'Uveďte platné telefonní číslo.';
      if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) nextErrors.email = 'Zkontrolujte e-mailovou adresu.';
      if (!values.privacyAcknowledged) nextErrors.privacyAcknowledged = 'Potvrďte, že jste se seznámili s informacemi o zpracování údajů.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const nextStep = () => {
    trackStart();
    if (!validateStep(step)) return;
    setStep((current) => Math.min(2, current + 1));
  };

  const onPhotos = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    const accepted = selected.filter((file) => ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(file.type));
    const totalBytes = accepted.reduce((sum, file) => sum + file.size, 0);
    if (accepted.some((file) => file.size > 8 * 1024 * 1024) || totalBytes > 25 * 1024 * 1024 || accepted.length > 5) {
      setErrors((current) => ({ ...current, photos: 'Nahrajte nejvýše 5 fotografií, každou do 8 MB a celkem do 25 MB.' }));
      setPhotos([]);
      return;
    }
    setPhotos(accepted);
    setErrors((current) => {
      const next = { ...current };
      delete next.photos;
      return next;
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    trackStart();
    if (!validateStep(2)) return;

    setStatus('submitting');
    setServerMessage('');

    const payload = new FormData();
    payload.set('submissionId', submissionId.current || crypto.randomUUID());
    payload.set('serviceType', serviceType);
    payload.set('landingVariant', landingVariant);
    for (const [key, value] of Object.entries(values)) payload.set(key, String(value));
    for (const [key, value] of Object.entries(attribution.current)) payload.set(key, value);
    payload.set('landingPath', window.location.pathname);
    payload.set('referrerOrigin', (() => {
      try { return document.referrer ? new URL(document.referrer).origin : ''; } catch { return ''; }
    })());
    for (const photo of photos) payload.append('photos', photo);

    try {
      const response = await fetch('/api/leads', { method: 'POST', body: payload });
      const result = await response.json() as { ok?: boolean; eventId?: string; message?: string; errors?: Record<string, string> };
      if (!response.ok || !result.ok) {
        if (result.errors) setErrors(result.errors);
        throw new Error(result.message || 'Poptávku se nepodařilo odeslat.');
      }

      trackMeta('Lead', {
        content_name: serviceType === 'reconstruction' ? 'cefip_reconstruction' : 'cefip_property_buyout',
        content_category: serviceType,
        landing_variant: landingVariant,
      }, result.eventId);
      window.sessionStorage.setItem(`cefip-lead-${result.eventId}`, 'sent');
      window.location.assign(`/dekujeme?segment=${serviceType}`);
    } catch (error) {
      setStatus('error');
      setServerMessage(error instanceof Error ? error.message : 'Poptávku se nepodařilo odeslat. Zkuste to znovu nebo nám zavolejte.');
    }
  };

  const propertyOptions = serviceType === 'reconstruction'
    ? [['', 'Vyberte možnost'], ['apartment', 'Byt'], ['house', 'Rodinný dům'], ['apartment_building', 'Bytový nebo panelový dům'], ['other', 'Jiný objekt']]
    : [['', 'Vyberte možnost'], ['apartment', 'Byt'], ['house', 'Rodinný dům'], ['apartment_building', 'Bytový dům'], ['land', 'Pozemek'], ['other', 'Jiná nemovitost']];

  return (
    <div className="lead-form-wrap" id="poptavka">
      <div className="form-heading">
        <span>KROK {step + 1} ZE 3</span>
        <div className="progress-track" aria-hidden="true"><i style={{ width: `${((step + 1) / 3) * 100}%` }} /></div>
      </div>
      <h2>{title}</h2>
      <p className="form-intro">{intro}</p>

      {Object.keys(errors).length > 0 && (
        <div className="error-summary" role="alert">Zkontrolujte prosím označená pole.</div>
      )}

      <form onSubmit={submit} onFocus={trackStart} noValidate>
        {step === 0 && (
          <div className="form-step">
            <label>
              {serviceType === 'reconstruction' ? 'Co chcete rekonstruovat?*' : 'Co chcete prodat?*'}
              <select className={inputClass} value={values.propertyType} onChange={(e) => update('propertyType', e.target.value)} aria-invalid={Boolean(errors.propertyType)}>
                {propertyOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              {errors.propertyType && <span className="field-error">{errors.propertyType}</span>}
            </label>
            <label>
              Obec nebo PSČ*
              <input className={inputClass} value={values.location} onChange={(e) => update('location', e.target.value)} autoComplete="postal-code" placeholder="Např. Mělník" aria-invalid={Boolean(errors.location)} />
              {errors.location && <span className="field-error">{errors.location}</span>}
            </label>
            {serviceType === 'reconstruction' ? (
              <label>
                O jaký rozsah jde?*
                <select className={inputClass} value={values.scope} onChange={(e) => update('scope', e.target.value)} aria-invalid={Boolean(errors.scope)}>
                  <option value="">Vyberte možnost</option>
                  <option value="complete">Celková rekonstrukce</option>
                  <option value="partial">Částečná rekonstrukce</option>
                  <option value="unknown">Zatím nevím</option>
                </select>
                {errors.scope && <span className="field-error">{errors.scope}</span>}
              </label>
            ) : (
              <label>
                Jakou cestu zvažujete?*
                <select className={inputClass} value={values.salePath} onChange={(e) => update('salePath', e.target.value)} aria-invalid={Boolean(errors.salePath)}>
                  <option value="">Vyberte možnost</option>
                  <option value="direct_buyout">Přímý výkup</option>
                  <option value="market_sale">Běžný prodej</option>
                  <option value="compare">Chci možnosti porovnat</option>
                </select>
                {errors.salePath && <span className="field-error">{errors.salePath}</span>}
              </label>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="form-step">
            {serviceType === 'reconstruction' ? (
              <label>
                Kdy byste chtěli projekt řešit?
                <select className={inputClass} value={values.timeline} onChange={(e) => update('timeline', e.target.value)}>
                  <option value="">Zatím nevím</option>
                  <option value="soon">Co nejdříve</option>
                  <option value="three_months">Do 3 měsíců</option>
                  <option value="six_months">Za 3–6 měsíců</option>
                  <option value="later">Později</option>
                </select>
              </label>
            ) : (
              <>
                <label>
                  V jakém stavu nemovitost je?
                  <select className={inputClass} value={values.propertyCondition} onChange={(e) => update('propertyCondition', e.target.value)}>
                    <option value="">Zatím nevím</option>
                    <option value="renovated">Po rekonstrukci</option>
                    <option value="used">Běžně užívaná</option>
                    <option value="before_renovation">Před rekonstrukcí</option>
                    <option value="unfinished">Rozestavěná</option>
                  </select>
                </label>
                <label>
                  Jaký je váš vztah k nemovitosti?*
                  <select className={inputClass} value={values.relationship} onChange={(e) => update('relationship', e.target.value)} aria-invalid={Boolean(errors.relationship)}>
                    <option value="">Vyberte možnost</option>
                    <option value="owner">Jsem vlastník</option>
                    <option value="co_owner">Jsem spoluvlastník</option>
                    <option value="authorized">Jednám s pověřením vlastníka</option>
                    <option value="other">Jiná situace</option>
                  </select>
                  {errors.relationship && <span className="field-error">{errors.relationship}</span>}
                </label>
              </>
            )}
            <label>
              Co bychom měli vědět?
              <textarea className={`${inputClass} form-textarea`} value={values.message} onChange={(e) => update('message', e.target.value)} maxLength={1500} placeholder={serviceType === 'reconstruction' ? 'Co chcete změnit, současný stav, další souvislosti…' : 'Současný stav a další informace důležité pro posouzení…'} />
            </label>
            <label className="upload-control">
              <span>Přiložit fotografie <small>volitelné</small></span>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple onChange={onPhotos} />
              <b>{photos.length ? `${photos.length} fotografií vybráno` : 'Vybrat až 5 fotografií'}</b>
              <em>JPG, PNG, WebP nebo HEIC; max. 8 MB na fotografii.</em>
              {errors.photos && <span className="field-error">{errors.photos}</span>}
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="form-step">
            <label>
              Jméno*
              <input className={inputClass} value={values.name} onChange={(e) => update('name', e.target.value)} autoComplete="name" aria-invalid={Boolean(errors.name)} />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </label>
            <label>
              Telefon*
              <input className={inputClass} value={values.phone} onChange={(e) => update('phone', e.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="+420" aria-invalid={Boolean(errors.phone)} />
              {errors.phone && <span className="field-error">{errors.phone}</span>}
            </label>
            <label>
              E-mail <small>volitelný</small>
              <input className={inputClass} value={values.email} onChange={(e) => update('email', e.target.value)} type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </label>
            <fieldset className="contact-choice">
              <legend>Jak vás máme kontaktovat?</legend>
              <label><input type="radio" name="contactPreference" checked={values.contactPreference === 'phone'} onChange={() => update('contactPreference', 'phone')} /> Telefonem</label>
              <label><input type="radio" name="contactPreference" checked={values.contactPreference === 'email'} onChange={() => update('contactPreference', 'email')} /> E-mailem</label>
            </fieldset>
            <label className="privacy-check">
              <input type="checkbox" checked={values.privacyAcknowledged} onChange={(e) => update('privacyAcknowledged', e.target.checked)} aria-invalid={Boolean(errors.privacyAcknowledged)} />
              <span>Seznámil/a jsem se s <a href="/ochrana-osobnich-udaju" target="_blank">informacemi o zpracování osobních údajů</a>.*</span>
            </label>
            {errors.privacyAcknowledged && <span className="field-error">{errors.privacyAcknowledged}</span>}
            <div className="honeypot" aria-hidden="true">
              <label>Web<input tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => update('website', e.target.value)} /></label>
            </div>
          </div>
        )}

        {serverMessage && <div className="server-error" role="alert">{serverMessage}</div>}

        <div className="form-buttons">
          {step > 0 && <button type="button" className="button-secondary" onClick={() => setStep((current) => current - 1)}>Zpět</button>}
          {step < 2 ? (
            <button type="button" className="button-primary" onClick={nextStep}>Pokračovat</button>
          ) : (
            <button type="submit" className="button-primary" disabled={status === 'submitting'}>
              {status === 'submitting' ? 'Odesílám…' : primaryCta}
            </button>
          )}
        </div>
      </form>
      <p className="form-footnote">Odesláním nevzniká objednávka služby ani povinnost uzavřít smlouvu.</p>
    </div>
  );
}
