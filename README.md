# openclaw-cartesia

[![npm version](https://img.shields.io/npm/v/openclaw-cartesia.svg)](https://www.npmjs.com/package/openclaw-cartesia)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**[OpenClaw](https://openclaw.ai) speech provider for [Cartesia](https://cartesia.ai) Sonic-2** — high-quality text-to-speech with instant voice cloning, drop-in for OpenClaw's `messages.tts` pipeline, `talk-voice` CLI, and any channel that supports voice notes (Telegram, Slack, etc.).

## Why

OpenClaw bundles ElevenLabs, Azure, Google, etc. as speech providers, but **not Cartesia**. Cartesia's Sonic-2 is competitively priced (generous free tier), has very low TTFB (~90ms), and produces excellent instant voice clones — but you couldn't use it as a first-class OpenClaw provider until now.

This plugin closes that gap. It registers `cartesia` as a `speechProviders` contract so OpenClaw can:

- Speak `messages.tts` replies in Telegram, Slack, Discord, etc. (voice notes)
- Power the `talk-voice` (`sag`) CLI skill
- Synthesize audio files (MP3) for embedded surfaces
- Stream PCM for telephony

## Install

> Requires Node 20+ and `ffmpeg` on PATH (used to transcode PCM → OGG/Opus for voice notes — Cartesia doesn't emit Opus natively).

### From npm (recommended once published)

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

🚧 v0.1.0 — works for `voice-note` (Telegram) and `audio-file` (MP3) targets. Telephony PCM path implemented but unverified. Filed under "works for me on OpenClaw 2026.5.7". Issues and PRs welcome.

## Related

- [OpenClaw](https://openclaw.ai)
- [Cartesia](https://cartesia.ai)
- [OpenClaw plugin development guide](https://github.com/openclaw/openclaw/blob/main/docs/tools/plugin.md)
- [openclaw-orchestra](https://github.com/parijatmukherjee/openclaw-orchestra) — multi-agent orchestration pattern for OpenClaw
