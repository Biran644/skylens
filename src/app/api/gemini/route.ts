import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import type { Conflict, ResolutionCandidate } from "../../../backend/types/domain";

type ExplainRequest = {
  conflict: Conflict;
  resolution?: ResolutionCandidate | null;
};

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured" },
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
    return NextResponse.json({ error: "Conflict is required" }, { status: 400 });
  }

  const { conflict, resolution } = payload;

  const prompt = `You are an airspace conflict analyst. Explain why this conflict occurs and summarize the likely drivers (timing, altitude, routing). Use 2-3 short bullet points. Then add a single-sentence summary. Keep it under 80 words total.

Conflict:
- Flights: ${conflict.flightA} vs ${conflict.flightB}
- Time window: ${conflict.tStart}s to ${conflict.tEnd}s
- Min horizontal separation: ${conflict.minHorizontalNm.toFixed(2)} nm
- Min vertical separation: ${conflict.minVerticalFt.toFixed(0)} ft
- Samples: ${conflict.samples.length}

${resolution ? `Resolution candidate:
- Flight adjusted: ${resolution.flightId}
- Δ time: ${resolution.deltaTimeSec}s
- Δ altitude: ${resolution.deltaAltitudeFt} ft
- Δ speed: ${resolution.deltaSpeedKt} kt
- Resolves conflict: ${resolution.resolvesConflict}
` : ""}

Write in English.`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return NextResponse.json({ text: response.text ?? "" });
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
