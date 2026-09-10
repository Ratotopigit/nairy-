import { NextRequest, NextResponse } from "next/server";

const ALLOWED_WORKFLOWS = new Set(["avatar-iq", "offer-iq", "content-maker"]);
const DEFAULT_MAX_BODY_BYTES = 1_000_000;
const DEFAULT_TIMEOUT_MS = 120_000;

export const runtime = "nodejs";

export function generateStaticParams() {
  return [
    { workflow: "avatar-iq" },
    { workflow: "offer-iq" },
    { workflow: "content-maker" },
  ];
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function GET() {
  return NextResponse.json({ status: "active", workflows: Array.from(ALLOWED_WORKFLOWS) });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { workflow: string } },
) {
  const workflow = params.workflow;
  if (!ALLOWED_WORKFLOWS.has(workflow)) {
    return NextResponse.json({ error: "Unknown workflow." }, { status: 404 });
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ") || authorization.length <= 7 || authorization.length > 10_000) {
    return NextResponse.json({ error: "Your sign-in session is missing." }, { status: 401 });
  }

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "Only JSON requests are accepted." }, { status: 415 });
  }

  const maxBodyBytes = Number.parseInt(process.env.N8N_MAX_BODY_BYTES ?? "", 10)
    || DEFAULT_MAX_BODY_BYTES;
  const contentLength = Number.parseInt(request.headers.get("content-length") ?? "0", 10);
  if (contentLength > maxBodyBytes) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }

  const baseUrl = process.env.N8N_WEBHOOK_BASE_URL?.replace(/\/+$/, "");
  if (!baseUrl) {
    return NextResponse.json({ error: "The n8n webhook server is not configured." }, { status: 503 });
  }

  let webhookUrl: URL;
  try {
    webhookUrl = new URL(`${baseUrl}/${workflow}`);
    if (webhookUrl.protocol !== "https:") throw new Error("HTTPS is required");
  } catch {
    return NextResponse.json({ error: "The n8n webhook server configuration is invalid." }, { status: 503 });
  }

  try {
    const requestBody = await request.text();
    if (new TextEncoder().encode(requestBody).byteLength > maxBodyBytes) {
      return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    }
    try {
      JSON.parse(requestBody);
    } catch {
      return NextResponse.json({ error: "Request body is not valid JSON." }, { status: 400 });
    }
    const timeoutMs = Number.parseInt(process.env.N8N_REQUEST_TIMEOUT_MS ?? "", 10)
      || DEFAULT_TIMEOUT_MS;
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": request.headers.get("content-type") ?? "application/json",
      },
      body: requestBody,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const responseBody = await response.text();

    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "The workflow service is temporarily unavailable." },
      { status: 502 },
    );
  }
}
