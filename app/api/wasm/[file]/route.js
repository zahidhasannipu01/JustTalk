import { readFile } from 'fs/promises';
import path from 'path';

// Serves the RNNoise wasm + its JS glue from node_modules so the audio
// worklet can load them same-origin without copying binaries into the repo.
const FILES = {
  'rnnoise.wasm': { file: 'rnnoise.wasm', type: 'application/wasm' },
  'rnnoise-glue.js': { file: 'rnnoise.js', type: 'application/javascript; charset=utf-8' },
};

export async function GET(req, { params }) {
  const { file } = await params;
  const meta = FILES[file];
  if (!meta) return new Response('Not found', { status: 404 });
  try {
    const p = path.join(process.cwd(), 'node_modules', '@jitsi', 'rnnoise-wasm', 'dist', meta.file);
    const buf = await readFile(p);
    return new Response(buf, {
      headers: { 'Content-Type': meta.type, 'Cache-Control': 'public, max-age=86400' },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
