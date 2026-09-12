"use client";

import { ArrowRight, Check, Layers3, Loader2, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { HANDOFF } from "@/lib/creation-handoff";
import { readN8nJson } from "@/lib/n8n-response";
import { auth, db } from "@/lib/firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";
import { loadStudioContext } from "@/lib/workspace-context";
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

const OFFER_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL
  ? `${process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL.replace(/\/+$/, "")}/offer-iq`
  : "https://explosionmarketing.app.n8n.cloud/webhook/offer-iq";

const OFFER_GENERATION_STEPS = [
  "Analyzing Ideal Buyer & Market Positioning",
  "Formulating High-Ticket Pricing & Delivery Model",
  "Structuring Scope, Deliverables & Timeline",
  "Neutralizing Objections & Crafting Risk Reversals",
  "Synthesizing Conversion-Ready Offer Package",
];

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
  const [stepIndex, setStepIndex] = useState(0);
  const [assetContext, setAssetContext] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const user = auth.currentUser;
      const handedSession = sessionStorage.getItem(HANDOFF.session);
      const handedBlueprintRaw = sessionStorage.getItem(HANDOFF.blueprint);
      const handedFocus = sessionStorage.getItem(HANDOFF.offerFocus) || sessionStorage.getItem(HANDOFF.prompt);
      
      let studio = { assetContext: "", memory: null as any };
      if (user) {
        studio = await loadStudioContext(user.uid);
        setAssetContext(studio.assetContext);
      }
      
      let blueprint: BuyerBlueprint | null = null;
      if (user) {
        try {
          const q = query(
            collection(db, "blueprint_sessions"),
            where("owner_id", "==", user.uid)
          );
          const snap = await getDocs(q);
          let list = snap.docs.map((d) => d.data() as any);
          list.sort((a, b) => {
            const tA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
            const tB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
            return tB - tA;
          });
          if (handedSession) {
            list = list.filter((s) => s.session_id === handedSession);
          }
          const matched = list[0];
          blueprint = (matched?.blueprint as BuyerBlueprint | undefined) ?? (studio.memory?.audience_profile as BuyerBlueprint | undefined) ?? null;
        } catch (loadError: any) {
          setError(loadError?.message || "Failed to load blueprint.");
        }
      }
      
      if (handedBlueprintRaw) {
        try {
          blueprint = { ...(blueprint ?? {}), ...(JSON.parse(handedBlueprintRaw) as BuyerBlueprint) };
        } catch {
          sessionStorage.removeItem(HANDOFF.blueprint);
        }
      }
      
      if (!blueprint) {
        blueprint = {
          persona_name: "Strategic Growth Leader",
          demographics: "B2B Business Owners & Executives",
          core_fear: "Operational friction and revenue plateaus",
          buying_trigger: "Need for rapid, predictable scaling mechanism",
        };
      }
      
      setSessionId(handedSession ?? studio.memory?.source_session_id ?? "00000000-0000-4000-8000-000000000000");
      setBuyer(blueprint);
      setResult(blueprint?.offer ?? (studio.memory?.offer_profile as OfferBlueprint | undefined) ?? null);
      if (handedFocus) setFocus(handedFocus.slice(0, 1200));
      else if (blueprint?.elevator_pitch) setFocus(blueprint.elevator_pitch);
      setLoading(false);
    })();
  }, []);

  async function buildOffer() {
    setSaving(true);
    setStepIndex(0);
    setError(null);
    const interval = window.setInterval(() => {
      setStepIndex((curr) => Math.min(curr + 1, OFFER_GENERATION_STEPS.length - 1));
    }, 1200);

    try {
      const user = auth.currentUser;
      const userId = user?.uid || "00000000-0000-4000-8000-000000000000";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user) {
        const token = await user.getIdToken().catch(() => null);
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
      }

      const activeSession = sessionId || "00000000-0000-4000-8000-000000000000";
      const response = await fetch(OFFER_WEBHOOK_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          session_id: activeSession,
          user_id: userId,
          focus,
          delivery,
          paid_traffic: paidTraffic,
          timeline,
          pricing,
          blueprint: buyer,
          asset_context: assetContext,
          selected_sections: (() => {
            try {
              const raw = sessionStorage.getItem(HANDOFF.sections);
              return raw ? (JSON.parse(raw) as string[]) : [];
            } catch {
              return [];
            }
          })(),
        }),
      });

      const raw = await readN8nJson<unknown>(response, "Webinar Offer workflow");
      const candidate = Array.isArray(raw) ? raw[0] : raw;
      const offer = ((candidate as { data?: unknown })?.data ?? (candidate as { offer?: unknown })?.offer ?? candidate) as OfferBlueprint;
      if (!offer?.title || !Array.isArray(offer.scope)) {
        throw new Error("Webinar Offer returned an invalid offer structure.");
      }
      setBuyer({ ...(buyer ?? {}), offer });
      setResult(offer);
      sessionStorage.setItem("astrocraft:latest-offer", JSON.stringify(offer));
      if (user) {
        await saveWorkspaceMemory(user.uid, {
          onboarding_complete: true,
          audience_profile: buyer ?? {},
          offer_profile: offer,
          source_session_id: activeSession,
        });
      }
    } catch (buildError) {
      setError(buildError instanceof Error ? buildError.message : "Could not build the offer.");
    } finally {
      window.clearInterval(interval);
      setSaving(false);
    }
  }

  if (loading) return <div className="grid min-h-[55vh] place-items-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;

  if (!buyer) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <Target className="mx-auto size-8 text-muted-foreground" />
        <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">Build your buyer blueprint first</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">Webinar Offer uses your saved audience, problems, triggers, and objections so you do not answer the same questions twice.</p>
        <Link href="/provider/astro-ai" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background">Open Webinar Chat <ArrowRight className="size-4" /></Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1060px] pb-16 pt-2">
      <h1 className="mb-6 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl text-foreground">
        Shape an offer your buyer is ready to choose.
      </h1>

      <div className="grid gap-7 lg:grid-cols-[390px_minmax(0,1fr)]">
        <section className="space-y-5 rounded-3xl border border-border bg-card p-5">
          <Field label="Primary outcome"><textarea value={focus} onChange={(event) => setFocus(event.target.value)} rows={3} className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground/35" /></Field>
          <Field label="Delivery model"><Choice value={delivery} onChange={setDelivery} options={["Done-for-you", "Done-with-you", "Advisory"]} /></Field>
          <Field label="Paid traffic included?"><Choice value={paidTraffic} onChange={setPaidTraffic} options={["No - owned, partners, and organic", "Yes - include paid traffic"]} /></Field>
          <Field label="Delivery timeline"><Choice value={timeline} onChange={setTimeline} options={["4 weeks", "6 weeks", "8 weeks"]} /></Field>
          <Field label="Investment range"><Choice value={pricing} onChange={setPricing} options={["$10k-$20k", "$25k-$40k", "$40k+"]} /></Field>
          {error && <p className="text-xs leading-5 text-red-600">{error}</p>}
          <button type="button" onClick={() => void buildOffer()} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-medium text-background disabled:opacity-50 transition hover:opacity-90">
            {saving ? <Loader2 className="size-4 animate-spin text-amber-400" /> : <Layers3 className="size-4" />}{result ? "Refresh offer strategy" : "Build offer strategy"}
          </button>
        </section>

        <section className="min-w-0">
          {saving ? (
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-secondary">
                <div
                  className="h-full bg-foreground transition-all duration-700 ease-out"
                  style={{ width: `${((stepIndex + 1) / OFFER_GENERATION_STEPS.length) * 100}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Synthesizing Offer Strategy
                </p>
                <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
                  Step {stepIndex + 1} of {OFFER_GENERATION_STEPS.length}
                </span>
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Structuring a high-converting commercial offer.
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Analyzing delivery models, investment psychology, scope deliverables, and risk reversal mechanisms...
              </p>

              <div className="mt-6 space-y-2">
                {OFFER_GENERATION_STEPS.map((label, index) => {
                  const complete = index < stepIndex;
                  const active = index === stepIndex;
                  return (
                    <div
                      key={label}
                      className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-all duration-500 ${
                        active
                          ? "translate-x-1 border-foreground/30 bg-foreground/5 text-foreground font-medium"
                          : complete
                            ? "border-transparent text-foreground/80"
                            : "border-transparent text-muted-foreground/50"
                      }`}
                    >
                      <span className={`grid size-7 place-items-center rounded-lg text-xs ${active ? "bg-foreground text-background" : "bg-secondary"}`}>
                        {complete ? <Check className="size-3.5 text-emerald-500" /> : index + 1}
                      </span>
                      <span className="text-xs">{label}</span>
                      {active && (
                        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-amber-500 animate-pulse">
                          In progress
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : result ? (
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-600"><Check className="size-4" /> Saved to this buyer project</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.045em]">{result.title}</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{result.promise}</p>
              <OfferSection title="Positioning" items={[result.core_angle, `For: ${result.audience}`, `Delivery: ${result.delivery_model} over ${result.timeline}`, `Investment: ${result.pricing}`]} />
              <OfferSection title="Scope" items={result.scope} />
              <OfferSection title="Success metrics" items={result.success_metrics} />
              <div className="mt-6 rounded-2xl bg-secondary p-4"><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Risk reversal</p><p className="mt-2 text-sm leading-6">{result.risk_reversal}</p></div>
              <div className="mt-7 flex flex-wrap gap-3 border-t border-border pt-5">
                <Link href="/provider/slides" className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90 shadow-sm">Create webinar deck <ArrowRight className="size-4" /></Link>
                <button type="button" onClick={() => window.print()} className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary transition">Save offer as PDF</button>
              </div>
            </div>
          ) : (
            <div className="grid min-h-[520px] place-items-center rounded-3xl border border-dashed border-border bg-card/40 p-8 text-center">
              <div><Layers3 className="mx-auto size-7 text-muted-foreground" /><h2 className="mt-4 text-xl font-semibold">Your offer strategy will appear here</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Webinar Offer combines these commercial choices with the saved buyer blueprint, then carries the result into Webinar Content.</p></div>
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

function OfferSection({ title, items }: { title: string; items?: string[] }) {
  const list = Array.isArray(items) ? items : [];
  return <div className="mt-7"><h3 className="text-sm font-semibold">{title}</h3><ul className="mt-3 space-y-2">{list.map((item, index) => <li key={index} className="flex gap-2 text-sm leading-6 text-muted-foreground"><Check className="mt-1 size-4 shrink-0 text-foreground" />{item}</li>)}</ul></div>;
}
