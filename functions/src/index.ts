import { randomUUID } from "node:crypto";
import Busboy from "busboy";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { logger } from "firebase-functions";
import { onRequest, type Request } from "firebase-functions/v2/https";
import type { Response } from "express";
import {
  ALLOWED_MIME,
  clipped,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
  MAX_TOTAL_PHOTO_BYTES,
  type NormalizedLead,
  type ParsedPhoto,
  validateLead,
} from "./validation";

const MAX_BODY_BYTES = 24 * 1024 * 1024;
const MAX_FIELDS = 40;
const MAX_FIELD_BYTES = 4096;

const firebaseApp = getApps()[0] ?? initializeApp();
const firestore = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

type ParsedMultipart = {
  fields: Record<string, string>;
  photos: ParsedPhoto[];
};

type SavedLead = {
  id: string;
  eventId: string;
  duplicate: boolean;
};

class RequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly errors?: Record<string, string>,
  ) {
    super(message);
  }
}

function sendJson(response: Response, status: number, body: unknown): void {
  response
    .status(status)
    .set("Cache-Control", "no-store")
    .set("X-Content-Type-Options", "nosniff")
    .json(body);
}

function requestOrigin(request: Request): string | null {
  const value = request.get("origin");
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return "invalid";
  }
}

function allowedOrigins(): Set<string> {
  return new Set(
    (process.env.CEFIP_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .flatMap((value) => {
        try {
          return [new URL(value).origin];
        } catch {
          return [];
        }
      }),
  );
}

function originIsAllowed(request: Request, origin: string | null): boolean {
  if (!origin) return true;
  if (origin === "invalid") return false;
  if (allowedOrigins().has(origin)) return true;

  const forwardedHost = request.get("x-forwarded-host")?.split(",")[0]?.trim();
  const requestHost = forwardedHost || request.get("host");
  if (!requestHost) return false;

  try {
    return new URL(origin).host.toLowerCase() === requestHost.toLowerCase();
  } catch {
    return false;
  }
}

function applyCors(response: Response, origin: string | null): void {
  if (!origin || origin === "invalid") return;
  response.set("Access-Control-Allow-Origin", origin);
  response.set("Vary", "Origin");
}

function parseMultipart(request: Request): Promise<ParsedMultipart> {
  const contentType = request.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    throw new RequestError(415, "Očekáváme formulář s přílohami.");
  }

  const rawBody = request.rawBody;
  if (!rawBody || !Buffer.isBuffer(rawBody)) {
    throw new RequestError(400, "Formulář se nepodařilo načíst.");
  }
  if (rawBody.length > MAX_BODY_BYTES) {
    throw new RequestError(413, "Přílohy jsou příliš velké.");
  }

  return new Promise((resolve, reject) => {
    const fields = Object.create(null) as Record<string, string>;
    const photos: ParsedPhoto[] = [];
    let totalPhotoBytes = 0;
    let parseError: RequestError | null = null;
    let settled = false;

    const fail = (error: RequestError) => {
      if (!parseError) parseError = error;
    };

    let parser: ReturnType<typeof Busboy>;
    try {
      parser = Busboy({
        headers: request.headers,
        limits: {
          fields: MAX_FIELDS,
          fieldSize: MAX_FIELD_BYTES,
          files: MAX_PHOTOS,
          fileSize: MAX_PHOTO_BYTES,
          parts: MAX_FIELDS + MAX_PHOTOS,
        },
      });
    } catch {
      throw new RequestError(400, "Formulář se nepodařilo načíst.");
    }

    parser.on("field", (name, value, info) => {
      if (info.valueTruncated) {
        fail(new RequestError(422, "Zkontrolujte formulář.", { form: "Některé pole je příliš dlouhé." }));
        return;
      }
      fields[name] = value;
    });

    parser.on("file", (fieldName, stream, info) => {
      const chunks: Buffer[] = [];
      let fileBytes = 0;
      let truncated = false;
      const supported = fieldName === "photos" && Boolean(ALLOWED_MIME[info.mimeType]);

      if (!supported) {
        fail(new RequestError(422, "Zkontrolujte formulář.", {
          photos: "Nahrajte podporované fotografie.",
        }));
      }

      stream.on("limit", () => {
        truncated = true;
        fail(new RequestError(422, "Zkontrolujte formulář.", {
          photos: "Každá fotografie může mít nejvýše 8 MB.",
        }));
      });

      stream.on("data", (chunk: Buffer) => {
        fileBytes += chunk.length;
        totalPhotoBytes += chunk.length;
        if (totalPhotoBytes > MAX_TOTAL_PHOTO_BYTES) {
          fail(new RequestError(422, "Zkontrolujte formulář.", {
            photos: "Fotografie mohou mít celkem nejvýše 22 MB.",
          }));
        }
        if (supported && !truncated && totalPhotoBytes <= MAX_TOTAL_PHOTO_BYTES) chunks.push(chunk);
      });

      stream.on("end", () => {
        if (supported && !truncated && fileBytes > 0 && totalPhotoBytes <= MAX_TOTAL_PHOTO_BYTES) {
          photos.push({ contentType: info.mimeType, data: Buffer.concat(chunks) });
        }
      });

      stream.on("error", () => {
        fail(new RequestError(400, "Formulář se nepodařilo načíst."));
      });
    });

    parser.on("fieldsLimit", () => {
      fail(new RequestError(422, "Zkontrolujte formulář.", { form: "Formulář obsahuje příliš mnoho polí." }));
    });
    parser.on("filesLimit", () => {
      fail(new RequestError(422, "Zkontrolujte formulář.", { photos: "Nahrajte nejvýše 5 fotografií." }));
    });
    parser.on("partsLimit", () => {
      fail(new RequestError(422, "Zkontrolujte formulář.", { form: "Formulář obsahuje příliš mnoho částí." }));
    });
    parser.on("error", () => {
      if (settled) return;
      settled = true;
      reject(new RequestError(400, "Formulář se nepodařilo načíst."));
    });
    parser.on("close", () => {
      if (settled) return;
      settled = true;
      if (parseError) reject(parseError);
      else resolve({ fields, photos });
    });

    parser.end(rawBody);
  });
}

function expiryOneYearAfter(date: Date): Timestamp {
  const expiresAt = new Date(date);
  expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 1);
  return Timestamp.fromDate(expiresAt);
}

async function createLead(lead: NormalizedLead): Promise<SavedLead> {
  const leadReference = firestore.collection("leads").doc(lead.submissionId);
  const candidateLeadId = randomUUID();
  const candidateEventId = randomUUID();
  const created = new Date();
  const createdAt = Timestamp.fromDate(created);

  return firestore.runTransaction(async (transaction) => {
    const existing = await transaction.get(leadReference);
    if (existing.exists) {
      const data = existing.data();
      if (typeof data?.id !== "string" || typeof data.eventId !== "string") {
        throw new Error("invalid_existing_lead");
      }
      return { id: data.id, eventId: data.eventId, duplicate: true };
    }

    transaction.create(leadReference, {
      id: candidateLeadId,
      submissionId: lead.submissionId,
      eventId: candidateEventId,
      createdAt,
      createdAtIso: created.toISOString(),
      expiresAt: expiryOneYearAfter(created),
      serviceType: lead.serviceType,
      landingVariant: lead.landingVariant,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      location: lead.location,
      propertyType: lead.propertyType,
      message: lead.message,
      details: lead.details,
      contactPreference: lead.contactPreference,
      utmSource: lead.utmSource,
      utmMedium: lead.utmMedium,
      utmCampaign: lead.utmCampaign,
      utmTerm: lead.utmTerm,
      utmContent: lead.utmContent,
      campaignId: lead.campaignId,
      adsetId: lead.adsetId,
      adId: lead.adId,
      placement: lead.placement,
      landingPath: lead.landingPath,
      referrerOrigin: lead.referrerOrigin,
      privacyAcknowledged: true,
      privacyVersion: lead.privacyVersion,
      status: "new",
    });

    return { id: candidateLeadId, eventId: candidateEventId, duplicate: false };
  });
}

function errorCode(error: unknown): string {
  if (typeof error === "object" && error && "code" in error && typeof error.code === "string") {
    return error.code.slice(0, 80);
  }
  return "unknown";
}

async function uploadPhotos(
  submissionId: string,
  leadId: string,
  photos: ParsedPhoto[],
): Promise<number> {
  const configuredBucket = process.env.CEFIP_STORAGE_BUCKET?.trim();
  const bucket = configuredBucket ? storage.bucket(configuredBucket) : storage.bucket();
  let uploaded = 0;

  for (const photo of photos) {
    const fileId = randomUUID();
    const extension = ALLOWED_MIME[photo.contentType];
    const storagePath = `lead-uploads/${leadId}/${fileId}.${extension}`;
    const storageFile = bucket.file(storagePath);
    const created = new Date();

    try {
      await storageFile.save(photo.data, {
        resumable: false,
        validation: "crc32c",
        metadata: {
          contentType: photo.contentType,
          cacheControl: "private, no-store, max-age=0",
          contentDisposition: "attachment",
          metadata: { leadId, submissionId },
        },
      });

      await firestore.collection("leadFiles").doc(fileId).create({
        id: fileId,
        leadId,
        submissionId,
        storagePath,
        bucket: bucket.name,
        contentType: photo.contentType,
        sizeBytes: photo.data.length,
        createdAt: Timestamp.fromDate(created),
        createdAtIso: created.toISOString(),
      });
      uploaded += 1;
    } catch (error) {
      logger.warn("lead_photo_upload_failed", { leadId, fileId, code: errorCode(error) });
      try {
        await storageFile.delete({ ignoreNotFound: true });
      } catch {
        logger.warn("lead_photo_cleanup_failed", { leadId, fileId });
      }
    }
  }

  return uploaded;
}

export const submitLead = onRequest(
  {
    region: "europe-west1",
    minInstances: 0,
    maxInstances: 3,
    memory: "512MiB",
    timeoutSeconds: 60,
    invoker: "public",
    cors: false,
  },
  async (request, response) => {
    const origin = requestOrigin(request);
    if (!originIsAllowed(request, origin)) {
      sendJson(response, 403, { ok: false, message: "Neplatný původ požadavku." });
      return;
    }
    applyCors(response, origin);

    if (request.method === "OPTIONS") {
      response
        .status(204)
        .set("Access-Control-Allow-Methods", "POST, OPTIONS")
        .set("Access-Control-Allow-Headers", "Content-Type")
        .set("Access-Control-Max-Age", "3600")
        .send();
      return;
    }
    if (request.method !== "POST") {
      response.set("Allow", "POST, OPTIONS");
      sendJson(response, 405, { ok: false, message: "Použijte metodu POST." });
      return;
    }

    const contentLength = Number(request.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      sendJson(response, 413, { ok: false, message: "Přílohy jsou příliš velké." });
      return;
    }

    try {
      const { fields, photos } = await parseMultipart(request);

      if (clipped(fields, "website", 100)) {
        sendJson(response, 201, { ok: true, eventId: randomUUID() });
        return;
      }

      const validation = validateLead(fields);
      if (!validation.ok) {
        sendJson(response, 422, {
          ok: false,
          message: "Zkontrolujte formulář.",
          errors: validation.errors,
        });
        return;
      }

      const saved = await createLead(validation.value);
      const uploaded = saved.duplicate
        ? 0
        : await uploadPhotos(validation.value.submissionId, saved.id, photos);

      sendJson(response, 201, {
        ok: true,
        leadId: saved.id,
        eventId: saved.eventId,
        uploaded,
        uploadWarning: !saved.duplicate && uploaded < photos.length,
      });
    } catch (error) {
      if (error instanceof RequestError) {
        sendJson(response, error.status, {
          ok: false,
          message: error.message,
          ...(error.errors ? { errors: error.errors } : {}),
        });
        return;
      }

      logger.error("lead_form_failed", { code: errorCode(error) });
      sendJson(response, 500, {
        ok: false,
        message: "Poptávku se nyní nepodařilo uložit. Zkuste to znovu nebo zavolejte na +420 730 535 775.",
      });
    }
  },
);
