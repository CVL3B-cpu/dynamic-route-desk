import {
  CONFIDENCE_FLOOR,
  DEPARTMENTS,
  DEPARTMENT_BLURB,
  routeByKeywords,
  type Department,
  type Priority,
  type RoutingDecision,
} from "./routing";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["department", "priority", "confidence", "reasoning", "summary"],
  properties: {
    department: { type: ["string", "null"], enum: [...DEPARTMENTS, null] },
    priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
    confidence: { type: "number" },
    reasoning: { type: "string" },
    summary: { type: "string" },
  },
} as const;

function systemPrompt() {
  const desks = DEPARTMENTS.map((d) => `- ${d}: ${DEPARTMENT_BLURB[d]}`).join("\n");
  return [
    "You are the triage engine of an internal service desk.",
    "Read the incoming request and choose exactly one department:",
    desks,
    "",
    "Rules:",
    "- If the request could plausibly belong to two departments, choose the one that owns the outcome the requester wants.",
    "- Payroll records, entitlements and conduct are HR. Money movement, invoices, expenses and budgets are Finance.",
    "- Set department to null only when the text carries no usable signal at all.",
    "- confidence is 0-1 and must reflect genuine certainty. Be honest and use low values for vague text.",
    "- reasoning is one short sentence, in plain language, naming the signal you used. Max 140 characters.",
    "- summary is a single neutral line describing the request. Max 90 characters.",
    "- priority reflects business impact, not the requester's own wording alone.",
  ].join("\n");
}

type ParsedDecision = {
  department: Department | null;
  priority: Priority;
  confidence: number;
  reasoning: string;
  summary: string;
};

/**
 * Classify a ticket with Lovable AI. Falls back to deterministic keyword rules
 * on any gateway failure so a submission is never lost.
 */
export async function classifyTicket(input: {
  title: string;
  description: string;
  requesterUrgency: Priority;
}): Promise<RoutingDecision> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return routeByKeywords(input.title, input.description);

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        reasoning: { effort: "low" },
        max_completion_tokens: 2000,
        text: {
          format: {
            type: "json_schema",
            name: "routing_decision",
            strict: true,
            schema: SCHEMA,
          },
        },
        input: [
          { role: "system", content: [{ type: "input_text", text: systemPrompt() }] },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  `Title: ${input.title}`,
                  `Requester-stated urgency: ${input.requesterUrgency}`,
                  "Description:",
                  input.description,
                ].join("\n"),
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok || !response.body) {
      console.error("AI routing failed", response.status, await safeText(response));
      return routeByKeywords(input.title, input.description);
    }

    const text = await readOutputText(response.body);
    const parsed = JSON.parse(text) as ParsedDecision;
    const department =
      parsed.department && (DEPARTMENTS as readonly string[]).includes(parsed.department)
        ? (parsed.department as Department)
        : null;
    const confidence = clamp01(Number(parsed.confidence));

    if (!department || confidence < CONFIDENCE_FLOOR) {
      return {
        department,
        priority: parsed.priority ?? input.requesterUrgency,
        confidence,
        reasoning:
          parsed.reasoning?.trim() ||
          "Not enough signal in the request to pick a department confidently.",
        summary: parsed.summary?.trim() || input.title.slice(0, 120),
        source: "ai",
      };
    }

    return {
      department,
      priority: parsed.priority ?? input.requesterUrgency,
      confidence,
      reasoning: parsed.reasoning?.trim() || `Routed to ${department}.`,
      summary: parsed.summary?.trim() || input.title.slice(0, 120),
      source: "ai",
    };
  } catch (error) {
    console.error("AI routing error", error);
    return routeByKeywords(input.title, input.description);
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0.3;
  return Math.min(Math.max(value, 0), 1);
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

/** Read the SSE stream and join the model's output text deltas. */
async function readOutputText(body: ReadableStream<Uint8Array>): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let out = "";
  let completed = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const event = JSON.parse(payload) as {
          type?: string;
          delta?: string;
          response?: { output_text?: string };
        };
        if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
          out += event.delta;
        } else if (event.type === "response.completed" && event.response?.output_text) {
          completed = event.response.output_text;
        }
      } catch {
        // ignore keep-alives and partial frames
      }
    }
  }

  return (out || completed).trim();
}
