"use client";

import { useId, useState } from "react";
import { Field, INPUT, Section } from "@/components/webinar/editor/controls";
import { publishedSwitchCheck } from "@/lib/webinar-access";
import { isValidPaymentUrl, isValidVideoUrl, type Webinar } from "@/lib/webinars";

export const ACCESS_OPTIONS = [
  { value: "free", label: "Free", blurb: "Anyone can sign up with their name and email." },
  { value: "paid", label: "Paid", blurb: "People buy through your checkout link. The page has no sign-up form." },
] as const;

export const DELIVERY_OPTIONS = [
  { value: "live", label: "Live (you present at a set time)", blurb: "You pick a date and time and present it yourself." },
  { value: "automated", label: "Recorded (watch any time)", blurb: "People watch your recorded video whenever they like." },
] as const;

/** Radio buttons with a one-line explanation each. Used here and in the new-webinar dialog. */
export function ChoiceGroup<V extends string>({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string;
  value: V;
  options: readonly { value: V; label: string; blurb: string }[];
  onChange: (value: V) => void;
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className="text-base font-semibold text-foreground">{legend}</legend>
      <div className="mt-2 grid gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={`flex min-h-14 cursor-pointer gap-3 rounded-xl border-2 p-3.5 transition-colors ${
              value === o.value ? "border-primary bg-primary/5" : "border-border-strong bg-card hover:bg-secondary"
            }`}
          >
            <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} className="mt-0.5 size-5 shrink-0 accent-primary" />
            <span>
              <span className="block text-sm font-semibold">{o.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{o.blurb}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Note({ children }: { children: string }) {
  return <p className="text-xs leading-5 text-muted-foreground">{children}</p>;
}

type Props = {
  w: Webinar;
  update: <K extends keyof Webinar>(key: K, value: Webinar[K]) => void;
};

/**
 * One click must not silently change a page people can already see: free/paid
 * and live/recorded switches on a published webinar are confirmed or refused.
 * Used here and in the Watch step. `refusal` shows the reason when refused.
 */
export function useSwitchGuard(w: Webinar) {
  const [refused, setRefused] = useState<string | null>(null);
  function allowSwitch(next: Pick<Webinar, "access_type" | "delivery_type">): boolean {
    setRefused(null);
    if (w.status !== "published") return true;
    const check = publishedSwitchCheck(w, next);
    if ("refuse" in check) {
      setRefused(check.refuse);
      return false;
    }
    return window.confirm(check.confirm);
  }
  const refusal = refused ? (
    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
      {refused}
    </p>
  ) : null;
  return { allowSwitch, refusal };
}

/** A recorded webinar's video: the field for free ones, the checkout note for paid ones. */
export function VideoLinkField({ w, update }: Props) {
  const videoInvalid = Boolean(w.video_url) && !isValidVideoUrl(w.video_url);
  const videoHintId = useId();
  if (w.access_type === "paid") {
    return <Note>The buyer gets the video through their checkout confirmation, so put it there. It is not shown or stored on your public page, and any video link you had is removed when you publish.</Note>;
  }
  return (
    <>
      <Field
        label="Video link"
        hintId={videoHintId}
        hint={
          videoInvalid
            ? "Use a public YouTube or Vimeo video link, like https://www.youtube.com/watch?v=… or https://vimeo.com/123456"
            : "YouTube or Vimeo. It plays right after someone signs up. The link can be found by anyone who looks at your page's data, so don't use it for private videos."
        }
      >
        <input
          value={w.video_url}
          onChange={(e) => update("video_url", e.target.value.trim())}
          maxLength={1000}
          inputMode="url"
          placeholder="https://www.youtube.com/watch?v=…"
          aria-invalid={videoInvalid}
          aria-describedby={videoInvalid ? videoHintId : undefined}
          className={`${INPUT} ${videoInvalid ? "border-red-300" : ""}`}
        />
      </Field>
      <Note>People who sign up are added to your registrants but get no email for now.</Note>
    </>
  );
}

export function SetupPanel({ w, update }: Props) {
  const paid = w.access_type === "paid";
  const automated = w.delivery_type === "automated";
  const paymentInvalid = Boolean(w.payment_url) && !isValidPaymentUrl(w.payment_url);
  const paymentHintId = useId();
  const { allowSwitch, refusal } = useSwitchGuard(w);

  return (
    <div className="space-y-7">
      {refusal}
      <Section title="Who can attend">
        <ChoiceGroup
          legend="Free or paid"
          value={w.access_type}
          options={ACCESS_OPTIONS}
          onChange={(v) => {
            if (allowSwitch({ access_type: v, delivery_type: w.delivery_type })) update("access_type", v);
          }}
        />
        {paid ? (
          <>
            <Field label="Price" hint="Shown on the button, exactly as you type it.">
              <input value={w.ticket_price} onChange={(e) => update("ticket_price", e.target.value)} maxLength={40} placeholder="$49" className={INPUT} />
            </Field>
            <Field
              label="Payment link"
              hintId={paymentHintId}
              hint={
                paymentInvalid
                  ? "That doesn't look like a secure link. It should start with https://"
                  : "This is the checkout link from Stripe, PayPal or similar. Buyers get access through that checkout. Until you add it, the page shows a button that can't be clicked."
              }
            >
              <input
                value={w.payment_url}
                onChange={(e) => update("payment_url", e.target.value.trim())}
                maxLength={1000}
                inputMode="url"
                placeholder="https://buy.stripe.com/…"
                aria-invalid={paymentInvalid}
                aria-describedby={paymentInvalid ? paymentHintId : undefined}
                className={`${INPUT} ${paymentInvalid ? "border-red-300" : ""}`}
              />
            </Field>
            <Note>We don&apos;t see who paid, so buyers don&apos;t appear in your registrants and get no emails from us. Send the details from your checkout confirmation.</Note>
          </>
        ) : null}
      </Section>

      <Section title="How it runs">
        <ChoiceGroup
          legend="Live or recorded"
          value={w.delivery_type}
          options={DELIVERY_OPTIONS}
          onChange={(v) => {
            if (allowSwitch({ access_type: w.access_type, delivery_type: v })) update("delivery_type", v);
          }}
        />
        {!automated ? <Note>You set the date and your meeting link in step 3, Watch room &amp; replay.</Note> : <VideoLinkField w={w} update={update} />}
        {automated ? <Note>Automated webinars have no date, countdown or reminders. Any date you had is removed when you publish.</Note> : null}
      </Section>
    </div>
  );
}
