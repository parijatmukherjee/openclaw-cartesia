/**
 * SpeechProvider implementation for Cartesia, modeled after OpenClaw's
 * bundled ElevenLabs plugin (see `dist/speech-provider-*.js` in the openclaw
 * package for the interface shape).
 *
 * Public types (TypeScript):
 *   import type { SpeechProviderPlugin } from "openclaw/plugin-sdk/speech-core";
 *
 * Implements:
 *   - id, label, autoSelectOrder, models
 *   - resolveConfig({ rawConfig }) → normalized provider config
 *   - resolveTalkConfig({ baseTtsConfig, talkProviderConfig }) → talk-merge
 *   - isConfigured({ providerConfig }) → boolean
 *   - synthesize(req) → { audioBuffer, outputFormat, fileExtension, voiceCompatible }
 *   - synthesizeTelephony(req) → { audioBuffer, outputFormat, sampleRate }
 */

import { cartesiaSynthesize } from "./cartesia-tts.js";

export const CARTESIA_DEFAULT_MODEL = "sonic-2";

export const CARTESIA_TTS_MODELS = [
  { id: "sonic-2", label: "Sonic 2 (default)" },
  { id: "sonic-2-2025-03-07", label: "Sonic 2 (pinned)" },
];

function stringOrUndefined(v) {
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeConfig(rawConfig) {
  const cfg = (rawConfig && typeof rawConfig === "object") ? rawConfig : {};
  return {
    apiKey: stringOrUndefined(cfg.apiKey),
    voiceId: stringOrUndefined(cfg.voiceId),
    modelId: stringOrUndefined(cfg.modelId) ?? CARTESIA_DEFAULT_MODEL,
    baseUrl: stringOrUndefined(cfg.baseUrl) ?? "https://api.cartesia.ai",
    version: stringOrUndefined(cfg.version) ?? "2024-11-13",
    language: stringOrUndefined(cfg.language) ?? "en",
  };
}

export function buildCartesiaSpeechProvider() {
  const provider = {
    id: "cartesia",
    label: "Cartesia",
    autoSelectOrder: 25,
    models: CARTESIA_TTS_MODELS,

    resolveConfig({ rawConfig }) {
      return normalizeConfig(rawConfig);
    },

    resolveTalkConfig({ baseTtsConfig, talkProviderConfig }) {
      const base = normalizeConfig(baseTtsConfig);
      const talk = (talkProviderConfig && typeof talkProviderConfig === "object") ? talkProviderConfig : {};
      return {
        ...base,
        ...(stringOrUndefined(talk.apiKey) ? { apiKey: stringOrUndefined(talk.apiKey) } : {}),
        ...(stringOrUndefined(talk.voiceId) ? { voiceId: stringOrUndefined(talk.voiceId) } : {}),
        ...(stringOrUndefined(talk.modelId) ? { modelId: stringOrUndefined(talk.modelId) } : {}),
        ...(stringOrUndefined(talk.baseUrl) ? { baseUrl: stringOrUndefined(talk.baseUrl) } : {}),
        ...(stringOrUndefined(talk.language) ? { language: stringOrUndefined(talk.language) } : {}),
      };
    },

    isConfigured({ providerConfig }) {
      const cfg = normalizeConfig(providerConfig);
      return Boolean(cfg.apiKey ?? process.env.CARTESIA_API_KEY);
    },

    async listVoices() {
      // Cartesia has /voices but it's a v1 endpoint requiring different auth flow.
      // Return empty for now; users supply voiceId directly from the dashboard.
      return [];
    },

    async synthesize(req) {
      const cfg = normalizeConfig(req.providerConfig);
      const overrides = (req.providerOverrides && typeof req.providerOverrides === "object")
        ? req.providerOverrides
        : {};
      const apiKey = cfg.apiKey ?? process.env.CARTESIA_API_KEY;
      if (!apiKey) throw new Error("Cartesia API key missing (set providerConfig.apiKey or CARTESIA_API_KEY)");
      const voiceId = stringOrUndefined(overrides.voiceId) ?? cfg.voiceId;
      if (!voiceId) throw new Error("Cartesia voiceId missing (set providerConfig.voiceId or override.voiceId)");

      const isVoiceNote = req.target === "voice-note";
      const outputFormat = isVoiceNote
        ? "ogg_opus_48000_64"
        : (stringOrUndefined(overrides.outputFormat) ?? "mp3_44100_128");

      const audioBuffer = await cartesiaSynthesize({
        text: req.text,
        apiKey,
        voiceId,
        modelId: stringOrUndefined(overrides.modelId) ?? cfg.modelId,
        baseUrl: cfg.baseUrl,
        version: cfg.version,
        outputFormat,
        language: stringOrUndefined(overrides.language) ?? cfg.language,
        timeoutMs: req.timeoutMs ?? 30_000,
      });

      return {
        audioBuffer,
        outputFormat,
        fileExtension: outputFormat.startsWith("ogg") ? ".ogg" : ".mp3",
        voiceCompatible: outputFormat.startsWith("ogg"),
      };
    },

    async synthesizeTelephony(req) {
      const cfg = normalizeConfig(req.providerConfig);
      const overrides = (req.providerOverrides && typeof req.providerOverrides === "object")
        ? req.providerOverrides
        : {};
      const apiKey = cfg.apiKey ?? process.env.CARTESIA_API_KEY;
      if (!apiKey) throw new Error("Cartesia API key missing");
      const voiceId = stringOrUndefined(overrides.voiceId) ?? cfg.voiceId;
      if (!voiceId) throw new Error("Cartesia voiceId missing");

      const audioBuffer = await cartesiaSynthesize({
        text: req.text,
        apiKey,
        voiceId,
        modelId: stringOrUndefined(overrides.modelId) ?? cfg.modelId,
        baseUrl: cfg.baseUrl,
        version: cfg.version,
        outputFormat: "pcm_48000",
        language: stringOrUndefined(overrides.language) ?? cfg.language,
        timeoutMs: req.timeoutMs ?? 30_000,
      });

      return {
        audioBuffer,
        outputFormat: "pcm_48000",
        sampleRate: 48000,
      };
    },
  };

  return provider;
}
