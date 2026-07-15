import { useCallback, useRef, useState } from 'react';

// Browser-native voice recording (MediaRecorder) — no extra dependency.
// Hold to record, release to get the finished Blob via onRecorded. Used by
// both the user/host chat composer and the admin reply composer.
export function useVoiceRecorder({ onRecorded, onError }) {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const start = useCallback(async () => {
    if (mediaRecorderRef.current) return; // already recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        // Skip accidental taps that never really recorded anything.
        if (blob.size > 800) onRecorded?.(blob);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch (e) {
      onError?.(e);
    }
  }, [onRecorded, onError]);

  const stop = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') mr.stop();
    setRecording(false);
  }, []);

  return { recording, start, stop };
}
