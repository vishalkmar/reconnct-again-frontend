#!/usr/bin/env node
/*
  Writes public/.well-known/assetlinks.json for the TWA.

    node twa/make-assetlinks.mjs   (run from frontend/) <SHA256> [<SHA256> ...]

  Pass BOTH fingerprints: the upload key (keytool output) and the Play App
  Signing key (Play Console → Test and release → App integrity). Format:
  AA:BB:CC:… (32 colon-separated hex pairs). Package id comes from
  twa/twa-manifest.json.
*/
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const fingerprints = process.argv.slice(2).map((s) => s.trim().toUpperCase());
const SHA = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

if (!fingerprints.length || fingerprints.some((f) => !SHA.test(f))) {
  console.error('Usage: node twa/make-assetlinks.mjs   (run from frontend/) AA:BB:…(32 pairs) [more…]');
  process.exit(1);
}

const { packageId } = JSON.parse(readFileSync(join(here, 'twa-manifest.json'), 'utf8'));
const out = join(here, '..', 'public', '.well-known', 'assetlinks.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify([{
  relation: ['delegate_permission/common.handle_all_urls'],
  target: { namespace: 'android_app', package_name: packageId, sha256_cert_fingerprints: fingerprints },
}], null, 2)}\n`);
console.log(`Wrote ${out} for ${packageId} with ${fingerprints.length} fingerprint(s). Deploy the frontend, then verify:`);
console.log('  https://developers.google.com/digital-asset-links/tools/generator');
