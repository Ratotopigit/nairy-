"use client";

import { ArrowRight, Check, Layers3, Loader2, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { readN8nJson } from "@/lib/n8n-response";
import { supabase } from "@/lib/supabase/client";
import { saveWorkspaceMemory } from "@/lib/workspace-memory";

type OfferBlueprint = {
  title: string;
  promise: string;
  audience: string;
  core_angle: string;
  delivery_model: string;
  traffic_strategy: string;
  timeline: string;
  pricing: string;
  scope: string[];
  success_metrics: string[];
  risk_reversal: string;
};

type BuyerBlueprint = Record<string, unknown> & {
  persona_name?: string;
  demographics?: string;
  elevator_pitch?: string;
  competitive_edge?: string;
  offer?: OfferBlueprint;
};

const OFFER_WEBHOOK_URL = "/api/n8n/offer-iq";

export default function OfferIQPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [buyer, setBuyer] = useState<BuyerBlueprint | null>(null);
  const [delivery, setDelivery] = useState("Done-for-you");
  const [paidTraffic, setPaidTraffic] = useState("No - owned, partners, and organic");
  const [timeline, setTimeline] = useState("6 weeks");
  const [pricing, setPricing] = useState("$25k-$40k");
  const [focus, setFocus] = useState("Build a revenue-focused webinar and booking funnel");
  const [result, setResult] = useState<OfferBlueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return setLoading(false);
      const { data, error: loadError } = await supabase
        .from("blueprint_sessions")
        .select("session_id,blueprint")
        .eq("owner_id", authData.user.id)
        .eq("status", "completed")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (loadError) setError(loadError.message);
      const blueprint = (data?.blueprint as BuyerBlueprint | undefined) ?? null;
      setSessionId(data?.session_id ?? null);
      setBuyer(blueprint);
      setResult(blueprint?.offer ?? null);
      setLoading(false);
    })();
  }, []);

  async function buildOffer() {
    if (!buyer || !sessionId) return;
    setSaving(true);
    setError(null);
    try {
      if (!OFFER_WEBHOOK_URL.trim()) {
        throw new Error("The Offer IQ n8n webhook is not configured.");
      }
      const [{ data: authData }, { data: sessionData }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.auth.getSession(),
      ]);
      if (!authData.user || !sessionData.session?.access_token) {
        throw new Error("Your session expired. Please sign in again.");
      }
      const response = await fetch(OFFER_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          user_id: authData.user.id,
          focus,
          delivery,
          paid_traffic: paidTraffic,
          timeline,
          pricing,
        }),
      });
      const raw = await readN8nJson<unknown>(response, "Offer IQ workflow");
      const candidate = Array.isArray(raw) ? raw[0] : raw;
      const offer = ((candidate as { data?: unknown })?.data ?? candidate) as OfferBlueprint;
      if (!offer?.title || !Array.isArray(offer.scope)) {
        throw new Error("Offer IQ returned an invalid offer.");
      }
      setBuyer({ ...buyer, offer });
      setResult(offer);
      sessionStorage.setItem("astrocraft:latest-offer", JSON.stringify(offer));
      await saveWorkspaceMemory(authData.user.id, {
        onboarding_complete: true,
        audience_profile: buyer,
        offer_profile: offer,
        source_session_id: sessionId,
      });
    } catch (buildError) {
      setError(buildError instanceof Error ? buildError.message : "Could not build the offer.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="grid min-h-[55vh] place-items-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;

  if (!buyer) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <Target className="mx-auto size-8 text-muted-foreground" />
        <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">Build your buyer blueprint first</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">Offer IQ uses your saved audience, problems, triggers, and objections so you do not answer the same questions twice.</p>
        <Link href="/provider/astro-ai" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background">Open Avatar IQ <ArrowRight className="size-4" /></Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1060px] pb-16 pt-4">
      <header className="border-b border-border pb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Stage 02 · Offer IQ</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Shape an offer your buyer is ready to choose.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">Buyer context loaded for <strong className="text-foreground">{buyer.persona_name}</strong>. Make the commercial choices below; the audience research already carries forward.</p>
      </header>

      <div className="mt-8 grid gap-7 lg:grid-cols-[390px_minmax(0,1fr)]">
        <section className="space-y-5 rounded-3xl border border-border bg-card p-5">
          <Field label="Primary outcome"><textarea value={focus} onChange={(event) => setFocus(event.target.value)} rows={3} className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground/35" /></Field>
          <Field label="Delivery model"><Choice value={delivery} onChange={setDelivery} options={["Done-for-you", "Done-with-you", "Advisory"]} /></Field>
          <Field label="Paid traffic included?"><Choice value={paidTraffic} onChange={setPaidTraffic} options={["No - owned, partners, and organic", "Yes - include paid traffic"]} /></Field>
          <Field label="Delivery timeline"><Choice value={timeline} onChange={setTimeline} options={["4 weeks", "6 weeks", "8 weeks"]} /></Field>
          <Field label="Investment range"><Choice value={pricing} onChange={setPricing} options={["$10k-$20k", "$25k-$40k", "$40k+"]} /></Field>
          {error && <p className="text-xs leading-5 text-red-600">{error}</p>}
          <button type="button" onClick={() => void buildOffer()} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-medium text-background disabled:opacity-50">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Layers3 className="size-4" />}{result ? "Refresh offer strategy" : "Build offer strategy"}
          </button>
        </section>

        <section className="min-w-0">
          {result ? (
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-7">
              <div className="flex items-center gap-2 text-xs font-medium text-[#39755c]"><Check className="size-4" /> Saved to this buyer project</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.045em]">{result.title}</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{result.promise}</p>
              <OfferSection title="Positioning" items={[result.core_angle, `For: ${result.audience}`, `Delivery: ${result.delivery_model} over ${result.timeline}`, `Investment: ${result.pricing}`]} />
              <OfferSection title="Scope" items={result.scope} />
              <OfferSection title="Success metrics" items={result.success_metrics} />
              <div className="mt-6 rounded-2xl bg-secondary p-4"><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Risk reversal</p><p className="mt-2 text-sm leading-6">{result.risk_reversal}</p></div>
              <div className="mt-7 flex flex-wrap gap-3 border-t border-border pt-5">
                <Link href="/provider/slides" className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background">Create webinar deck <ArrowRight className="size-4" /></Link>
                <button type="button" onClick={() => window.print()} className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium">Save offer as PDF</button>
              </div>
            </div>
          ) : (
            <div className="grid min-h-[520px] place-items-center rounded-3xl border border-dashed border-border bg-card/40 p-8 text-center">
              <div><Layers3 className="mx-auto size-7 text-muted-foreground" /><h2 className="mt-4 text-xl font-semibold">Your offer strategy will appear here</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Offer IQ combines these commercial choices with the saved buyer blueprint, then carries the result into Content Maker.</p></div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="mb-2 text-xs font-semibold">{label}</p>{children}</div>;
}

function Choice({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return <div className="flex flex-wrap gap-2">{options.map((option) => <button key={option} type="button" onClick={() => onChange(option)} className={`rounded-full border px-3 py-1.5 text-xs transition ${value === option ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"}`}>{option}</button>)}</div>;
}

function OfferSection({ title, items }: { title: string; items: string[] }) {
  return <div className="mt-7"><h3 className="text-sm font-semibold">{title}</h3><ul className="mt-3 space-y-2">{items.map((item) => <li key={item} className="flex gap-2 text-sm leading-6 text-muted-foreground"><Check className="mt-1 size-4 shrink-0 text-foreground" />{item}</li>)}</ul></div>;
}
