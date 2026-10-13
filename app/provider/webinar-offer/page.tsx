"use client";

import {
  ArrowRight,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Coins,
  Copy,
  Download,
  Edit3,
  FileText,
  Layers,
  Loader2,
  Megaphone,
  MessageSquare,
  MoreHorizontal,
  Package,
  Plus,
  Save,
  Search,
  Send,
  Share2,
  SlidersHorizontal,
  Star,
  Target,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HANDOFF } from "@/lib/creation-handoff";
import { resolveSessionId } from "@/lib/chat-history";
import { readN8nJson } from "@/lib/n8n-response";
import { auth, db } from "@/lib/firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";
import { loadStudioContext } from "@/lib/workspace-context";
import { saveWorkspaceMemory } from "@/lib/workspace-memory";
import { n8nWebhookUrl } from "@/lib/n8n-url";
import { downloadOfferPdf } from "@/lib/offer-pdf";

export type OfferBlueprint = {
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
  /** The selling and growth plan. Absent on offers made before it existed. */
  how_to_sell?: string[];
  how_to_grow?: string[];
  first_week_actions?: string[];
};

type PlanListField = "how_to_sell" | "how_to_grow" | "first_week_actions";

export type BuyerBlueprint = Record<string, unknown> & {
  persona_name?: string;
  demographics?: string;
  core_fear?: string;
  buying_trigger?: string;
  objections?: string[];
  headlines?: string[];
  elevator_pitch?: string;
  strategy_synthesis?: string;
  competitive_edge?: string;
  offer?: OfferBlueprint;
};

const OFFER_TIMEOUT_MS = 120_000;

const OFFER_GENERATION_STEPS = [
  "Analyzing Ideal Buyer & Market Positioning",
  "Formulating High-Ticket Pricing & Delivery Model",
  "Structuring Scope, Deliverables & Timeline",
  "Neutralizing Objections & Crafting Risk Reversals",
  "Synthesizing Conversion-Ready Offer Package",
];

function extractCleanPrice(pricingStr: string): string {
  if (!pricingStr) return "";
  let clean = pricingStr.replace(/\(.*?\)/g, "").trim();
  clean = clean.replace(/total commercial investment/gi, "").trim();
  clean = clean.replace(/commercial investment/gi, "").trim();
  clean = clean.replace(/commercial/gi, "").trim();
  clean = clean.replace(/investment/gi, "").trim();

  const rangeMatch = clean.match(/(\$?\s*[\d,]+[kK]?)\s*[-–—to]+\s*(\$?\s*[\d,]+[kK]?)/);
  if (rangeMatch) {
    const p1 = rangeMatch[1].trim().startsWith("$") ? rangeMatch[1].trim() : `$${rangeMatch[1].trim()}`;
    const p2 = rangeMatch[2].trim().startsWith("$") ? rangeMatch[2].trim() : `$${rangeMatch[2].trim()}`;
    return `${p1} – ${p2}`;
  }

  const singleMatch = clean.match(/(\$?\s*[\d,]+[kK]?)/);
  if (singleMatch) {
    return singleMatch[1].trim().startsWith("$") ? singleMatch[1].trim() : `$${singleMatch[1].trim()}`;
  }

  return clean.slice(0, 15);
}

function getShortDelivery(val: string): string {
  if (!val) return "Done-for-you";
  if (/done[- ]for[- ]you/i.test(val)) return "Done-for-you";
  if (/done[- ]with[- ]you/i.test(val)) return "Done-with-you";
  if (/advisory/i.test(val)) return "Advisory";
  return val.replace(/\(.*?\)/g, "").trim().split(/\s+/).slice(0, 2).join(" ") || "Done-for-you";
}

function getGlanceTraffic(val: string): string {
  if (!val) return "Organic";
  if (/no\b|organic|owned|partner/i.test(val)) return "Organic";
  return "Paid Traffic";
}

function getGlanceTrafficDisplay(val: string): string {
  if (!val) return "Organic / Owned";
  if (/no\b|organic|owned|partner/i.test(val)) return "Organic / Owned";
  if (/paid|yes/i.test(val)) return "Paid Traffic";
  return val.length > 16 ? val.slice(0, 16) : val;
}

function getShortTimeline(timelineStr: string): string {
  if (!timelineStr) return "";
  const match = timelineStr.match(/\b(\d+)\s*(weeks?|days?|months?)\b/i);
  if (match) return `${match[1]} ${match[2]}`;
  return timelineStr.replace(/\(.*?\)/g, "").trim().split(/\s+/).slice(0, 2).join(" ") || timelineStr;
}

function cleanInputPrice(val: string): string {
  return val
    .replace(/total commercial investment/gi, "")
    .replace(/commercial investment/gi, "")
    .replace(/commercial/gi, "")
    .replace(/investment/gi, "")
    .replace(/\(.*?\)/g, "")
    .trim();
}

function parseMinMax(pricingStr: string): { min: string; max: string } {
  if (!pricingStr) return { min: "", max: "" };
  const clean = cleanInputPrice(pricingStr);
  const parts = clean.split(/[-–—to]/).map((s) => s.trim().replace(/^\$/, ""));
  if (parts.length >= 2) {
    return { min: cleanInputPrice(parts[0]), max: cleanInputPrice(parts[1]) };
  }
  if (parts.length === 1 && parts[0]) {
    return { min: cleanInputPrice(parts[0]), max: "" };
  }
  return { min: "", max: "" };
}

function getProductInitials(title: string): string {
  if (!title) return "WS";
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return title.slice(0, 2).toUpperCase();
}

function deriveOfferTitle(focusText: string, blueprint?: BuyerBlueprint | null): string {
  const clean = focusText.trim();
  const headlines = Array.isArray(blueprint?.headlines) ? blueprint.headlines : [];

  if (headlines[0] && !/sales engine/i.test(headlines[0]) && headlines[0].length < 50) {
    return headlines[0].replace(/[.!?]+$/, "");
  }

  const brandMatch = clean.match(/^([A-Z0-9][a-zA-Z0-9_\s&'-]{1,25}?)\s+(helps|provides|offers|is|empowers|enables|gives|delivers)/i);
  if (brandMatch) {
    const brand = brandMatch[1].trim();
    if (/shoe|footwear|sneaker/i.test(clean)) {
      return `${brand} Premium Footwear`;
    }
    if (/saas|software|platform|app\b/i.test(clean)) {
      return `${brand} Platform`;
    }
    if (/course|program|coaching|training/i.test(clean)) {
      return `${brand} Accelerator`;
    }
    if (/agency|service|consulting/i.test(clean)) {
      return `${brand} Advisory Program`;
    }
    return `${brand} Implementation`;
  }

  if (blueprint?.persona_name && blueprint.persona_name !== "Target Buyer") {
    return `${blueprint.persona_name} Solution`;
  }

  const words = clean.split(/\s+/).slice(0, 4).join(" ");
  return words.replace(/[,;:.!?]+$/, "") || "Custom Offer Strategy";
}

/**
 * Builds offer components strictly from the user's actual chat conversation data.
 */
function buildOfferFromChatData(
  blueprint: BuyerBlueprint,
  focusText: string,
  deliveryModel = "Done-for-you",
  timelineStr = "6 weeks",
  pricingStr = "$25k – $40k"
): OfferBlueprint {
  const pName = blueprint.persona_name || "Target Buyer";
  const headlines = Array.isArray(blueprint.headlines) ? blueprint.headlines : [];
  const objections = Array.isArray(blueprint.objections) ? blueprint.objections : [];
  const pitch = focusText.trim() || blueprint.elevator_pitch || "";

  const title = deriveOfferTitle(pitch, blueprint);
  const promise = pitch || `A structured ${getShortTimeline(timelineStr) || "6 weeks"} ${deliveryModel.toLowerCase()} program designed to achieve consistent growth.`;
  const audience = blueprint.demographics || pName;

  const coreAngle =
    blueprint.strategy_synthesis ||
    (blueprint.buying_trigger
      ? `Tailored specifically for ${pName} who need a proven solution to resolve ${blueprint.core_fear || "friction"} without budget risk or operational drag.`
      : `Tailored specifically for ${audience} to deliver high-conviction outcomes with verified execution.`);

  const scope = [
    `Diagnostic Audit: Understand conversion barriers, core buying triggers, and competitive positioning for ${pName}.`,
    `Conversion Narrative: Architect presentation hooks, proof elements, and overcome key objection (${objections[0] || "value skepticism"}).`,
    `Asset Production: Develop high-converting slide deck, script architecture, and campaign assets.`,
    `Distribution & Partnership: Execute rollout sequence, email workflows, and strategic acquisition channels.`,
  ];

  const successMetrics = [
    headlines[0] || "High perceived value and commercial conviction",
    headlines[1] || "Eliminates buyer friction with verified durability and style",
    blueprint.competitive_edge || blueprint.buying_trigger || "Scalable customer acquisition architecture tailored for the target audience",
  ].filter(Boolean);

  const riskReversal = blueprint.core_fear
    ? `This strategy balances speed, credibility and long-term growth — directly resolving the fear of ${blueprint.core_fear} while installing a repeatable acquisition engine.`
    : "This strategy balances speed, credibility and long-term growth — giving you a repeatable acquisition engine that reduces conversion friction and maximizes buyer lifetime value.";

  return {
    title,
    promise,
    audience,
    core_angle: coreAngle,
    delivery_model: deliveryModel,
    traffic_strategy: "No (owned, partners, organic)",
    timeline: timelineStr || "6 weeks",
    pricing: pricingStr || "$25k – $40k",
    scope,
    success_metrics: successMetrics,
    risk_reversal: riskReversal,
  };
}

export default function OfferWorkspacePage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [buyer, setBuyer] = useState<BuyerBlueprint | null>(null);
  const [delivery, setDelivery] = useState("");
  const [paidTraffic, setPaidTraffic] = useState("");
  const [timeline, setTimeline] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [pricing, setPricing] = useState("");
  const [focus, setFocus] = useState("");
  const [result, setResult] = useState<OfferBlueprint | null>(null);
  const [anchorText, setAnchorText] = useState("");
  const [productImage, setProductImage] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [assetContext, setAssetContext] = useState("");
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [targetVerifiedLabel, setTargetVerifiedLabel] = useState("Target Outcome Verified");
  const [alignedStatusLabel, setAlignedStatusLabel] = useState("100% Aligned");
  const [copyToast, setCopyToast] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);

  const moreMenuRef = useRef<HTMLDivElement>(null);

  function handleMinPriceChange(val: string) {
    const cleaned = cleanInputPrice(val);
    setMinPrice(cleaned);
    const minVal = cleaned.replace(/^\$/, "");
    const maxVal = maxPrice.replace(/^\$/, "");
    const newPricing = minVal && maxVal ? `$${minVal} – $${maxVal}` : minVal ? `$${minVal}` : "";
    setPricing(newPricing);
    if (result) {
      setResult({ ...result, pricing: newPricing });
      setHasUnsavedChanges(true);
    }
  }

  function handleMaxPriceChange(val: string) {
    const cleaned = cleanInputPrice(val);
    setMaxPrice(cleaned);
    const minVal = minPrice.replace(/^\$/, "");
    const maxVal = cleaned.replace(/^\$/, "");
    const newPricing = minVal && maxVal ? `$${minVal} – $${maxVal}` : maxVal ? `$${maxVal}` : "";
    setPricing(newPricing);
    if (result) {
      setResult({ ...result, pricing: newPricing });
      setHasUnsavedChanges(true);
    }
  }

  function handleProductImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      setProductImage(url);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("astrocraft:custom-product-image", url);
      }
    };
    reader.readAsDataURL(file);
  }

  // Live Inline Editing Handlers
  function updateResultField<K extends keyof OfferBlueprint>(field: K, value: OfferBlueprint[K]) {
    if (!result) return;
    setResult({ ...result, [field]: value });
    if (field === "pricing" && typeof value === "string") {
      setPricing(value);
      const parsed = parseMinMax(value);
      if (parsed.min) setMinPrice(parsed.min);
      if (parsed.max) setMaxPrice(parsed.max);
    } else if (field === "promise" && typeof value === "string") {
      setFocus(value);
    } else if (field === "timeline" && typeof value === "string") {
      setTimeline(value);
    } else if (field === "delivery_model" && typeof value === "string") {
      setDelivery(value);
    } else if (field === "traffic_strategy" && typeof value === "string") {
      setPaidTraffic(value);
    }
    setHasUnsavedChanges(true);
  }

  function updatePlanItem(field: PlanListField, index: number, text: string) {
    if (!result) return;
    const list = [...(result[field] ?? [])];
    list[index] = text;
    updateResultField(field, list);
  }

  function addPlanItem(field: PlanListField) {
    if (!result) return;
    updateResultField(field, [...(result[field] ?? []), ""]);
  }

  function removePlanItem(field: PlanListField, index: number) {
    if (!result) return;
    updateResultField(field, (result[field] ?? []).filter((_, i) => i !== index));
  }

  function updateKeyMessage(index: number, text: string) {
    if (!result) return;
    const updated = [...result.success_metrics];
    updated[index] = text;
    updateResultField("success_metrics", updated);
  }

  function addKeyMessage() {
    if (!result) return;
    updateResultField("success_metrics", [...result.success_metrics, "New high-impact outcome message"]);
  }

  function removeKeyMessage(index: number) {
    if (!result) return;
    const updated = result.success_metrics.filter((_, i) => i !== index);
    updateResultField("success_metrics", updated);
  }

  function updateScopeStep(index: number, newTitle: string, newDesc: string) {
    if (!result) return;
    const updated = [...result.scope];
    updated[index] = `${newTitle}: ${newDesc}`;
    updateResultField("scope", updated);
  }

  async function handleSaveWorkspace() {
    if (!result) return;
    sessionStorage.setItem("astrocraft:latest-offer", JSON.stringify(result));
    sessionStorage.setItem(HANDOFF.offerFocus, focus);

    const user = auth.currentUser;
    if (user) {
      const activeSession = resolveSessionId(sessionId);
      await saveWorkspaceMemory(user.uid, {
        onboarding_complete: true,
        audience_profile: (buyer ?? {}) as Record<string, unknown>,
        offer_profile: result as unknown as Record<string, unknown>,
        source_session_id: activeSession,
      }).catch((err) => console.warn("Could not save to workspace memory:", err));
    }

    setHasUnsavedChanges(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  }

  function handleDownloadPdf() {
    if (!result) return;
    downloadOfferPdf(result);
  }

  function handleCopySummary() {
    if (!result) return;
    const cleanP = extractCleanPrice(pricing || result.pricing);
    const summaryText = `OFFER STRATEGY: ${result.title}
Core Promise: ${result.promise}

OFFER AT A GLANCE:
• Timeline: ${getShortTimeline(timeline || result.timeline)}
• Delivery: ${getShortDelivery(delivery || result.delivery_model)}
• Investment: ${cleanP}
• Traffic: ${paidTraffic.includes("No") ? "Organic" : "Paid Traffic"}

POSITIONING:
${result.core_angle}

KEY MESSAGES:
${result.success_metrics.map((m) => `• ${m}`).join("\n")}

DELIVERY ROADMAP:
${result.scope.map((s, i) => `0${i + 1}. ${s}`).join("\n")}

COMMERCIAL INVESTMENT:
Total investment: ${cleanP}
${anchorText}

WHY IT WORKS:
${result.risk_reversal}${
      result.how_to_sell?.length
        ? `\n\nHOW TO SELL IT:\n${result.how_to_sell.map((x, i) => `${i + 1}. ${x}`).join("\n")}`
        : ""
    }${
      result.how_to_grow?.length
        ? `\n\nHOW TO GROW IT:\n${result.how_to_grow.map((x, i) => `${i + 1}. ${x}`).join("\n")}`
        : ""
    }${
      result.first_week_actions?.length
        ? `\n\nTHIS WEEK:\n${result.first_week_actions.map((x) => `\u2022 ${x}`).join("\n")}`
        : ""
    }`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(summaryText);
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2500);
    }
  }

  function handleShare() {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2500);
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleResetToEmpty() {
    setBuyer(null);
    setResult(null);
    setFocus("");
    setTimeline("");
    setMinPrice("");
    setMaxPrice("");
    setPricing("");
    setDelivery("");
    setPaidTraffic("");
    setAnchorText("");
    setProductImage(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(HANDOFF.blueprint);
      sessionStorage.removeItem(HANDOFF.offerFocus);
      sessionStorage.removeItem(HANDOFF.prompt);
      sessionStorage.removeItem("astrocraft:latest-offer");
      sessionStorage.removeItem("astrocraft:custom-product-image");
    }
    const user = auth.currentUser;
    if (user) {
      await saveWorkspaceMemory(user.uid, {
        offer_profile: null as any,
      }).catch(() => {});
    }
    setMoreMenuOpen(false);
  }

  // Load chat conversation data on mount:
  // STRICTLY EMPTY ON FIRST OPEN UNTIL IMPORTED FROM CHAT OR GENERATED
  useEffect(() => {
    void (async () => {
      const user = auth.currentUser;
      const handedSession = sessionStorage.getItem(HANDOFF.session);
      const handedBlueprintRaw = sessionStorage.getItem(HANDOFF.blueprint);
      const handedFocus =
        sessionStorage.getItem(HANDOFF.offerFocus) || sessionStorage.getItem(HANDOFF.prompt);
      const customImg = sessionStorage.getItem("astrocraft:custom-product-image");
      if (customImg) setProductImage(customImg);

      let studio = { assetContext: "", memory: null as any };
      if (user) {
        studio = await loadStudioContext(user.uid);
        setAssetContext(studio.assetContext);
      }

      let loadedBlueprint: BuyerBlueprint | null = null;

      if (handedBlueprintRaw) {
        try {
          loadedBlueprint = JSON.parse(handedBlueprintRaw) as BuyerBlueprint;
        } catch {
          sessionStorage.removeItem(HANDOFF.blueprint);
        }
      }

      // FIRST OPEN: ALL FIELDS START EMPTY UNLESS EXPLICITLY IMPORTED FROM CHAT
      if (!loadedBlueprint && !handedFocus) {
        setBuyer(null);
        setResult(null);
        setFocus("");
        setTimeline("");
        setMinPrice("");
        setMaxPrice("");
        setPricing("");
        setDelivery("");
        setPaidTraffic("");
        setAnchorText("");
        sessionStorage.removeItem("astrocraft:latest-offer");
        setLoading(false);
        return;
      }

      // CHAT DATA IS IMPORTED: FILL ALL CONTENTS FROM CHAT
      const activeBuyer = loadedBlueprint || {
        persona_name: "Target Buyer",
        elevator_pitch: handedFocus || "",
      };

      setSessionId(
        handedSession ??
          studio.memory?.source_session_id ??
          "00000000-0000-4000-8000-000000000000"
      );
      setBuyer(activeBuyer);

      const derivedFocus =
        handedFocus ||
        activeBuyer.elevator_pitch ||
        activeBuyer.buying_trigger ||
        activeBuyer.strategy_synthesis ||
        "";
      setFocus(derivedFocus);

      // Synthesize offer matching this exact focus and buyer blueprint
      let existingOffer = activeBuyer.offer ?? null;
      if (existingOffer && derivedFocus) {
        existingOffer = {
          ...existingOffer,
          promise: derivedFocus,
          title: (/sales engine/i.test(existingOffer.title) && /footwear|shoe|student|aple/i.test(derivedFocus))
            ? deriveOfferTitle(derivedFocus, activeBuyer)
            : existingOffer.title || deriveOfferTitle(derivedFocus, activeBuyer),
          success_metrics: existingOffer.success_metrics?.some((m) => /discovery call/i.test(m))
            ? [
                activeBuyer.headlines?.[0] || "High perceived value and commercial conviction",
                activeBuyer.headlines?.[1] || "Eliminates buyer hesitation with verified durability and style",
                activeBuyer.competitive_edge || "High-converting acquisition architecture tailored for target buyers",
              ].filter(Boolean)
            : existingOffer.success_metrics,
        };
      }

      const activeTimeline = existingOffer?.timeline || "6 weeks";
      const activePricing = existingOffer?.pricing || "$25k – $40k";
      const activeDelivery = existingOffer?.delivery_model || "Done-for-you";
      const activeTraffic = existingOffer?.traffic_strategy || "No (owned, partners, organic)";

      setTimeline(activeTimeline);
      setPricing(activePricing);
      setDelivery(activeDelivery);
      setPaidTraffic(activeTraffic);

      const parsedPrice = parseMinMax(activePricing);
      setMinPrice(parsedPrice.min || "25k");
      setMaxPrice(parsedPrice.max || "40k");

      const fullOffer =
        existingOffer ||
        buildOfferFromChatData(
          activeBuyer,
          derivedFocus,
          activeDelivery,
          activeTimeline,
          activePricing
        );

      if (derivedFocus) {
        fullOffer.promise = derivedFocus;
        if (!fullOffer.core_angle || fullOffer.core_angle === derivedFocus) {
          fullOffer.core_angle = `Tailored specifically for ${fullOffer.audience || "target buyers"} to overcome hesitation and deliver verified execution.`;
        }
      }

      setResult(fullOffer);
      setAnchorText(
        `Anchored against commercial execution value for ${activeBuyer.persona_name || "targeted buyers"}. Includes end-to-end deliverables, presentation assets, and dedicated rollout guidance.`
      );
      setLoading(false);
    })();
  }, []);

  async function buildOffer() {
    if (!focus.trim()) {
      setError("Please enter a primary outcome or import a blueprint from Webinar Chat.");
      return;
    }

    setSaving(true);
    setStepIndex(0);
    setError(null);
    const interval = window.setInterval(() => {
      setStepIndex((curr) => Math.min(curr + 1, OFFER_GENERATION_STEPS.length - 1));
    }, 1200);

    try {
      const user = auth.currentUser;
      const activeSession = resolveSessionId(sessionId);
      let offer: OfferBlueprint;

      const effectiveTimeline = timeline || "6 weeks";
      const effectivePricing = pricing || (minPrice && maxPrice ? `$${minPrice} – $${maxPrice}` : "$25k – $40k");

      if (!user) {
        await new Promise((res) => setTimeout(res, 2500));
        offer = buildOfferFromChatData(
          buyer || { elevator_pitch: focus, persona_name: focus.split(" ").slice(0, 3).join(" ") },
          focus,
          delivery,
          effectiveTimeline,
          effectivePricing
        );
      } else {
        const token = await user.getIdToken().catch(() => null);
        if (!token) {
          throw new Error("Your sign-in session expired. Please sign in again.");
        }

        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), OFFER_TIMEOUT_MS);

        try {
          const response = await fetch(n8nWebhookUrl("offer-iq"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
            body: JSON.stringify({
              session_id: activeSession,
              user_id: user.uid,
              focus,
              delivery,
              paid_traffic: paidTraffic,
              timeline: effectiveTimeline,
              pricing: extractCleanPrice(effectivePricing),
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
          const remoteOffer = ((candidate as { data?: unknown })?.data ??
            (candidate as { offer?: unknown })?.offer ??
            candidate) as OfferBlueprint;
          if (
            !remoteOffer?.title ||
            !Array.isArray(remoteOffer.scope) ||
            remoteOffer.scope.length === 0
          ) {
            throw new Error("The Webinar Offer workflow returned an incomplete offer.");
          }
          offer = remoteOffer;
        } catch (webhookError) {
          // Never swap in canned text: it looked like a real strategy and hid
          // that the service had failed. Say what happened instead.
          console.error("offer-iq webhook failed:", webhookError);
          const message = webhookError instanceof Error ? webhookError.message : "";
          if (/returned 401/.test(message)) {
            throw new Error("The strategy service didn't accept your sign-in. Refresh the page, sign in again and retry. Nothing was changed.");
          }
          if (webhookError instanceof DOMException && webhookError.name === "AbortError") {
            throw new Error("The strategy took too long to build. Nothing was changed, so please try again.");
          }
          throw new Error("The strategy service couldn't build your strategy just now. Nothing was changed. Please try again in a moment.");
        } finally {
          window.clearTimeout(timeoutId);
        }
      }

      // Enforce synchronization with current primary outcome and inputs
      offer.promise = focus;
      offer.delivery_model = delivery || offer.delivery_model;
      offer.timeline = effectiveTimeline;
      offer.pricing = effectivePricing;
      if (/sales engine/i.test(offer.title) && !/sales engine/i.test(focus)) {
        offer.title = deriveOfferTitle(focus, buyer);
      }
      if (!offer.core_angle || offer.core_angle === focus) {
        offer.core_angle = `Tailored specifically for ${offer.audience || buyer?.persona_name || "target buyers"} to overcome hesitation and deliver verified execution.`;
      }

      setBuyer({ ...(buyer ?? {}), offer });
      setResult(offer);
      sessionStorage.setItem("astrocraft:latest-offer", JSON.stringify(offer));
      sessionStorage.setItem(HANDOFF.offerFocus, focus);

      if (user) {
        await saveWorkspaceMemory(user.uid, {
          onboarding_complete: true,
          audience_profile: (buyer ?? {}) as Record<string, unknown>,
          offer_profile: offer as unknown as Record<string, unknown>,
          source_session_id: activeSession,
        }).catch((err) => console.warn("Could not save to workspace memory:", err));
      }
    } catch (buildError) {
      setError(buildError instanceof Error ? buildError.message : "Could not build the offer.");
    } finally {
      window.clearInterval(interval);
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-6 animate-spin text-[#1f4d3d]" />
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Checking Strategy Workspace...
          </p>
        </div>
      </div>
    );
  }

  const cleanPrice = extractCleanPrice(pricing || result?.pricing || "");
  const shortTimeline = getShortTimeline(timeline || result?.timeline || "");
  const shortDelivery = getShortDelivery(delivery || result?.delivery_model || "");
  const glanceTraffic = getGlanceTraffic(paidTraffic || result?.traffic_strategy || "");

  // Parsed scope roadmap deliverables
  const roadmapSteps = (() => {
    if (!result) return [];
    const rawScope = result.scope || [];
    const defaultIcons = [Search, FileText, Layers, Send];

    return rawScope.slice(0, 4).map((item, idx) => {
      let title = `Phase 0${idx + 1}`;
      let desc = item;

      const colonIdx = item.indexOf(":");
      if (colonIdx > -1) {
        title = item.slice(0, colonIdx).trim() || `Phase 0${idx + 1}`;
        desc = item.slice(colonIdx + 1).trim() || item;
      } else {
        const dashIdx = item.indexOf(" - ");
        if (dashIdx > -1) {
          title = item.slice(0, dashIdx).trim() || `Phase 0${idx + 1}`;
          desc = item.slice(dashIdx + 3).trim() || item;
        }
      }

      return {
        num: `0${idx + 1}`,
        title,
        desc,
        icon: defaultIcons[idx] || Search,
      };
    });
  })();

  return (
    <div className="relative mx-auto w-full max-w-[1520px] pb-16">
      {/* Decorative Botanical Leaf Watermark */}
      <div
        className="pointer-events-none fixed bottom-0 right-0 z-0 opacity-20 select-none hidden lg:block"
        aria-hidden="true"
      >
        <svg
          width="190"
          height="260"
          viewBox="0 0 200 280"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-[#1f4d3d]"
        >
          <path
            d="M200 280C170 240 140 200 155 140C165 110 145 70 115 50C140 80 135 125 115 155C95 185 130 240 200 280Z"
            fill="currentColor"
            fillOpacity="0.18"
          />
          <path
            d="M160 130C130 110 100 85 110 35C120 15 95 0 70 0C85 20 80 50 65 70C50 95 70 125 160 130Z"
            fill="currentColor"
            fillOpacity="0.22"
          />
        </svg>
      </div>

      {/* SECTION 4: PAGE INTRODUCTION HEADER */}
      <header
        id="section-overview"
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-border/60 pb-5"
      >
        <div>
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1f4d3d]">
            <span>OFFER STRATEGY</span>
          </div>

          <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight text-[#1d2a27] sm:text-[34px]">
            {result ? "Your offer strategy is ready." : "Offer Strategy Workspace"}
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            {result
              ? "All strategy content is editable in real-time. Built from your buyer, delivery model, timeline and investment range."
              : "Imported from your Webinar Chat conversation to structure a high-converting commercial offer."}
          </p>

          {!result && (
            <div className="mt-3 flex items-center gap-5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <MessageSquare className="size-3.5 text-[#1f4d3d]" /> Awaiting chat conversation import
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {result && (
            <>
              {hasUnsavedChanges ? (
                <button
                  type="button"
                  onClick={() => void handleSaveWorkspace()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#1f4d3d] bg-[#1f4d3d] px-3 py-1.5 text-xs font-medium text-white shadow-xs transition-all hover:bg-[#173c31]"
                  title="Save edited changes"
                >
                  <Save className="size-3.5" /> Save changes
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("section-offer");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#ddd7ca] bg-[#fffefb] px-3 py-1.5 text-xs font-medium text-[#1d2a27] transition-all hover:bg-[#f4f1e8] hover:border-[#bdb5a5]"
                  title="Edit strategy elements"
                >
                  <Edit3 className="size-3.5 text-muted-foreground" /> Edit
                </button>
              )}

              <button
                type="button"
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#ddd7ca] bg-[#fffefb] px-3 py-1.5 text-xs font-medium text-[#1d2a27] transition-all hover:bg-[#f4f1e8] hover:border-[#bdb5a5]"
                title="Copy formatted strategy text"
              >
                <Copy className="size-3.5 text-muted-foreground" />
                {copyToast ? "Copied!" : "Copy"}
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#ddd7ca] bg-[#fffefb] px-3 py-1.5 text-xs font-medium text-[#1d2a27] transition-all hover:bg-[#f4f1e8] hover:border-[#bdb5a5]"
              >
                <Download className="size-3.5 text-muted-foreground" /> Export PDF
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#ddd7ca] bg-[#fffefb] px-3 py-1.5 text-xs font-medium text-[#1d2a27] transition-all hover:bg-[#f4f1e8] hover:border-[#bdb5a5]"
              >
                <Share2 className="size-3.5 text-muted-foreground" />
                {shareToast ? "Link Copied!" : "Share"}
              </button>
            </>
          )}

          {/* More (...) Menu */}
          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              aria-label="More options"
              className="inline-flex items-center justify-center rounded-lg border border-[#ddd7ca] bg-[#fffefb] p-1.5 text-[#1d2a27] transition-all hover:bg-[#f4f1e8] hover:border-[#bdb5a5]"
            >
              <MoreHorizontal className="size-4 text-muted-foreground" />
            </button>

            {moreMenuOpen && (
              <div className="absolute right-0 top-full z-30 mt-1.5 w-52 rounded-xl border border-border bg-[#fffefb] p-1.5 shadow-lg">
                <Link
                  href="/provider/webinar-chat"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-secondary/60"
                >
                  <MessageSquare className="size-3.5 text-[#1f4d3d]" /> Open Webinar Chat
                </Link>
                {result && (
                  <button
                    type="button"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      window.print();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-secondary/60"
                  >
                    <FileText className="size-3.5 text-muted-foreground" /> Print Strategy
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleResetToEmpty}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-[#b95f35] hover:bg-[#b95f35]/10"
                >
                  <Trash2 className="size-3.5" /> Clear / Reset Workspace
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Save Success Alert */}
      {saveSuccess && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#1f4d3d]/20 bg-[#1f4d3d]/10 px-4 py-2.5 text-xs font-medium text-[#1f4d3d] animate-in fade-in">
          <Check className="size-4" /> Strategy changes saved successfully!
        </div>
      )}

      {/* SECTION 19: 2-PART WORKSPACE STRUCTURE */}
      <div className={`relative grid grid-cols-1 gap-6 ${leftPanelCollapsed ? "" : "lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]"} items-start`}>
        {/* ========================================================= */}
        {/* SECTION 5: LEFT PANEL — STRATEGY INPUTS */}
        {/* ========================================================= */}
        {leftPanelCollapsed ? (
          <div className="lg:sticky lg:top-24">
            <button
              type="button"
              onClick={() => setLeftPanelCollapsed(false)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#ddd7ca] bg-[#fffefb] px-3.5 py-2.5 text-xs font-medium text-[#1d2a27] hover:bg-[#faf8f4] shadow-xs transition"
              title="Show Strategy Inputs"
            >
              <SlidersHorizontal className="size-3.5 text-[#1f4d3d]" />
              <span>Show Strategy Inputs</span>
            </button>
          </div>
        ) : (
          <aside className="space-y-4">
            <div className="rounded-2xl border border-[#e2dbce] bg-[#fffefb] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-[#eee8dc]">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="size-3.5 text-[#1f4d3d]" />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#1d2a27]">
                    Strategy Inputs
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setLeftPanelCollapsed(true)}
                  className="rounded-lg p-1 text-muted-foreground hover:text-[#1d2a27] hover:bg-[#f4efe4] transition"
                  title="Collapse panel"
                >
                  <ChevronLeft className="size-4" />
                </button>
              </div>

              <div className="space-y-5">
                {/* 1. PRIMARY OUTCOME */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#1d2a27] mb-1.5 tracking-tight">
                    Primary Outcome & Goal
                  </label>
                  <textarea
                    value={focus}
                    onChange={(e) => {
                      setFocus(e.target.value);
                      if (result) {
                        updateResultField("promise", e.target.value);
                      }
                    }}
                    rows={3}
                    spellCheck={false}
                    placeholder="Enter your product, offer goal or primary outcome..."
                    className="w-full resize-none rounded-xl border border-[#ddd7ca] bg-[#faf8f5] hover:bg-[#f5f0e6]/30 focus:bg-white p-3 text-xs leading-relaxed text-[#1d2a27] outline-none focus:border-[#1f4d3d] focus:ring-2 focus:ring-[#1f4d3d]/10 transition shadow-2xs placeholder:text-muted-foreground/60"
                  />
                </div>

                {/* 2. DELIVERY MODEL */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#1d2a27] mb-1.5 tracking-tight">
                    Delivery Model
                  </label>
                  <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#f2ede4]/80 p-1 border border-[#e2dbce]">
                    {[
                      { id: "Done-for-you", label: "DFY", full: "Done-for-you" },
                      { id: "Done-with-you", label: "DWY", full: "Done-with-you" },
                      { id: "Advisory", label: "Advisory", full: "Advisory" },
                    ].map((opt) => {
                      const isSelected = delivery === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setDelivery(opt.id);
                            if (result) updateResultField("delivery_model", opt.id);
                          }}
                          title={opt.full}
                          className={`py-1.5 text-xs font-medium rounded-lg transition-all text-center ${
                            isSelected
                              ? "bg-white text-[#1f4d3d] font-semibold shadow-xs"
                              : "text-[#665e52] hover:text-[#1d2a27]"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground/80 px-0.5">
                    {delivery === "Done-for-you"
                      ? "Turnkey full-service execution"
                      : delivery === "Done-with-you"
                      ? "Collaborative sprint co-building"
                      : "Advisory & strategic review"}
                  </p>
                </div>

                {/* INVESTMENT RANGE */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold text-[#1d2a27] tracking-tight">
                      Investment Range
                    </label>
                    <span className="font-mono text-[10px] text-muted-foreground">USD</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground/80">
                        $
                      </span>
                      <input
                        type="text"
                        value={minPrice}
                        onChange={(e) => handleMinPriceChange(e.target.value)}
                        spellCheck={false}
                        placeholder="25k"
                        className="w-full rounded-xl border border-[#ddd7ca] bg-[#faf8f5] hover:bg-[#f5f0e6]/30 focus:bg-white pl-6 pr-10 py-2 text-xs text-[#1d2a27] outline-none focus:border-[#1f4d3d] focus:ring-2 focus:ring-[#1f4d3d]/10 transition shadow-2xs font-mono"
                      />
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60 font-mono">
                        Min
                      </span>
                    </div>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground/80">
                        $
                      </span>
                      <input
                        type="text"
                        value={maxPrice}
                        onChange={(e) => handleMaxPriceChange(e.target.value)}
                        spellCheck={false}
                        placeholder="40k"
                        className="w-full rounded-xl border border-[#ddd7ca] bg-[#faf8f5] hover:bg-[#f5f0e6]/30 focus:bg-white pl-6 pr-10 py-2 text-xs text-[#1d2a27] outline-none focus:border-[#1f4d3d] focus:ring-2 focus:ring-[#1f4d3d]/10 transition shadow-2xs font-mono"
                      />
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60 font-mono">
                        Max
                      </span>
                    </div>
                  </div>
                </div>

                {error && <p className="text-xs text-[#b95f35]">{error}</p>}

                {/* REGENERATE / GENERATE STRATEGY BUTTON */}
                <div className="pt-3 border-t border-[#eee8dc]">
                  <button
                    type="button"
                    onClick={() => void buildOffer()}
                    disabled={saving}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f4d3d] hover:bg-[#173c31] active:scale-[0.99] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-all disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="size-3.5 animate-spin text-white" />
                    ) : (
                      <ArrowRight className="size-3.5 text-emerald-200" />
                    )}
                    <span>{result ? "Update Strategy" : "Generate Strategy"}</span>
                  </button>
                  <p className="mt-2 text-center text-[10px] leading-relaxed text-muted-foreground">
                    {result
                      ? "Syncs changes to your offer blueprint."
                      : "Synthesizes an offer strategy from your inputs."}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* ========================================================= */}
        {/* CENTER PANEL: GENERATED STRATEGY OR EMPTY STATE */}
        {/* ========================================================= */}
        <main className="min-w-0 space-y-5">
          {saving ? (
            /* Animated Generation Progress Screen */
            <div className="relative overflow-hidden rounded-2xl border border-[#ddd7ca] bg-[#fffefb] p-6 sm:p-8">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-[#e9e4d8]">
                <div
                  className="h-full bg-[#1f4d3d] transition-all duration-700 ease-out"
                  style={{
                    width: `${((stepIndex + 1) / OFFER_GENERATION_STEPS.length) * 100}%`,
                  }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#1f4d3d]">
                  <span>Synthesizing Strategy Workspace</span>
                </div>
                <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
                  Step {stepIndex + 1} of {OFFER_GENERATION_STEPS.length}
                </span>
              </div>

              <h2 className="mt-4 font-serif text-2xl font-normal text-[#1d2a27] sm:text-3xl">
                Structuring an actionable commercial offer strategy.
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Analyzing audience triggers, delivery timeline, pricing architecture, and proof mechanics...
              </p>

              <div className="mt-6 space-y-2">
                {OFFER_GENERATION_STEPS.map((label, idx) => {
                  const complete = idx < stepIndex;
                  const active = idx === stepIndex;
                  return (
                    <div
                      key={label}
                      className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-all duration-300 ${
                        active
                          ? "border-[#1f4d3d]/30 bg-[#1f4d3d]/5 text-[#1f4d3d] font-medium"
                          : complete
                            ? "border-transparent text-foreground/80"
                            : "border-transparent text-muted-foreground/50"
                      }`}
                    >
                      <span
                        className={`grid size-6 place-items-center rounded-lg text-xs ${
                          active ? "bg-[#1f4d3d] text-white" : "bg-secondary"
                        }`}
                      >
                        {complete ? <Check className="size-3 text-[#1f4d3d]" /> : idx + 1}
                      </span>
                      <span className="text-xs">{label}</span>
                      {active && (
                        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-[#9a6a18] animate-pulse">
                          Processing
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : !result ? (
            /* EMPTY INITIAL STATE: KEPT COMPLETELY BLANK UNTIL CHAT IS IMPORTED */
            <div className="grid min-h-[520px] place-items-center rounded-2xl border border-dashed border-[#ddd7ca] bg-[#fffefb]/60 p-8 sm:p-12 text-center">
              <div className="max-w-lg space-y-4">
                <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-[#d6e3d8] bg-[#edf3ee] text-[#1f4d3d] shadow-xs">
                  <MessageSquare className="size-6" />
                </div>

                <div className="space-y-1.5">
                  <h2 className="font-serif text-2xl font-semibold text-[#1d2a27] sm:text-3xl">
                    No offer strategy imported yet
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    All contents in your offer are filled automatically according to your Webinar Chat conversation. Chat with our AI to define your buyer, core offer promise, and delivery plan.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/provider/webinar-chat"
                    className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-[#1f4d3d] px-6 py-3 text-xs font-semibold text-white shadow-xs transition hover:bg-[#173c31]"
                  >
                    Open Webinar Chat <ArrowRight className="size-4" />
                  </Link>
                  {focus.trim() && (
                    <button
                      type="button"
                      onClick={() => void buildOffer()}
                      className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-[#ddd7ca] bg-[#fffefb] px-5 py-3 text-xs font-medium text-[#1d2a27] transition hover:bg-[#f4f1e8]"
                    >
                      Generate from inputs
                    </button>
                  )}
                </div>

                <div className="mt-8 rounded-xl border border-[#e8dfcf] bg-[#faf8f4] p-4 text-left">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                    How it works
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#263b34]">
                    <div className="space-y-1">
                      <span className="font-semibold text-[#1f4d3d]">1. Chat Discovery</span>
                      <p className="text-[11px] text-muted-foreground">
                        Extract audience triggers, problem, and primary outcome in Webinar Chat.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="font-semibold text-[#1f4d3d]">2. Auto Import</span>
                      <p className="text-[11px] text-muted-foreground">
                        Your answers populate the strategy inputs, pricing, and positioning angle.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="font-semibold text-[#1f4d3d]">3. Structured Offer</span>
                      <p className="text-[11px] text-muted-foreground">
                        An actionable delivery roadmap and risk reversal ready for slide creation.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* FILLED STRATEGY WORKSPACE: EVERY TEXT ELEMENT IS EDITABLE */
            /* ========================================================= */
            <div className="rounded-2xl border border-[#ddd7ca] bg-[#fffefb] p-6 sm:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-8 divide-y divide-[#e8dfcf]">
              {/* SECTION 6 & 7: YOUR OFFER & OFFER AT A GLANCE */}
              <div id="section-offer">
                <div className="flex flex-col xl:flex-row items-start justify-between gap-6">
                  {/* Left Column: Product visual + title + Core Value Proposition (Editable) */}
                  <div className="flex items-start gap-4 min-w-0 flex-1 w-full">
                    <div className="relative group size-16 sm:size-20 shrink-0 overflow-hidden rounded-2xl border border-[#d6e3d8] bg-gradient-to-br from-[#f0f5f1] to-[#e4ede5] shadow-xs flex items-center justify-center">
                      {productImage ? (
                        <img
                          src={productImage}
                          alt={result.title}
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center p-1.5">
                          <span className="font-serif text-xl sm:text-2xl font-bold text-[#1f4d3d]">
                            {getProductInitials(result.title)}
                          </span>
                          <span className="font-mono text-[8px] uppercase tracking-wider text-[#1f4d3d]/70 font-semibold">
                            OFFER
                          </span>
                        </div>
                      )}

                      <label
                        className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                        title="Upload product image"
                      >
                        <UploadCloud className="size-4" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleProductImageUpload}
                        />
                      </label>
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1f4d3d]">
                          CORE OFFER
                        </span>
                      </div>

                      {/* Editable Offer Title */}
                      <input
                        type="text"
                        value={result.title}
                        onChange={(e) => updateResultField("title", e.target.value)}
                        placeholder="Offer Title..."
                        spellCheck={false}
                        className="font-serif text-2xl sm:text-[28px] font-semibold text-[#1d2a27] leading-tight w-full bg-transparent hover:bg-[#faf8f4] focus:bg-[#faf8f4] border border-transparent hover:border-[#ddd7ca] focus:border-[#1f4d3d]/50 rounded-lg px-2 py-0.5 outline-none transition"
                      />

                      {/* Core Value Proposition & Primary Outcome */}
                      <div className="rounded-xl border border-[#e8dfcf] bg-[#faf8f4] p-3 space-y-1">
                        <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Core Value Proposition & Transformation
                        </span>
                        <textarea
                          value={result.promise}
                          onChange={(e) => updateResultField("promise", e.target.value)}
                          rows={2}
                          spellCheck={false}
                          placeholder="Primary outcome and transformation delivered to the buyer..."
                          className="text-xs sm:text-[13px] leading-relaxed text-[#1d2a27] w-full bg-transparent outline-none resize-none transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: SECTION 7: OFFER AT A GLANCE (Divided 4-column card) */}
                  <div className="w-full xl:w-[420px] 2xl:w-[440px] shrink-0 rounded-xl border border-[#e8dfcf] bg-[#faf8f4] p-3 sm:p-3.5">
                    <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2.5 text-center">
                      OFFER AT A GLANCE
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-0 sm:divide-x divide-[#e8dfcf] items-center text-center">
                      {/* 1. Timeline */}
                      <div className="flex flex-col items-center p-2 sm:px-1.5 sm:py-1 min-w-0 rounded-lg bg-card sm:bg-transparent border border-border/40 sm:border-none">
                        <Calendar className="size-4 text-[#1f4d3d] mb-1 sm:mb-1.5 shrink-0" />
                        <input
                          type="text"
                          value={result.timeline}
                          onChange={(e) => updateResultField("timeline", e.target.value)}
                          placeholder="6 weeks"
                          spellCheck={false}
                          title={result.timeline}
                          className="text-xs font-semibold text-[#1d2a27] bg-transparent text-center border border-transparent hover:border-[#ddd7ca] focus:border-[#1f4d3d]/50 rounded px-0.5 w-full outline-none transition truncate"
                        />
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mt-0.5">Timeline</span>
                      </div>

                      {/* 2. Delivery */}
                      <div className="flex flex-col items-center p-2 sm:px-1.5 sm:py-1 min-w-0 rounded-lg bg-card sm:bg-transparent border border-border/40 sm:border-none">
                        <Package className="size-4 text-[#1f4d3d] mb-1 sm:mb-1.5 shrink-0" />
                        <input
                          type="text"
                          value={result.delivery_model}
                          onChange={(e) => updateResultField("delivery_model", e.target.value)}
                          placeholder="Done-for-you"
                          spellCheck={false}
                          title={result.delivery_model}
                          className="text-xs font-semibold text-[#1d2a27] bg-transparent text-center border border-transparent hover:border-[#ddd7ca] focus:border-[#1f4d3d]/50 rounded px-0.5 w-full outline-none transition truncate"
                        />
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mt-0.5">Delivery</span>
                      </div>

                      {/* 3. Investment */}
                      <div className="flex flex-col items-center p-2 sm:px-1.5 sm:py-1 min-w-0 rounded-lg bg-card sm:bg-transparent border border-border/40 sm:border-none">
                        <Coins className="size-4 text-[#1f4d3d] mb-1 sm:mb-1.5 shrink-0" />
                        <input
                          type="text"
                          value={result.pricing}
                          onChange={(e) => updateResultField("pricing", e.target.value)}
                          placeholder="$25k – $40k"
                          spellCheck={false}
                          title={result.pricing}
                          className="text-xs font-semibold text-[#1d2a27] bg-transparent text-center border border-transparent hover:border-[#ddd7ca] focus:border-[#1f4d3d]/50 rounded px-0.5 w-full outline-none transition truncate"
                        />
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mt-0.5">Investment</span>
                      </div>

                      {/* 4. Traffic */}
                      <div className="flex flex-col items-center p-2 sm:px-1.5 sm:py-1 min-w-0 rounded-lg bg-card sm:bg-transparent border border-border/40 sm:border-none">
                        <Megaphone className="size-4 text-[#1f4d3d] mb-1 sm:mb-1.5 shrink-0" />
                        <input
                          type="text"
                          value={getGlanceTrafficDisplay(result.traffic_strategy)}
                          onChange={(e) => updateResultField("traffic_strategy", e.target.value)}
                          placeholder="Organic"
                          spellCheck={false}
                          title={result.traffic_strategy}
                          className="text-xs font-semibold text-[#1d2a27] bg-transparent text-center border border-transparent hover:border-[#ddd7ca] focus:border-[#1f4d3d]/50 rounded px-0.5 w-full outline-none transition truncate"
                        />
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mt-0.5">Traffic</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 9: TARGET AUDIENCE & POSITIONING */}
              <div id="section-positioning" className="pt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Target Audience & Strategic Positioning */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Target className="size-4 text-[#1f4d3d]" />
                      <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1d2a27]">
                        TARGET AUDIENCE & POSITIONING
                      </h3>
                    </div>

                    {/* Target Audience Row */}
                    <div className="rounded-xl border border-[#e8dfcf] bg-[#faf8f4] p-3 space-y-1">
                      <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Ideal Buyer & Target Audience
                      </span>
                      <input
                        type="text"
                        value={result.audience}
                        onChange={(e) => updateResultField("audience", e.target.value)}
                        placeholder="e.g. VIP Buyers, Direct-to-Consumer Customers..."
                        spellCheck={false}
                        className="w-full text-xs font-semibold text-[#1d2a27] bg-transparent outline-none"
                      />
                    </div>

                    {/* Strategic Market Angle */}
                    <div className="rounded-xl border border-[#e8dfcf] bg-[#faf8f4] p-3 space-y-1">
                      <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Strategic Positioning & Competitive Edge
                      </span>
                      <textarea
                        value={result.core_angle}
                        onChange={(e) => updateResultField("core_angle", e.target.value)}
                        rows={3}
                        spellCheck={false}
                        placeholder="How this offer positions against alternatives in the market..."
                        className="w-full text-xs font-medium text-[#1d2a27] leading-relaxed bg-transparent outline-none resize-none transition"
                      />
                    </div>
                  </div>

                  {/* Right Column: Key Value Drivers */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check className="size-4 text-[#1f4d3d] stroke-[2.5]" />
                        <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1d2a27]">
                          KEY VALUE DRIVERS
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={addKeyMessage}
                        className="inline-flex items-center gap-1 text-[11px] text-[#1f4d3d] hover:underline font-medium"
                      >
                        <Plus className="size-3" /> Add bullet
                      </button>
                    </div>

                    <div className="space-y-2 pt-1">
                      {result.success_metrics.map((msg, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 group rounded-xl border border-[#e8dfcf]/60 bg-[#faf8f4]/60 px-3 py-2 hover:bg-[#faf8f4] hover:border-[#e8dfcf] transition"
                        >
                          <Check className="size-3.5 text-[#1f4d3d] stroke-[2.5] shrink-0" />
                          <input
                            type="text"
                            value={msg}
                            onChange={(e) => updateKeyMessage(i, e.target.value)}
                            placeholder="Key value driver..."
                            spellCheck={false}
                            className="text-xs text-[#1d2a27] bg-transparent outline-none flex-1 transition"
                          />
                          <button
                            type="button"
                            onClick={() => removeKeyMessage(i)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-[#b95f35] transition"
                            title="Delete message"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 10: THE OFFER & DELIVERY PLAN (Editable) */}
              <div id="section-delivery" className="pt-8">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-[#1f4d3d]" />
                  <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1d2a27]">
                    THE OFFER & DELIVERY PLAN
                  </h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  A structured {shortTimeline || "6 weeks"} program with proven steps to drive results. Click any card to edit.
                </p>

                {/* 4 Connected Strategy Cards with Connecting Arrows */}
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:flex xl:items-stretch gap-2.5">
                  {roadmapSteps.map((step, idx) => {
                    const StepIcon = step.icon;
                    return (
                      <div key={step.num} className="contents">
                        <div className="group relative flex flex-col justify-between flex-1 min-w-0 rounded-xl border border-[#e8dfcf] bg-[#faf8f4] p-3.5 hover:border-[#1f4d3d]/50 transition-all min-h-[170px]">
                          <div>
                            <div className="flex items-center justify-between">
                              <div className="grid size-7 place-items-center rounded-lg bg-[#edf3ee] text-[#1f4d3d]">
                                <StepIcon className="size-3.5" />
                              </div>
                              <span className="font-mono text-xs font-bold text-muted-foreground">{step.num}</span>
                            </div>
                            {/* Editable Step Title */}
                            <input
                              type="text"
                              value={step.title}
                              onChange={(e) => updateScopeStep(idx, e.target.value, step.desc)}
                              placeholder={`Phase 0${idx + 1}`}
                              spellCheck={false}
                              className="mt-3 text-xs font-semibold text-[#1d2a27] bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-[#ddd7ca] focus:border-[#1f4d3d]/50 rounded px-1.5 py-0.5 outline-none transition w-full"
                            />
                            {/* Editable Step Description - 4 rows so sentences never cut off */}
                            <textarea
                              value={step.desc}
                              onChange={(e) => updateScopeStep(idx, step.title, e.target.value)}
                              rows={4}
                              spellCheck={false}
                              placeholder="Step deliverables and outcomes..."
                              className="mt-1 text-[11px] leading-relaxed text-muted-foreground w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-[#ddd7ca] focus:border-[#1f4d3d]/50 rounded px-1.5 py-1 outline-none resize-none transition"
                            />
                          </div>
                        </div>
                        {idx < roadmapSteps.length - 1 && (
                          <div className="hidden xl:flex items-center justify-center shrink-0">
                            <ArrowRight className="size-4 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 11 & 12: INVESTMENT BREAKDOWN & WHY IT WORKS (Editable) */}
              <div className="pt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                  {/* SECTION 11: INVESTMENT BREAKDOWN */}
                  <div
                    id="section-pricing"
                    className="rounded-xl border border-[#e8dfcf] bg-[#faf8f4] p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Package className="size-4 text-[#1f4d3d]" />
                        <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1d2a27]">
                          INVESTMENT BREAKDOWN
                        </h3>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Total commercial investment:
                      </p>
                      {/* Editable Commercial Investment Value */}
                      <input
                        type="text"
                        value={result.pricing}
                        onChange={(e) => updateResultField("pricing", e.target.value)}
                        placeholder="$25k – $40k"
                        spellCheck={false}
                        className="mt-1 font-serif text-xl sm:text-2xl font-semibold text-[#1d2a27] bg-transparent hover:bg-[#faf8f4] focus:bg-[#faf8f4] border border-transparent hover:border-[#ddd7ca] focus:border-[#1f4d3d]/50 rounded-lg px-2 py-0.5 outline-none transition w-full"
                      />
                    </div>
                    {/* Editable Anchor Context */}
                    <div className="mt-3 border-t border-[#e8dfcf] pt-3">
                      <textarea
                        value={anchorText}
                        onChange={(e) => setAnchorText(e.target.value)}
                        rows={2}
                        spellCheck={false}
                        placeholder="Value anchor notes..."
                        className="text-[11px] text-muted-foreground leading-relaxed bg-transparent hover:bg-[#faf8f4] focus:bg-[#faf8f4] border border-transparent hover:border-[#ddd7ca] focus:border-[#1f4d3d]/50 rounded-lg p-1.5 outline-none resize-none transition w-full"
                      />
                    </div>
                  </div>

                  {/* SECTION 12: WHY IT WORKS (Editable) */}
                  <div
                    id="section-implementation"
                    className="rounded-xl border border-[#e8dfcf] bg-[#faf8f4] p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Star className="size-4 text-[#1f4d3d]" />
                        <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1d2a27]">
                          WHY IT WORKS
                        </h3>
                      </div>
                      {/* Editable Risk Reversal Explanation */}
                      <textarea
                        value={result.risk_reversal}
                        onChange={(e) => updateResultField("risk_reversal", e.target.value)}
                        rows={3}
                        spellCheck={false}
                        placeholder="Explanation of why this strategy converts and eliminates risk..."
                        className="mt-3 text-xs leading-relaxed text-[#263b34] bg-transparent hover:bg-[#faf8f4] focus:bg-[#faf8f4] border border-transparent hover:border-[#ddd7ca] focus:border-[#1f4d3d]/50 rounded-lg p-2 outline-none resize-none transition w-full"
                      />
                    </div>
                    <div className="mt-3 border-t border-[#e8dfcf] pt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                      <input
                        type="text"
                        value={targetVerifiedLabel}
                        onChange={(e) => {
                          setTargetVerifiedLabel(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        spellCheck={false}
                        className="bg-transparent hover:bg-[#faf8f4] focus:bg-[#faf8f4] border border-transparent hover:border-[#ddd7ca] focus:border-[#1f4d3d]/50 rounded px-1 py-0.5 outline-none transition text-muted-foreground text-xs"
                      />
                      <input
                        type="text"
                        value={alignedStatusLabel}
                        onChange={(e) => {
                          setAlignedStatusLabel(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        spellCheck={false}
                        className="bg-transparent hover:bg-[#faf8f4] focus:bg-[#faf8f4] border border-transparent hover:border-[#ddd7ca] focus:border-[#1f4d3d]/50 rounded px-1 py-0.5 outline-none transition text-[#1f4d3d] font-semibold text-right text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* HOW TO SELL AND GROW IT (editable) */}
              <div id="section-sell-grow" className="pt-8">
                <div className="flex items-center gap-2">
                  <Send className="size-4 text-[#1f4d3d]" />
                  <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1d2a27]">
                    HOW TO SELL IT AND GROW IT
                  </h3>
                </div>
                {result.how_to_sell?.length || result.how_to_grow?.length || result.first_week_actions?.length ? (
                  <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                    {(
                      [
                        ["how_to_sell", "How to sell it", "Winning your first customers, in order.", true],
                        ["how_to_grow", "How to grow it", "Scaling once you have early wins.", true],
                        ["first_week_actions", "Do this week", "Specific tasks for the next 7 days.", false],
                      ] as const
                    ).map(([field, title, hint, numbered]) => (
                      <div key={field} className="flex flex-col rounded-xl border border-[#e8dfcf] bg-[#faf8f4] p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-[#1d2a27]">{title}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => addPlanItem(field)}
                            className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-[#1f4d3d] hover:underline"
                          >
                            <Plus className="size-3" /> Add
                          </button>
                        </div>
                        <ol className="mt-3 space-y-2">
                          {(result[field] ?? []).map((item, i) => {
                            const colon = item.indexOf(":");
                            const label = numbered && colon > 0 && colon < 48 ? item.slice(0, colon) : "";
                            return (
                              <li key={i} className="group flex items-start gap-2 rounded-lg border border-[#e8dfcf]/60 bg-white/60 p-2.5">
                                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#1f4d3d] text-[10px] font-bold text-white">
                                  {numbered ? i + 1 : <Check className="size-3 stroke-[3]" />}
                                </span>
                                <div className="min-w-0 flex-1">
                                  {label ? <p className="text-[11px] font-semibold uppercase tracking-wide text-[#1f4d3d]">{label}</p> : null}
                                  <textarea
                                    value={label ? item.slice(colon + 1).trimStart() : item}
                                    onChange={(e) => updatePlanItem(field, i, label ? `${label}: ${e.target.value}` : e.target.value)}
                                    rows={3}
                                    spellCheck={false}
                                    className="w-full resize-none bg-transparent text-xs leading-relaxed text-[#263b34] outline-none"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removePlanItem(field, i)}
                                  className="p-1 text-muted-foreground opacity-0 transition hover:text-[#b95f35] group-hover:opacity-100"
                                  title="Remove"
                                >
                                  <Trash2 className="size-3" />
                                </button>
                              </li>
                            );
                          })}
                        </ol>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-dashed border-[#ddd7ca] bg-[#faf8f4] p-5 text-xs text-muted-foreground">
                    This offer was made before the selling and growth plan existed. Build the offer again to add how to sell it, how to grow it and what to do this week.
                  </div>
                )}
              </div>

              {/* Bottom Next Step Action Bar */}
              <div className="pt-6 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  Ready to translate this offer into presentation slides?
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSaveWorkspace()}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-medium transition ${
                      hasUnsavedChanges
                        ? "bg-[#1f4d3d] text-white border-[#1f4d3d] shadow-xs"
                        : "border-[#ddd7ca] bg-[#fffefb] text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <Save className="size-3.5" /> {hasUnsavedChanges ? "Save changes" : "Saved"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#ddd7ca] bg-[#fffefb] px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary/50 transition"
                  >
                    <Download className="size-3.5" /> Save PDF
                  </button>
                  <Link
                    href="/provider/webinar-content"
                    className="inline-flex items-center gap-2 rounded-full bg-[#1f4d3d] px-5 py-2 text-xs font-semibold text-white hover:bg-[#173c31] transition shadow-xs"
                  >
                    Create webinar deck <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
