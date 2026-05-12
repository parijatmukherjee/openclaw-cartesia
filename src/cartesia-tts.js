/**
 * Cartesia Sonic-2 HTTP client + ffmpeg transcoder.
 *
 * Cartesia returns MP3 or raw PCM but not OGG/Opus natively. For Telegram voice
 * notes (and any "voice-compatible" surface) we ask Cartesia for PCM_S16LE and
 * pipe it through ffmpeg to produce OGG/Opus. For audio-file surfaces we ask
 * Cartesia for MP3 directly (no transcoding needed).
 */

import { spawn } from "node:child_process";

const DEFAULT_BASE_URL = "https://api.cartesia.ai";
const DEFAULT_VERSION = "2024-11-13";
const DEFAULT_MODEL = "sonic-2";
const SAMPLE_RATE = 48000;

/**
 * Call Cartesia and return a Buffer. Format depends on `outputFormat`:
 *   - "ogg_opus_48000_64": PCM_S16LE from Cartesia → ffmpeg → OGG/Opus
 *   - "mp3_44100_128":     direct MP3 from Cartesia
 *   - "pcm_48000":         raw PCM_S16LE mono @ 48kHz (debug)
 */
export async function cartesiaSynthesize(params) {
  const {
    text,
    apiKey,
    voiceId,
    modelId = DEFAULT_MODEL,
    baseUrl = DEFAULT_BASE_URL,
    version = DEFAULT_VERSION,
    outputFormat,
    language = "en",
    timeoutMs = 30_000,
  } = params;

  if (!apiKey) throw new Error("cartesia: apiKey is required");
  if (!voiceId) throw new Error("cartesia: voiceId is required");
  if (!text || !text.trim()) throw new Error("cartesia: text is required");

  const wantsOggOpus = outputFormat.startsWith("ogg_opus");
  const wantsMp3 = outputFormat.startsWith("mp3");
  const wantsPcm = outputFormat.startsWith("pcm");

  let cartesiaFormat;
  if (wantsMp3) {
    cartesiaFormat = { container: "mp3", sample_rate: 44100, bit_rate: 128_000 };
  } else {
    // OGG/Opus or raw PCM both start with PCM from Cartesia
    cartesiaFormat = { container: "raw", encoding: "pcm_s16le", sample_rate: SAMPLE_RATE };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(`${baseUrl}/tts/bytes`, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Cartesia-Version": version,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_id: modelId,
        transcript: text,
        voice: { mode: "id", id: voiceId },
        output_format: cartesiaFormat,
        language,
      }),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `cartesia: HTTP ${response.status} ${response.statusText} :: ${body.slice(0, 400)}`
    );
  }
  const audio = Buffer.from(await response.arrayBuffer());

  if (wantsMp3 || wantsPcm) return audio;
  return pcmToOggOpus(audio, SAMPLE_RATE, 64_000);
}

/**
 * Pipe PCM_S16LE mono through ffmpeg to OGG/Opus. ffmpeg must be on PATH.
 */
export function pcmToOggOpus(pcm, sampleRate, bitrate) {
  return new Promise((resolve, reject) => {
    const ff = spawn(
      "ffmpeg",
      [
        "-loglevel", "error",
        "-f", "s16le",
        "-ar", String(sampleRate),
        "-ac", "1",
        "-i", "-",
        "-c:a", "libopus",
        "-b:a", String(bitrate),
        "-vbr", "on",
        "-application", "voip",
        "-f", "ogg",
        "-",
      ],
      { stdio: ["pipe", "pipe", "pipe"] }
    );

    const out = [];
    const err = [];
    ff.stdout.on("data", (c) => out.push(c));
    ff.stderr.on("data", (c) => err.push(c));
    ff.on("error", (e) => reject(new Error(`ffmpeg spawn failed: ${e.message}`)));
    ff.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(out));
      } else {
        reject(new Error(`ffmpeg exited with code ${code}: ${Buffer.concat(err).toString("utf8").slice(0, 400)}`));
      }
    });
    ff.stdin.write(pcm);
    ff.stdin.end();
  });
}
