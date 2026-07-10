# Transcribe Meeting Function

This Edge Function receives meeting audio from the SBSA board tracker, sends it to OpenAI for transcription, and returns text for the meeting notes box.

Required Supabase secret:

```text
OPENAI_API_KEY=sk-...
```

Optional secret:

```text
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-transcribe-diarize
OPENAI_TRANSCRIPTION_THRESHOLD=0.35
OPENAI_TRANSCRIPT_CLEANUP=true
OPENAI_TRANSCRIPT_CLEANUP_MODEL=gpt-5.4-mini
```

The browser records speech-optimized mono audio and automatically splits long meetings into eight-minute parts. Each completed part is transcribed and locally autosaved while the next part records. The final partial part is processed when recording stops. Each part is diarized, then optionally cleaned with the supplied attendee names, director roles, and SBSA vocabulary. Cleanup is conservative and falls back to the original diarized transcript if it fails.

For more reliable speaker names in a recording part, have participants identify themselves with `This is [name]`. Without voice-reference clips or self-identification, diarization uses generic labels such as `Speaker A` and `Speaker B`; labels may reset between long-meeting parts.

Deploy after setting the secret:

```sh
supabase functions deploy transcribe-meeting --no-verify-jwt
```
