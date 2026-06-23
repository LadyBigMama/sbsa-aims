const OPENAI_TRANSCRIPTION_URL = "https://api.openai.com/v1/audio/transcriptions";
const DEFAULT_MODEL = "gpt-4o-transcribe-diarize";
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Use POST with multipart form audio." }, 405);
  }

  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAiKey) {
    return jsonResponse({ error: "OPENAI_API_KEY is not configured for this Supabase function." }, 500);
  }

  try {
    const form = await request.formData();
    const audio = form.get("audio");
    if (!(audio instanceof File)) {
      return jsonResponse({ error: "Missing audio file." }, 400);
    }

    if (audio.size > MAX_AUDIO_BYTES) {
      return jsonResponse({ error: "Audio is too large. Record a shorter section and try again." }, 413);
    }

    const speakerNames = parseSpeakerNames(form.get("speakerNames"));
    const model = Deno.env.get("OPENAI_TRANSCRIPTION_MODEL") || DEFAULT_MODEL;
    const openAiForm = new FormData();
    openAiForm.append("file", audio, audio.name || "meeting-audio.webm");
    openAiForm.append("model", model);
    openAiForm.append("language", "en");

    if (model.includes("diarize")) {
      openAiForm.append("response_format", "diarized_json");
      openAiForm.append("chunking_strategy", "auto");
    } else {
      openAiForm.append("response_format", "json");
      openAiForm.append("prompt", buildPrompt(speakerNames));
    }

    const response = await fetch(OPENAI_TRANSCRIPTION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`
      },
      body: openAiForm
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = typeof result.error?.message === "string" ? result.error.message : "OpenAI transcription failed.";
      return jsonResponse({ error: message }, response.status);
    }

    return jsonResponse({
      text: formatTranscript(result, speakerNames),
      rawText: typeof result.text === "string" ? result.text : "",
      model,
      usage: result.usage || null
    });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Unable to transcribe this recording." }, 500);
  }
});

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function parseSpeakerNames(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 24);
  } catch (_error) {
    return value.split(/[,;]+/).map((item) => item.trim()).filter(Boolean).slice(0, 24);
  }
}

function buildPrompt(speakerNames: string[]) {
  const names = speakerNames.length ? `Known names and roles: ${speakerNames.join(", ")}.` : "";
  return [
    "This is an SBSA board meeting.",
    "Preserve action items, motions, votes, due dates, names, and board role titles.",
    "If someone identifies themselves by saying 'Sandra speaking' or 'This is the Treasurer', keep that speaker label in the transcript.",
    names
  ].filter(Boolean).join(" ");
}

function formatTranscript(result: Record<string, unknown>, speakerNames: string[]) {
  const segments = Array.isArray(result.segments) ? result.segments : [];
  if (segments.length) {
    return formatDiarizedSegments(segments, speakerNames);
  }

  return normalizeTranscriptText(String(result.text || ""));
}

function formatDiarizedSegments(segments: unknown[], speakerNames: string[]) {
  const speakerMap = new Map<string, string>();
  const lines: Array<{ speaker: string; text: string }> = [];

  segments.forEach((segment) => {
    if (!segment || typeof segment !== "object") return;
    const record = segment as Record<string, unknown>;
    const rawSpeaker = String(record.speaker || "").trim();
    const text = normalizeTranscriptText(String(record.text || ""));
    if (!text) return;

    const selfIdentifiedName = findSelfIdentifiedName(text, speakerNames);
    if (rawSpeaker && selfIdentifiedName) {
      speakerMap.set(rawSpeaker, selfIdentifiedName);
    }

    const speaker = rawSpeaker ? speakerMap.get(rawSpeaker) || `Speaker ${rawSpeaker}` : "";
    const cleanText = selfIdentifiedName ? stripSpeakerIntro(text, selfIdentifiedName) || text : text;
    const previous = lines[lines.length - 1];

    if (previous && previous.speaker === speaker) {
      previous.text = `${previous.text} ${cleanText}`.trim();
      return;
    }

    lines.push({ speaker, text: cleanText });
  });

  return lines
    .map((line) => line.speaker ? `${line.speaker}: ${line.text}` : line.text)
    .join("\n")
    .trim();
}

function findSelfIdentifiedName(text: string, speakerNames: string[]) {
  const patterns = [
    /^(?:this is|it's|it is)\s+([^.,:;!?]{2,60})/i,
    /^([^.,:;!?]{2,60})\s+(?:speaking|here)\b/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const candidate = cleanSpeakerCandidate(match[1]);
    const known = findKnownSpeakerName(candidate, speakerNames);
    return known || titleCase(candidate);
  }

  return "";
}

function stripSpeakerIntro(text: string, speakerName: string) {
  const escaped = escapeRegExp(speakerName);
  return text
    .replace(new RegExp(`^(?:this is|it's|it is)\\s+${escaped}[,.:;!?\\s-]*`, "i"), "")
    .replace(new RegExp(`^${escaped}\\s+(?:speaking|here)[,.:;!?\\s-]*`, "i"), "")
    .trim();
}

function findKnownSpeakerName(candidate: string, speakerNames: string[]) {
  const normalizedCandidate = normalizeLookup(candidate);
  return speakerNames.find((name) => {
    const normalizedName = normalizeLookup(name);
    return normalizedName === normalizedCandidate || normalizedName.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedName);
  }) || "";
}

function cleanSpeakerCandidate(value: string) {
  return value.replace(/\b(speaking|here)\b/gi, "").replace(/[.,:;!?-]+$/g, "").trim();
}

function normalizeTranscriptText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeLookup(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function titleCase(value: string) {
  return value.toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
