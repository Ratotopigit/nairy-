/**
 * Builds an n8n webhook URL from the configured base.
 *
 * There is deliberately no fallback: the base must come from the build-time
 * environment. A missing value fails loudly here rather than silently sending
 * requests somewhere unintended.
 *
 * Called lazily (inside request handlers, not at module scope) so a missing
 * variable surfaces as a handled request error instead of a blank page.
 */
export function n8nWebhookUrl(workflow: string): string {
  const base = process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL;
  if (!base) {
    throw new Error(
      "NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL is not set. Add it as a build-time " +
        "environment variable and redeploy — runtime variables are not read " +
        "by a static export.",
    );
  }
  return `${base.replace(/\/+$/, "")}/${workflow}`;
}
