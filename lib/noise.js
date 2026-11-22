// Mic enhancement: routes a raw getUserMedia stream through the talk-noise
// worklet (RNNoise AI denoise + noise gate) and returns a stream whose audio
// track is the cleaned one. Video tracks pass through untouched. Any failure
// (old browser, worklet or wasm unavailable) falls back to the raw stream —
// noise suppression must never break a call.

let wasmBinaryPromise = null;
function loadWasmBinary() {
  if (!wasmBinaryPromise) {
    wasmBinaryPromise = fetch('/api/wasm/rnnoise.wasm')
      .then(r => { if (!r.ok) throw new Error('wasm'); return r.arrayBuffer(); })
      .catch(e => { wasmBinaryPromise = null; throw e; });
  }
  return wasmBinaryPromise;
}

export async function enhanceMicStream(rawStream) {
  const fallback = { stream: rawStream, close: () => {} };
  try {
    if (typeof window === 'undefined' || !window.AudioWorkletNode || !window.AudioContext) return fallback;
    const audioTrack = rawStream.getAudioTracks()[0];
    if (!audioTrack) return fallback;
    const wasmBinary = await loadWasmBinary();
    const ctx = new AudioContext({ sampleRate: 48000 });
    await ctx.audioWorklet.addModule('/worklets/talk-noise.js', { type: 'module' });
    const src = ctx.createMediaStreamSource(new MediaStream([audioTrack]));
    const node = new AudioWorkletNode(ctx, 'talk-noise', {
      processorOptions: { wasmBinary },
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });
    const dest = ctx.createMediaStreamDestination();
    src.connect(node);
    node.connect(dest);
    if (ctx.state === 'suspended') { try { await ctx.resume(); } catch {} }
    const out = new MediaStream();
    dest.stream.getAudioTracks().forEach(t => out.addTrack(t));
    rawStream.getVideoTracks().forEach(t => out.addTrack(t));
    return {
      stream: out,
      close: () => {
        try { node.disconnect(); } catch {}
        try { src.disconnect(); } catch {}
        try { ctx.close(); } catch {}
        try { audioTrack.stop(); } catch {}
      },
    };
  } catch {
    return fallback;
  }
}
