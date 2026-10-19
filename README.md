# lax-charter-attestation

One EAS attestation payload from the Charter, the Constitution and the SOUL texts, plus their IPFS ids.

`buildAttestation({ texts, cids, version, date }) -> { schema, data, digests }`

## Install

```bash
npm install
npm test
npm run build
```

## Use

```ts
import { buildAttestation, decodeAttestation } from "lax-charter-attestation";

const payload = await buildAttestation({
  texts: { charter, constitution, soul },
  cids: { charter: "bafy...", constitution: "bafy...", soul: "bafy..." },
  version: "1.0",
  date: 1792400000,
});

// payload.schema is the stable schema string
// payload.data is the ABI encoded EAS data field
// payload.digests holds one sha256 hex per text
```

## Shape

`data` is ABI encoded in this fixed order, which is exactly the schema string:

```
string charterDigest, string constitutionDigest, string soulDigest,
string charterCid,    string constitutionCid,    string soulCid,
string version,       uint64 date
```

One schema for every attestation. A decoder built today reads an attestation written a year ago, because the schema string never changes when the texts do.

## Guarantees

- **Digests are sha256 of the exact text bytes**, UTF-8, lower case hex, 64 characters. The suite compares them against `node:crypto` so a browser and a server agree.
- **A changed text changes its digest and the payload**, and leaves the other digests untouched. Tested both ways.
- **The schema string is stable** across versions and dates. Tested by building two payloads with different versions and dates and comparing the schema.
- **Round trip.** `decodeAttestation(data)` returns the digests, the cids, the version and the date, so a verifier does not need to trust the caller.
- **Refusals are typed.** An empty text, an empty cid or a negative date throws a `TypeError` naming the field, rather than encoding a silent zero.

## Files

- `src/attestation.ts`, types, the schema constant, the pure builder and the decoder.
- `test/attestation.test.ts`, 13 tests: digest parity with node crypto, changed text changes the digest, changed text changes the payload but not the schema, stable schema, round trip, Date handling, and three refusal cases.

## House rules honoured

Latin digits only, no long dashes in text people see, no secrets, no network calls, small single concern files, and the tests fail without the change. Swapping the digest algorithm to SHA-384 fails two tests, which I verified by mutation before pushing.

## Licence

MIT.
