import { AbiCoder } from "ethers";

export type CharterKey = "charter" | "constitution" | "soul";

export interface CharterTexts {
  charter: string;
  constitution: string;
  soul: string;
}

export interface CharterCids {
  charter: string;
  constitution: string;
  soul: string;
}

export interface AttestationInput {
  texts: CharterTexts;
  cids: CharterCids;
  version: string;
  date: number | Date;
}

export interface AttestationPayload {
  schema: string;
  data: string;
  digests: Record<CharterKey, string>;
}

export const KEYS: readonly CharterKey[] = ["charter", "constitution", "soul"] as const;

// One schema for every attestation, so old and new attestations share a decoder.
export const SCHEMA =
  "string charterDigest,string constitutionDigest,string soulDigest," +
  "string charterCid,string constitutionCid,string soulCid," +
  "string version,uint64 date";

export const SCHEMA_UID_INPUT = SCHEMA;

const coder = AbiCoder.defaultAbiCoder();

export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toUnixSeconds(date: number | Date): number {
  const value = date instanceof Date ? Math.floor(date.getTime() / 1000) : Math.floor(date);
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError("date must be a non negative integer of unix seconds");
  }
  return value;
}

function requireText(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${label} must be a non empty string`);
  }
  return value;
}

export async function buildAttestation(input: AttestationInput): Promise<AttestationPayload> {
  const digests = {} as Record<CharterKey, string>;
  const cids = {} as Record<CharterKey, string>;

  for (const key of KEYS) {
    const text = requireText(input.texts?.[key], `texts.${key}`);
    digests[key] = await sha256Hex(text);
    cids[key] = requireText(input.cids?.[key], `cids.${key}`);
  }

  const version = requireText(input.version, "version");
  const date = toUnixSeconds(input.date);

  const data = coder.encode(
    ["string", "string", "string", "string", "string", "string", "string", "uint64"],
    [
      digests.charter,
      digests.constitution,
      digests.soul,
      cids.charter,
      cids.constitution,
      cids.soul,
      version,
      date,
    ],
  );

  return { schema: SCHEMA, data, digests };
}

export function decodeAttestation(data: string) {
  const [charterDigest, constitutionDigest, soulDigest, charterCid, constitutionCid, soulCid, version, date] =
    coder.decode(
      ["string", "string", "string", "string", "string", "string", "string", "uint64"],
      data,
    );
  return {
    digests: { charter: charterDigest, constitution: constitutionDigest, soul: soulDigest },
    cids: { charter: charterCid, constitution: constitutionCid, soul: soulCid },
    version,
    date: Number(date),
  };
}
