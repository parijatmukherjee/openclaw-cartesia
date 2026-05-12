# Changelog

All notable changes to `openclaw-cartesia` will be documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.3] - 2026-05-12

### Changed
- Docs: new README section **"When does the voice actually fire?"** explaining `messages.tts.auto` modes (`off`/`always`/`inbound`/`tagged`) and how `suppressDuplicateText` complements (rather than replaces) the `auto` setting.
- Example snippet (`examples/openclaw.json.snippet`): now sets `messages.tts.enabled: true` and `messages.tts.auto: "inbound"`, and turns on `suppressDuplicateText` under the plugin entry with explanatory comments. No code change.

## [0.2.2] - 2026-05-12

### Changed
- CI: tag push now auto-publishes to **both** npm (via Trusted Publishing / OIDC) and ClawHub (via the openclaw/clawhub reusable workflow). No version-bump-only contents change.

## [0.2.1] - 2026-05-12

### Added
- ClawHub publish metadata: `openclaw.compat.pluginApi` (`>=2026.5.7`) and `openclaw.build.openclawVersion` (`2026.5.7`) in `package.json`. Required by `clawhub package publish` for code plugins.

## [0.2.0] - 2026-05-12

### Added
- `suppressDuplicateText` plugin config option. When enabled, the plugin registers a `message_sending` hook that cancels the channel's text reply for any turn where the same plugin just produced an OGG/Opus voice-note. Result: voice-only delivery, no text+voice duplicate.
- Per-session bookkeeping with a 60-second TTL and opportunistic garbage collection.
- Manifest migrated from deprecated `providerAuthEnvVars` to the supported `setup.providers[].envVars` shape.

## [0.1.0] - 2026-05-12

### Added
- Initial release.
- Speech provider implementing `synthesize` and `synthesizeTelephony` against `api.cartesia.ai/tts/bytes`.
- Voice-note target: PCM_S16LE 48kHz from Cartesia → ffmpeg → OGG/Opus 64kbps.
- Audio-file target: native MP3 44.1kHz 128kbps.
- Telephony target: PCM_S16LE 48kHz mono passthrough.
- Config: `apiKey` (SecretRef supported), `voiceId`, `modelId` (default `sonic-2`), `baseUrl`, `version`, `language`.
- Two built-in model entries: `sonic-2`, `sonic-2-2025-03-07`.
- MIT licensed.
