/**
 * openclaw-cartesia — Cartesia Sonic-2 speech provider plugin for OpenClaw.
 *
 * Registers the Cartesia speech provider so OpenClaw's messages.tts pipeline,
 * the talk-voice CLI, and any channel that supports voice notes (Telegram,
 * Slack, etc.) can speak using Cartesia's cloned voices.
 *
 * Plugin config (under plugins.entries.cartesia.config):
 *   suppressDuplicateText: boolean  — if true, registers a message_sending hook
 *     that cancels the channel's text reply when the same turn just produced a
 *     Cartesia voice-note. Result: voice-only output (no text+voice duplicate).
 *
 * Usage in openclaw.json:
 *
 *   {
 *     "plugins": {
 *       "allow": ["cartesia"],
 *       "entries": {
 *         "cartesia": {
 *           "enabled": true,
 *           "config": { "suppressDuplicateText": true }
 *         }
 *       }
 *     },
 *     "messages": {
 *       "tts": {
 *         "enabled": true,
 *         "auto": "inbound",
 *         "provider": "cartesia",
 *         "persona": "dobby",
 *         "personas": {
 *           "dobby": {
 *             "providers": {
 *               "cartesia": { "voiceId": "<your-cartesia-voice-id>" }
 *             }
 *           }
 *         },
 *         "providers": {
 *           "cartesia": {
 *             "apiKey": { "source": "env", "provider": "default-env", "id": "CARTESIA_API_KEY" }
 *           }
 *         }
 *       }
 *     }
 *   }
 *
 * ffmpeg must be on PATH (used to transcode PCM → OGG/Opus for voice notes).
 */

import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { buildCartesiaSpeechProvider } from "./speech-provider.js";

// Per-session bookkeeping: marks turns where Cartesia just produced voice-note
// audio so the message_sending hook can suppress the matching text reply.
const recentVoiceTurns = new Map();
const VOICE_TURN_TTL_MS = 60_000;

function noteVoiceTurn(key) {
  const expiresAt = Date.now() + VOICE_TURN_TTL_MS;
  recentVoiceTurns.set(key, expiresAt);
  // opportunistic GC
  if (recentVoiceTurns.size > 256) {
    const now = Date.now();
    for (const [k, exp] of recentVoiceTurns) {
      if (exp < now) recentVoiceTurns.delete(k);
    }
  }
}

function consumeVoiceTurn(key) {
  const exp = recentVoiceTurns.get(key);
  if (!exp) return false;
  recentVoiceTurns.delete(key);
  return exp > Date.now();
}

const cartesiaPlugin = definePluginEntry({
  id: "cartesia",
  name: "Cartesia Speech",
  description: "OpenClaw speech provider for Cartesia Sonic-2 (voice notes, TTS, voice cloning).",
  register(api) {
    const config = api.config ?? {};
    const suppressDuplicateText = config.suppressDuplicateText === true;

    api.registerSpeechProvider(buildCartesiaSpeechProvider({
      onVoiceNoteSynthesized: (sessionKey) => {
        if (suppressDuplicateText && sessionKey) noteVoiceTurn(sessionKey);
      },
    }));

    if (suppressDuplicateText && typeof api.on === "function") {
      api.on("message_sending", (event) => {
        try {
          const sessionKey = event?.sessionKey ?? event?.context?.sessionKey;
          if (!sessionKey) return {};
          const hasText = Boolean(event?.message?.text || event?.text);
          const hasAttachment = Boolean(event?.message?.attachments?.length || event?.attachments?.length);
          if (!hasText || hasAttachment) return {};
          if (consumeVoiceTurn(sessionKey)) {
            return { cancel: true };
          }
        } catch {
          /* swallow — hook failures shouldn't break delivery */
        }
        return {};
      });
    }
  },
});

export default cartesiaPlugin;
export { buildCartesiaSpeechProvider, CARTESIA_DEFAULT_MODEL, CARTESIA_TTS_MODELS } from "./speech-provider.js";
export { cartesiaSynthesize, pcmToOggOpus } from "./cartesia-tts.js";
