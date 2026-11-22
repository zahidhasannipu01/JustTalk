// Talk noise suppression worklet: RNNoise (AI denoise) + a soft noise gate.
// The mic stream runs through this before it reaches any peer: RNNoise
// removes steady background noise (fan, street, keyboard), then the gate
// pushes the leftover floor down while nobody is speaking. Always on —
// if anything fails to load, lib/noise.js falls back to the raw mic.
import createRNNWasmModule from '/api/wasm/rnnoise-glue.js';

const FRAME = 480; // RNNoise works on 10 ms frames at 48 kHz

class TalkNoiseProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.ready = false;
    this.gateGain = 1;
    this.gateTarget = 1;
    this.hold = 0;
    this.floor = null;
    this.floorN = 0;
    this.inBuf = new Float32Array(FRAME);
    this.inFill = 0;
    this.outBuf = new Float32Array(FRAME);
    this.outRead = FRAME; // empty until the first frame is processed
    const wasmBinary = options.processorOptions && options.processorOptions.wasmBinary;
    createRNNWasmModule(wasmBinary ? { wasmBinary } : {})
      .then(Module => {
        this.M = Module;
        this.state = Module._rnnoise_create();
        this.inPtr = Module._malloc(FRAME * 4);
        this.outPtr = Module._malloc(FRAME * 4);
        this.ready = true;
        this.port.postMessage('ready');
      })
      .catch(() => this.port.postMessage('error'));
  }

  runFrame() {
    const M = this.M;
    const heap = M.HEAPF32;
    const inBase = this.inPtr >> 2;
    const outBase = this.outPtr >> 2;
    for (let i = 0; i < FRAME; i++) heap[inBase + i] = this.inBuf[i] * 32767;
    M._rnnoise_process_frame(this.state, this.outPtr, this.inPtr);
    let sum = 0;
    for (let i = 0; i < FRAME; i++) {
      const v = heap[outBase + i] / 32767;
      this.outBuf[i] = v;
      sum += v * v;
    }
    // Adaptive soft gate on the denoised signal: a floor tracker learns the
    // leftover noise level while the gate is shut (it freezes while speech
    // passes, so speech can't teach it). Signal clearly above the floor
    // opens the gate; everything else decays to a low floor — never a hard
    // mute, so no choppy cut-offs. The first ~0.5 s calibrate the floor.
    const rms = Math.sqrt(sum / FRAME);
    if (this.floor == null) {
      this.floorSum = (this.floorSum || 0) + rms;
      if (++this.floorN >= 50) this.floor = Math.max(this.floorSum / 50, 0.002);
    } else if (this.gateTarget < 1) {
      this.floor += (rms - this.floor) * 0.05;
    }
    const open = this.floor != null && rms > this.floor * 1.8 + 0.002;
    if (open) this.hold = 20; // ~200 ms hangover after speech
    else if (this.hold > 0) this.hold--;
    const target = this.hold > 0 ? 1 : 0.12;
    this.gateTarget = target;
    const g0 = this.gateGain;
    for (let i = 0; i < FRAME; i++) this.outBuf[i] *= g0 + (target - g0) * (i / FRAME);
    this.gateGain = target;
    this.inFill = 0;
    this.outRead = 0;
  }

  process(inputs, outputs) {
    const input = inputs[0] && inputs[0][0];
    const output = outputs[0] && outputs[0][0];
    if (!output) return true;
    if (!input) { output.fill(0); return true; }
    if (!this.ready) { output.set(input); return true; } // raw passthrough until RNNoise is up
    for (let i = 0; i < input.length; i++) {
      this.inBuf[this.inFill++] = input[i];
      if (this.inFill === FRAME) this.runFrame();
      output[i] = this.outRead < FRAME ? this.outBuf[this.outRead++] : 0;
    }
    return true;
  }
}

registerProcessor('talk-noise', TalkNoiseProcessor);
