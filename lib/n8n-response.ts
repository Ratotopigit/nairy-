export async function readN8nJson<T>(response: Response, workflowName: string): Promise<T> {
  const text = await response.text();
  let parsed: unknown = null;

  if (text.trim()) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!response.ok) {
    let detail = typeof parsed === "string"
      ? parsed
      : (parsed as { error?: string; message?: string } | null)?.error
        ?? (parsed as { error?: string; message?: string } | null)?.message;

    if (detail && typeof detail === "string" && /<!doctype html|<html/i.test(detail)) {
      if (response.status === 405) {
        detail = "Method Not Allowed. Please verify the workflow is switched to Active in n8n and the Webhook node HTTP Method is POST.";
      } else if (response.status === 404) {
        detail = "Webhook Not Found. Please activate the workflow in n8n and verify the path is 'avatar-iq'.";
      } else {
        detail = `HTTP ${response.status} error from webhook host.`;
      }
    }
    throw new Error(`${workflowName} returned ${response.status}${detail ? `: ${detail}` : "."}`);
  }

  if (parsed === null) {
    throw new Error(`${workflowName} returned an empty response.`);
  }
  if (typeof parsed === "string") {
    throw new Error(`${workflowName} did not return valid JSON.`);
  }

  return parsed as T;
}
