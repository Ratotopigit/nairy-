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
    const detail = typeof parsed === "string"
      ? parsed
      : (parsed as { error?: string; message?: string } | null)?.error
        ?? (parsed as { error?: string; message?: string } | null)?.message;
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
