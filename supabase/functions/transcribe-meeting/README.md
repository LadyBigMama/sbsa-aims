# Transcribe Meeting Function

This Edge Function receives meeting audio from the SBSA board tracker, sends it to OpenAI for transcription, and returns text for the meeting notes box.

Required Supabase secret:

```text
OPENAI_API_KEY=sk-...
```

Optional secret:

```text
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-transcribe-diarize
```

Deploy after setting the secret:

```sh
supabase functions deploy transcribe-meeting --no-verify-jwt
```
