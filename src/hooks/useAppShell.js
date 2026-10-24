/*
  The installed app shows exactly the same responsive website as a phone
  browser (sidebar drawer + topbar dashboards), so the separate app shell
  (app bar + bottom tabs) is switched off everywhere. Layouts still call this
  hook; flip it back to a width/PWA check to bring the app shell back.
*/
export default function useAppShell() {
  return false;
}
