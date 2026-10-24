import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

/*
  Names every output chunk that ONLY admin/team code uses `staff-*.js`, so the
  service worker can leave it out of the installed app's precache (members and
  suppliers never download staff code). A module is staff-only when it lives in
  an admin/team folder, or when every module importing it is staff-only.
  Shared modules (e.g. ExperienceFormPage, reused by the host listing form)
  stay in normal chunks.
*/
const STAFF_PATH = /[\\/]src[\\/](pages[\\/](admin|team)|components[\\/](admin|team)|layouts[\\/](Admin|Team)Layout)/;
const staffOnly = new Set();
const staffChunks = {
  name: 'rc-staff-chunks',
  apply: 'build',
  buildEnd() {
    const memo = new Map();
    const isStaff = (id) => {
      if (memo.has(id)) return memo.get(id);
      memo.set(id, false); // cycles resolve conservatively
      const info = this.getModuleInfo(id);
      let res = false;
      if (info && !id.includes('node_modules') && !id.startsWith('\0')) {
        const importers = [...info.importers, ...info.dynamicImporters].filter((x) => !/[\\/]src[\\/]App\.jsx$/.test(x));
        if (STAFF_PATH.test(id)) res = importers.every(isStaff);
        else res = importers.length > 0 && importers.every(isStaff);
      }
      memo.set(id, res);
      return res;
    };
    for (const id of this.getModuleIds()) if (isStaff(id)) staffOnly.add(id);
  },
};

/*
  Dev-server safety net. If a production build (vite preview) was ever opened
  on this same origin, its service worker keeps serving that OLD build and the
  dev server's changes never show. In dev, /sw.js answers with a self-removing
  worker: the browser's routine update check picks it up, it clears the PWA
  caches, unregisters itself and reloads open tabs onto the dev server.
*/
const DEV_SW_KILL_SWITCH = `
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((c) => c.navigate(c.url));
  })());
});
`;
const devSwKillSwitch = {
  name: 'rc-dev-sw-kill-switch',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url && req.url.split('?')[0] === '/sw.js') {
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Cache-Control', 'no-store');
        res.end(DEV_SW_KILL_SWITCH);
        return;
      }
      next();
    });
  },
};

// Installable web app (member + supplier only — admin/team are blocked inside
// the installed app, see docs/web-pwa/design.md §2). The same manifest feeds
// the Play Store TWA build (docs/web-pwa/playstore.md).
const pwa = VitePWA({
  registerType: 'prompt', // applied automatically by PwaStatus.jsx
  // Registered from the app (components/pwa/PwaStatus.jsx → useRegisterSW).
  injectRegister: false,
  includeAssets: ['offline.html', 'retreatlogo.png', 'reconnct-logo-white.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png', 'icons/favicon-16.png'],
  manifest: {
    id: '/?source=pwa',
    name: 'Reconnct — experiences that connect',
    short_name: 'Reconnct',
    description: 'Discover and book curated experiences to reconnect with friends, family, your partner, kids and yourself.',
    lang: 'en-IN',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait',
    theme_color: '#FFB900',
    background_color: '#FFFFFF',
    categories: ['travel', 'lifestyle', 'entertainment'],
    icons: [
      ...[72, 96, 128, 144, 152, 192, 384, 512].map((s) => ({
        src: `/icons/icon-${s}.png`, sizes: `${s}x${s}`, type: 'image/png', purpose: 'any',
      })),
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Explore experiences', short_name: 'Explore', url: '/experiences?source=pwa', icons: [{ src: '/icons/icon-96.png', sizes: '96x96' }] },
      { name: 'My bookings', short_name: 'Bookings', url: '/dashboard/bookings?source=pwa', icons: [{ src: '/icons/icon-96.png', sizes: '96x96' }] },
      { name: 'Supplier dashboard', short_name: 'Supplier', url: '/supplier/dashboard?source=pwa', icons: [{ src: '/icons/icon-96.png', sizes: '96x96' }] },
    ],
    screenshots: [
      { src: '/screenshots/home-narrow.png', sizes: '540x1170', type: 'image/png', form_factor: 'narrow', label: 'Home — experiences for every moment' },
      { src: '/screenshots/home-wide.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide', label: 'Experience details and booking' },
    ],
  },
  workbox: {
    // App shell + public/member/supplier chunks are precached; staff-only
    // chunks (admin/team, see rc-staff-chunks) and big static files are not.
    globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2,webmanifest}'],
    globIgnores: ['**/staff-*.js', '**/screenshots/**', '**/contract-demo.pdf', '**/open.html', '**/downloads/**'],
    maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
    cleanupOutdatedCaches: true,
    // SPA: any in-app navigation is answered by the cached shell, offline too.
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//, /^\/\.well-known\//, /^\/downloads\//, /^\/offline\.html$/],
    runtimeCaching: [
      {
        // Public catalogue (experiences, taxonomy, banners, cities, geo) —
        // instant from cache, refreshed in the background. Works whether the
        // API is same-origin (/api) or the Render host (VITE_API_URL).
        urlPattern: ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/api/public/'),
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'rc-public-api',
          expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 },
          cacheableResponse: { statuses: [200] },
        },
      },
      {
        // Admin-editable legal text + logo info.
        urlPattern: ({ url, request }) => request.method === 'GET' && url.pathname === '/api/site-info',
        handler: 'StaleWhileRevalidate',
        options: { cacheName: 'rc-site-info', expiration: { maxEntries: 2, maxAgeSeconds: 7 * 24 * 60 * 60 }, cacheableResponse: { statuses: [200] } },
      },
      {
        // Everything else under /api — auth, bookings, payments, wishlist,
        // supplier, support — is private or must be live: never cached.
        urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
        handler: 'NetworkOnly',
      },
      {
        // Experience photos (/uploads, Unsplash, CDN).
        urlPattern: ({ request }) => request.destination === 'image',
        handler: 'CacheFirst',
        options: {
          cacheName: 'rc-images',
          expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60, purgeOnQuotaError: true },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
        handler: 'StaleWhileRevalidate',
        options: { cacheName: 'rc-font-css', cacheableResponse: { statuses: [0, 200] } },
      },
      {
        urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
        handler: 'CacheFirst',
        options: {
          cacheName: 'rc-fonts',
          expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
  devOptions: { enabled: false },
});

export default defineConfig({
  plugins: [react(), devSwKillSwitch, staffChunks, pwa],
  // Build stamp (shown on /download, logged by PwaStatus) — differs every build.
  define: { __APP_BUILD__: JSON.stringify(new Date().toISOString()) },
  build: {
    rollupOptions: {
      output: {
        chunkFileNames: (chunk) => (
          chunk.moduleIds.length && chunk.moduleIds.every((id) => staffOnly.has(id))
            ? 'assets/staff-[name]-[hash].js'
            : 'assets/[name]-[hash].js'
        ),
        // Heavy libraries in their own long-cached chunks.
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](recharts|d3-|victory-vendor)/.test(id)) return 'vendor-charts';
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return 'vendor-react';
          if (/[\\/]node_modules[\\/]framer-motion/.test(id)) return 'vendor-motion';
          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
});
