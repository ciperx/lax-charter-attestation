import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { buildAttestation, decodeAttestation, sha256Hex, SCHEMA } from "../src/attestation";

const texts = {
  charter: "One Charter. Article 1. The commons comes first.",
  constitution: "Constitution. Five immutable laws.",
  soul: "SOUL: memory, keys and earnings stay with the citizen.",
};
const cids = {
  charter: "bafybeicharter0000000000000000000000000000000000000000000000",
  constitution: "bafybeiconstitution00000000000000000000000000000000000000000",
  soul: "bafybeisoul0000000000000000000000000000000000000000000000000",
};
const base = { texts, cids, version: "1.0", date: 1792400000 };

const nodeSha = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

describe("sha256Hex", () => {
  it("matches the platform sha256 of the same bytes", async () => {
    expect(await sha256Hex(texts.charter)).toBe(nodeSha(texts.charter));
  });

  it("is stable across calls", async () => {
    expect(await sha256Hex("abc")).toBe(await sha256Hex("abc"));
  });
});

describe("buildAttestation", () => {
  it("digests each text with sha256", async () => {
    const out = await buildAttestation(base);
    expect(out.digests.charter).toBe(nodeSha(texts.charter));
    expect(out.digests.constitution).toBe(nodeSha(texts.constitution));
    expect(out.digests.soul).toBe(nodeSha(texts.soul));
  });

  it("changes the digest when the text changes", async () => {
    const before = await buildAttestation(base);
    const after = await buildAttestation({
      ...base,
      texts: { ...texts, soul: texts.soul + " Amended." },
    });
    expect(after.digests.soul).not.toBe(before.digests.soul);
    expect(after.digests.charter).toBe(before.digests.charter);
  });

  it("changes the payload when the text changes but the schema stays", async () => {
    const before = await buildAttestation(base);
    const after = await buildAttestation({ ...base, texts: { ...texts, charter: texts.charter + " v2" } });
    expect(after.data).not.toBe(before.data);
    expect(after.schema).toBe(before.schema);
  });

  it("keeps one stable schema string", async () => {
    const a = await buildAttestation(base);
    const b = await buildAttestation({ ...base, version: "2.0", date: 1792500000 });
    expect(a.schema).toBe(SCHEMA);
    expect(b.schema).toBe(SCHEMA);
    expect(a.schema).toBe(b.schema);
  });

  it("round trips through the decoder", async () => {
    const out = await buildAttestation(base);
    const back = decodeAttestation(out.data);
    expect(back.digests).toEqual(out.digests);
    expect(back.cids).toEqual(cids);
    expect(back.version).toBe("1.0");
    expect(back.date).toBe(1792400000);
  });

  it("accepts a Date for date and floors it to seconds", async () => {
    const out = await buildAttestation({ ...base, date: new Date(1792400000999) });
    expect(decodeAttestation(out.data).date).toBe(1792400000);
  });

  it("refuses an empty text", async () => {
    await expect(buildAttestation({ ...base, texts: { ...texts, soul: "   " } })).rejects.toThrow(/soul/);
  });

  it("refuses a missing cid", async () => {
    await expect(
      buildAttestation({ ...base, cids: { ...cids, constitution: "" } }),
    ).rejects.toThrow(/constitution/);
  });

  it("refuses a negative date", async () => {
    await expect(buildAttestation({ ...base, date: -1 })).rejects.toThrow(/date/);
  });

  it("is deterministic for the same input", async () => {
    const a = await buildAttestation(base);
    const b = await buildAttestation(base);
    expect(a).toEqual(b);
  });
});
