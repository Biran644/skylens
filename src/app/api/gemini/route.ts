import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import type {
  Conflict,
  ResolutionCandidate,
} from "../../../backend/types/domain";

type ExplainRequest = {
  conflict: Conflict;
  resolution?: ResolutionCandidate | null;
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey =
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_API_KEY ??
    process.env.GOOGLE_GENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Gemini API key is not configured" },
      { status: 500 },
    );
  }

  let payload: ExplainRequest | null = null;
  try {
    payload = (await request.json()) as ExplainRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload?.conflict) {
    return NextResponse.json(
      { error: "Conflict is required" },
      { status: 400 },
    );
  }

  const { conflict, resolution } = payload;

  const prompt = `You are an airspace conflict analyst. Return a JSON object with keys "explanation" and "solution".

Explanation requirements:
- Explain why this conflict occurs and summarize likely drivers (timing, altitude, routing).
- Use 2-3 short bullet points and then a single-sentence summary.
- Keep it under 80 words total.
- Do not mention any resolution or adjustments.

Solution requirements:
- One short sentence rephrasing the resolution candidate in plain English.
- If no resolution is provided, set solution to "No resolution selected.".

Conflict:
- Flights: ${conflict.flightA} vs ${conflict.flightB}
- Time window: ${conflict.tStart}s to ${conflict.tEnd}s
- Min horizontal separation: ${conflict.minHorizontalNm.toFixed(2)} nm
- Min vertical separation: ${conflict.minVerticalFt.toFixed(0)} ft
- Samples: ${conflict.samples.length}

${
  resolution
    ? `Resolution candidate:
- Flight adjusted: ${resolution.flightId}
- Δ time: ${resolution.deltaTimeSec}s
- Δ altitude: ${resolution.deltaAltitudeFt} ft
- Δ speed: ${resolution.deltaSpeedKt} kt
- Resolves conflict: ${resolution.resolvesConflict}
`
    : ""
}

Return strict JSON only. Do not wrap in markdown.`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const models = ["gemini-2.5-flash", "gemini-1.5-flash"];
    let lastError: unknown = null;

    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        });

        const responseAny = response as unknown as {
          text?: string | (() => string);
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
        };

        const raw =
          typeof responseAny.text === "function"
            ? responseAny.text()
            : (responseAny.text ??
                responseAny.candidates?.[0]?.content?.parts
                  ?.map((part) => part.text ?? "")
                  .join("") ??
              "");

        const cleaned = raw
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();

        let explanation = cleaned;
        let solution: string | null = null;

        try {
          const start = cleaned.indexOf("{");
          const end = cleaned.lastIndexOf("}");
          if (start >= 0 && end > start) {
            const jsonText = cleaned.slice(start, end + 1);
            const parsed = JSON.parse(jsonText) as {
              explanation?:
                | string
                | { bullet_points?: string[]; summary?: string };
              solution?: string;
            };
            if (typeof parsed.explanation === "string") {
              explanation = parsed.explanation.trim();
            } else if (parsed.explanation) {
              const bullets = parsed.explanation.bullet_points ?? [];
              const summary = parsed.explanation.summary ?? "";
              const bulletText = bullets.length
                ? bullets.map((item) => `• ${item}`).join("\n")
                : "";
              explanation = [bulletText, summary].filter(Boolean).join("\n");
            } else {
              explanation = "";
            }
            solution = parsed.solution?.trim() ?? null;
          }
        } catch {
          // fall back to raw text
        }

        if (solution && explanation) {
          const withoutSolutionLine = explanation
            .split("\n")
            .filter((line) => !/^\s*(solution|resolution)\b/i.test(line))
            .join("\n");
          explanation = withoutSolutionLine
            .replace(solution, "")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
        }

        return NextResponse.json({ text: cleaned, explanation, solution, model });
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error("Gemini request failed");
  } catch (error) {
    const err = error as {
      message?: string;
      status?: number;
      name?: string;
    };
    return NextResponse.json(
      {
        error: "Gemini request failed",
        details: err.message ?? "Unknown error",
        status: err.status ?? 500,
        name: err.name ?? "GeminiError",
      },
      { status: err.status ?? 500 },
    );
  }
}
