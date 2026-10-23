#!/usr/bin/env node
/*
  Puts a freshly built TWA APK behind the website's "Download APK" button.

    node frontend/scripts/publish-apk.mjs <path/to/app-release-signed.apk> <versionName> <versionCode> [playUrl]

  Copies it to frontend/public/downloads/reconnct.apk and rewrites
  downloads/version.json (read by /download). Commit + deploy the frontend after.
*/
import { copyFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [apk, versionName, versionCode, playUrl] = process.argv.slice(2);
if (!apk || !versionName || !versionCode || !existsSync(apk)) {
  console.error('Usage: node frontend/scripts/publish-apk.mjs <apk> <versionName> <versionCode> [playUrl]');
  process.exit(1);
}

const downloads = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'downloads');
copyFileSync(apk, join(downloads, 'reconnct.apk'));
const sizeMB = Math.round((statSync(apk).size / (1024 * 1024)) * 10) / 10;
writeFileSync(join(downloads, 'version.json'), `${JSON.stringify({
  available: true,
  versionName,
  versionCode: Number(versionCode),
  sizeMB,
  playUrl: playUrl || null,
  publishedAt: new Date().toISOString(),
}, null, 2)}\n`);
console.log(`APK published: downloads/reconnct.apk (${sizeMB} MB, v${versionName} / ${versionCode}).`);
