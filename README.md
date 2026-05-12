# openclaw-cartesia — Cartesia Sonic-2 TTS for OpenClaw

[![npm version](https://img.shields.io/npm/v/openclaw-cartesia.svg)](https://www.npmjs.com/package/openclaw-cartesia)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**[OpenClaw](https://openclaw.ai) speech provider for [Cartesia](https://cartesia.ai) Sonic-2** — high-quality text-to-speech with instant voice cloning, drop-in for OpenClaw's `messages.tts` pipeline, `talk-voice` CLI, and any channel that supports voice notes (Telegram, Slack, Discord, etc.).

## Why

OpenClaw bundles ElevenLabs, Azure, Google, etc. as speech providers, but **not Cartesia**. Cartesia's Sonic-2 is competitively priced (generous free tier), has very low TTFB (~90ms), and produces excellent instant voice clones — but you couldn't use it as a first-class OpenClaw provider until now.

This plugin closes that gap. It registers `cartesia` as a `speechProviders` contract so OpenClaw can:

- Speak `messages.tts` replies in Telegram, Slack, Discord, etc. (voice notes)
- Power the `talk-voice` (`sag`) CLI skill
- Synthesize audio files (MP3) for embedded surfaces
- Stream PCM for telephony

## Install

> Requires Node 20+ and `ffmpeg` on PATH (used to transcode PCM → OGG/Opus for voice notes — Cartesia doesn't emit Opus natively).

### From npm (recommended)

```bash
openclaw plugins install npm:openclaw-cartesia
```

### From a local path (for development)

```bash
git clone https://github.com/parijatmukherjee/openclaw-cartesia.git
openclaw plugins install ./openclaw-cartesia
```

### From git

```bash
openclaw plugins install git:github.com/parijatmukherjee/openclaw-cartesia
```

## Configure

Drop the snippet at [`examples/openclaw.json.snippet`](examples/openclaw.json.snippet) into your `openclaw.json` (merging — don't overwrite). Minimal version:

```jsonc
{
  "plugins": {
    "allow": ["cartesia"],
    "entries": { "cartesia": { "enabled": true } }
  },
  "messages": {
    "tts": {
      "persona": "dobby",
      "personas": {
        "dobby": {
          "providers": {
            "cartesia": {
              "voiceId": { "source": "env", "provider": "default-env", "id": "CARTESIA_DOBBY_VOICE_ID" }
            }
          }
        }
      },
      "providers": {
        "cartesia": {
          "apiKey": { "source": "env", "provider": "default-env", "id": "CARTESIA_API_KEY" }
        }
      }
    }
  }
}
```

Set the env vars (recommended: 1Password CLI, sops, or systemd `EnvironmentFile=`):

```bash
export CARTESIA_API_KEY=sk_car_xxxxxxxxxxxxxxxx
export CARTESIA_DOBBY_VOICE_ID=00000000-0000-0000-0000-000000000000
```

Restart the gateway:

```bash
openclaw gateway restart
```

## When does the voice actually fire?

This plugin only **registers** Cartesia as a speech provider. Whether a given assistant turn produces audio is decided by OpenClaw's top-level `messages.tts.auto` setting. Valid modes:

| `messages.tts.auto` | Behavior |
|---|---|
| `"off"` | Never auto-speak — TTS only fires when manually invoked. |
| `"always"` | Speak every assistant turn. Produces a **text + voice duplicate** for text inputs unless you pair with `cartesia.config.suppressDuplicateText: true`. |
| `"inbound"` | Speak only when the user's inbound message was audio. **Recommended:** voice-on-voice, text-on-text. |
| `"tagged"` | Speak only when the turn is explicitly tagged for TTS. |

If you see Dobby reply with text **and** voice to every text message you send, you almost certainly want `"inbound"` (and a gateway restart):

```bash
openclaw config set messages.tts.auto inbound
openclaw gateway restart
```

`suppressDuplicateText` is a *complement* to `auto`, not a replacement: `auto` decides whether to synthesize at all, and `suppressDuplicateText` cancels the redundant text-send when synthesis did happen.

## Provider config reference

All keys live under `messages.tts.providers.cartesia` (or `personas.<id>.providers.cartesia` for per-persona overrides):

| Key | Type | Default | Purpose |
|---|---|---|---|
| `apiKey` | string \| SecretRef | (from env `CARTESIA_API_KEY`) | Cartesia API key |
| `voiceId` | string \| SecretRef | required | Cartesia voice id (see [Voices](https://play.cartesia.ai/voices)) |
| `modelId` | string | `"sonic-2"` | Cartesia model id |
| `baseUrl` | string | `"https://api.cartesia.ai"` | Override for self-hosted / regional |
| `version` | string | `"2024-11-13"` | `Cartesia-Version` header |
| `language` | string | `"en"` | BCP-47 language code |

## Output formats

The plugin picks the right format based on the synthesis target:

| Target (`req.target`) | Output | Why |
|---|---|---|
| `voice-note` | OGG/Opus 48kHz, ~64kbps (via ffmpeg) | Telegram, Slack, etc. render as voice bubbles |
| `audio-file` | MP3 44.1kHz, 128kbps (native Cartesia) | Generic playback |
| `telephony` | PCM_S16LE 48kHz mono | Streaming voice (Twilio etc.) |

## Voice cloning

Create your clone in the [Cartesia dashboard](https://play.cartesia.ai/voices) (Instant Voice Cloning is on the free tier). Copy the `voice_id` and set it as `CARTESIA_DOBBY_VOICE_ID`.

## Development

```bash
git clone https://github.com/parijatmukherjee/openclaw-cartesia.git
cd openclaw-cartesia
# No build step needed — `src/` is plain ESM, `dist/` is a copy for npm publish.
# Validate:
node --check dist/index.js
```

To test in your local OpenClaw:

```bash
openclaw plugins install ./openclaw-cartesia
openclaw plugins inspect cartesia --runtime
openclaw gateway restart
```

## License

MIT — see [LICENSE](LICENSE).

## Status

✅ v0.2.3 — runs in production on OpenClaw 2026.5.7. Verified end-to-end on Telegram voice notes. Telephony PCM path implemented but unverified. Issues and PRs welcome — see [CHANGELOG.md](CHANGELOG.md) for release history.

### Known limitations

- **`suppressDuplicateText` is a hook-based workaround**, not a first-class OpenClaw feature. It cancels the channel's text-send by sequence proximity to the voice synthesis. Works in 1:1 chats and the canonical agent-reply path; may not handle multi-message turns or out-of-order delivery cleanly.
- **Telegram channel** delivers Cartesia audio as a voice note via `sendVoice` automatically when the synthesis is `voiceCompatible: true` (OGG/Opus). Other channels with voice-note support are not yet verified.

## Related

- [OpenClaw](https://openclaw.ai)
- [Cartesia](https://cartesia.ai)
- [OpenClaw plugin development guide](https://github.com/openclaw/openclaw/blob/main/docs/tools/plugin.md)
- [openclaw-orchestra](https://github.com/parijatmukherjee/openclaw-orchestra) — multi-agent orchestration pattern for OpenClaw

## Keywords

openclaw, cartesia, tts, text-to-speech, voice-cloning, speech-synthesis, sonic-2, plugin, npm, voice, telegram-bot, discord-bot, slack-bot, ai
