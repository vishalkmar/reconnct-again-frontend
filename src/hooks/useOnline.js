import { useEffect, useState } from 'react';

/*
  Live online/offline flag. Also fires a window `rc:back-online` event when
  the connection returns, so data screens can refetch on their own (the web
  twin of the app's ConnectivityContext reconnectNonce).
*/
export default function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  return online;
}

// Subscribe a callback to "connection came back".
export function useOnBackOnline(fn) {
  useEffect(() => {
    window.addEventListener('rc:back-online', fn);
    return () => window.removeEventListener('rc:back-online', fn);
  }, [fn]);
}
