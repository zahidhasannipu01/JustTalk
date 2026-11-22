// Own-voice speech capture for AI speaking reports.
//
// The calls themselves are peer-to-peer and never touch a server, so the
// only place a user's speaking can be turned into text is their own
// browser. When (and only when) the user has AI reports switched on, this
// runs the browser's built-in speech recognition on THEIR OWN microphone
// during a call and collects the final transcript pieces. No audio is
// recorded or sent anywhere — only text chunks, posted to /api/ai/capture
// by the caller. If recognition is unavailable (browser, permissions,
// non-secure context) capture silently does nothing and calls are
// completely unaffected.
export function startSpeechCapture() {
  const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  if (!SR) return null;
  let rec = null;
  let stopped = false;
  let dead = false; // recognition refused — never retry this call
  let parts = [];
  let confSum = 0;
  let confN = 0;

  function start() {
    if (stopped || dead) return;
    try {
      rec = new SR();
      rec.lang = 'en-US';
      rec.continuous = true;
      rec.interimResults = false;
      rec.onresult = e => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (!r.isFinal) continue;
          const alt = r[0];
          const text = (alt?.transcript || '').trim();
          if (!text) continue;
          parts.push(text);
          if (typeof alt.confidence === 'number' && alt.confidence > 0) { confSum += alt.confidence; confN++; }
        }
      };
      rec.onerror = e => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture') dead = true;
      };
      rec.onend = () => { if (!stopped && !dead) { try { rec.start(); } catch {} } };
      rec.start();
    } catch { dead = true; }
  }
  start();

  return {
    // Take the transcript collected since the last flush.
    flush() {
      if (!parts.length) return null;
      const text = parts.join(' ');
      parts = [];
      const words = text.split(/\s+/).filter(Boolean).length;
      const out = {
        text,
        words,
        seconds: Math.max(1, Math.round(words / 2.5)), // ~150 wpm speaking pace
        confidence: confN ? Number((confSum / confN).toFixed(3)) : null,
      };
      confSum = 0; confN = 0;
      return out;
    },
    stop() {
      stopped = true;
      try { rec && rec.stop(); } catch {}
    },
  };
}
