/*
  Where "Get the Android app" goes: the Reconnct listing on Google Play.
  Package = twa/twa-manifest.json → packageId (com.reconnct.web). Override with
  VITE_PLAY_STORE_URL if the listing ever moves. On an Android phone Chrome
  opens this link straight in the Play Store app.
*/
export const PLAY_PACKAGE_ID = 'com.reconnct.web';
export const PLAY_STORE_URL = import.meta.env.VITE_PLAY_STORE_URL
  || `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE_ID}`;
