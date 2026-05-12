/**
 * openclaw-cartesia — Cartesia Sonic-2 speech provider plugin for OpenClaw.
 *
 * Registers the Cartesia speech provider so OpenClaw's messages.tts pipeline,
 * the talk-voice CLI, and any channel that supports voice notes (Telegram,
 * Slack, etc.) can speak using Cartesia's cloned voices.
 *
 * Usage in openclaw.json:
 *
 *   {
 *     "plugins": {
 *       "allow": ["cartesia"],
 *       "entries": { "cartesia": { "enabled": true } }
 *     },
 *     "messages": {
 *       "tts": {
 *         "persona": "dobby",
 *         "personas": {
 *           "dobby": {
 *             "providers": {
 *               "cartesia": {
 *                 "voiceId": { "source": "env", "provider": "default-env", "id": "CARTESIA_VOICE_ID" }
 *               }
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

const cartesiaPlugin = definePluginEntry({
  id: "cartesia",
  name: "Cartesia Speech",
  description: "OpenClaw speech provider for Cartesia Sonic-2 (voice notes, TTS, voice cloning).",
  register(api) {
    if (api.registrationMode === "discovery" || api.registrationMode === "setup-only") {
      // capability discovery — no side effects
      api.registerSpeechProvider(buildCartesiaSpeechProvider());
      return;
    }
    api.registerSpeechProvider(buildCartesiaSpeechProvider());
  },
});

export default cartesiaPlugin;
export { buildCartesiaSpeechProvider, CARTESIA_DEFAULT_MODEL, CARTESIA_TTS_MODELS } from "./speech-provider.js";
export { cartesiaSynthesize, pcmToOggOpus } from "./cartesia-tts.js";
