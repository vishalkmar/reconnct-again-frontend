import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import api from '../services/api';

/*
  Where the "Unsubscribe" link in every occasion email lands.

  No login, no confirmation step, no "are you sure" — the HMAC token in the
  link is the authorisation, and making someone sign in to stop marketing mail
  is how a sending domain collects spam reports. One page load and they are out.
*/
export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState({ status: 'working', message: '' });

  useEffect(() => {
    if (!token) {
      setState({ status: 'error', message: 'This link is missing its unsubscribe code.' });
      return;
    }
    let alive = true;
    api.post('/campaigns/unsubscribe', { token })
      .then((res) => {
        if (!alive) return;
        setState({ status: 'done', message: res.data?.data?.email || '' });
      })
      .catch((err) => {
        if (!alive) return;
        setState({ status: 'error', message: err.response?.data?.message || 'That link is no longer valid.' });
      });
    return () => { alive = false; };
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="bg-white rounded-2xl shadow-soft p-8 max-w-md w-full text-center">
        {state.status === 'working' && (
          <>
            <Loader2 size={28} className="animate-spin mx-auto text-brand mb-3" />
            <p className="text-sm text-ink-muted">Updating your preferences…</p>
          </>
        )}

        {state.status === 'done' && (
          <>
            <CheckCircle2 size={30} className="mx-auto text-emerald-600 mb-3" />
            <h1 className="font-display font-bold text-xl mb-2">You're unsubscribed</h1>
            <p className="text-sm text-ink-muted">
              {state.message ? <>No more festival, weekend or birthday greetings to <strong>{state.message}</strong>. </> : 'No more festival, weekend or birthday greetings. '}
              Booking confirmations and trip reminders still come through — those are not marketing.
            </p>
            <p className="text-xs text-ink-muted mt-4">
              Changed your mind? Turn greetings back on any time from your profile.
            </p>
            <Link to="/" className="inline-block mt-5 px-5 py-2.5 rounded-lg bg-brand text-ink text-sm font-bold">
              Back to reconnct
            </Link>
          </>
        )}

        {state.status === 'error' && (
          <>
            <AlertTriangle size={30} className="mx-auto text-amber-500 mb-3" />
            <h1 className="font-display font-bold text-xl mb-2">Link not valid</h1>
            <p className="text-sm text-ink-muted">{state.message}</p>
            <Link to="/" className="inline-block mt-5 px-5 py-2.5 rounded-lg bg-brand text-ink text-sm font-bold">
              Back to reconnct
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
