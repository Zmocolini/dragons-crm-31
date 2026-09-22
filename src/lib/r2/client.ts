import "server-only";
import { S3Client } from "@aws-sdk/client-s3";

const endpoint = process.env.R2_ENDPOINT!;
const region = "auto";
const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
export const R2_BUCKET = process.env.R2_BUCKET!;
export const R2_PREFIX = process.env.R2_PREFIX ?? "crm31";
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL ?? "";

export const r2 = new S3Client({
  region,
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
});

export function keyForCourierDoc(courierId: string, docType: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${R2_PREFIX}/couriers/${courierId}/${docType}/${Date.now()}-${safe}`;
}

export function publicUrlFor(key: string): string {
  if (!R2_PUBLIC_URL) return "";
  return `${R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
}
