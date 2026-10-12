// Types for templates.js, so the app can render the exact email n8n sends
// (the admin broadcast preview) without a second copy of the template.

export type BuiltEmail = {
  fromName: string;
  subject: string;
  html: string;
  text: string;
  attachments: Array<{ filename: string; content: string; type: string; disposition: string }>;
};

export function broadcastEmail(input: {
  subject: string;
  message: string;
  recipient: { uid: string; name: string; email: string; token: string };
}): BuiltEmail;

export function welcomeEmail(input: { name: string; email: string }): BuiltEmail;
