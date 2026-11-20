import { AccessToken } from 'livekit-server-sdk';

// Crystal-clear call defaults: high-bitrate Opus, dynacast + adaptive stream.
export const PUBLISH_DEFAULTS = {
  audioPreset: { maxBitrate: 51000 }, // Opus high quality for voice
  dtx: true,
  red: true,
};
export async function livekitToken(identity, name, roomName, canPublish = true) {
  const at = new AccessToken(process.env.LIVEKIT_API_KEY || 'devkey', process.env.LIVEKIT_API_SECRET || '', {
    identity: String(identity), name: name || '', ttl: '2h',
  });
  at.addGrant({ roomJoin: true, room: roomName, canPublish, canSubscribe: true, canPublishData: true });
  return await at.toJwt();
}
export function livekitUrl() { return process.env.LIVEKIT_URL || 'ws://127.0.0.1:7880'; }
