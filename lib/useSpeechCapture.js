import { useEffect } from 'react';
import { api } from './toast';
import { startSpeechCapture } from './speech';

// While `active`, transcribe the user's own voice (see lib/speech.js) and
// post a chunk to /api/ai/capture every 20 seconds and once more when the
// call view unmounts. Inert when AI reports are off or the browser has no
// speech recognition.
export function useSpeechCapture(active, callId) {
  useEffect(() => {
    if (!active) return;
    const cap = startSpeechCapture();
    if (!cap) return;
    const post = () => {
      const chunk = cap.flush();
      if (chunk) api('/api/ai/capture', { method: 'POST', body: { call_id: callId || null, ...chunk } }).catch(() => {});
    };
    const t = setInterval(post, 20000);
    return () => { clearInterval(t); post(); cap.stop(); };
  }, [active, callId]);
}
