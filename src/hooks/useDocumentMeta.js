import { useEffect } from 'react';

const setMeta = (attr, key, content) => {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

/*
  Per-page <title>, description and Open Graph tags for the public site.
  Restores the previous title when the page unmounts.
*/
export default function useDocumentMeta({ title, description, image }) {
  useEffect(() => {
    const prevTitle = document.title;
    if (title) document.title = title;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:image', image);
    setMeta('property', 'og:url', window.location.href);
    return () => { document.title = prevTitle; };
  }, [title, description, image]);
}
