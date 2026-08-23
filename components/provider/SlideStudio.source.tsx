"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Lightbulb, ListTree, Presentation } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Toolbar } from "@/components/deck/Toolbar";
import { LeftPanel, type CustomColors } from "@/components/deck/LeftPanel";
import { LayoutBar } from "@/components/deck/LayoutBar";
import { SlideStrip } from "@/components/deck/SlideStrip";
import { SlideView } from "@/components/deck/SlideView";
import { ChatPanel, type ChatMessage } from "@/components/deck/ChatPanel";
import { GenerationStage } from "@/components/deck/GenerationStage";
import {
  FONT_SETS,
  GENERATION_STEPS,
  PALETTES,
  PURPOSES,
  RATIOS,
  STYLES,
  STYLE_FONT,
  STYLE_LAYOUT,
  STYLE_SPECS,
  generateDeck,
  type FontSetId,
  type LayoutVariant,
  type Motion,
  type Palette,
  type Purpose,
  type RatioId,
  type Slide,
  type StyleId,
} from "@/lib/deck";
import { askAssistant, type AssistantActions } from "@/lib/assistant";
import { extractPalette, removeBackground } from "@/lib/image";
import { exportPptx } from "@/lib/pptx";
import { supabase } from "@/lib/supabase/client";
import { loadWorkspaceMemory, memoryContext, saveWorkspaceMemory } from "@/lib/workspace-memory";


const DEFAULT_CUSTOM: CustomColors = {
  primary: "#A84E2B",
  secondary: "#E7B49A",
  accent: "#5D2C1C",
  background: "#FBF6F0",
};

const CONTENT_PROJECT_KEY = "astrocraft:content-project-id";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const contentProjectKey = (userId: string) => `${CONTENT_PROJECT_KEY}:${userId}`;

type WorkspaceAsset = {
  file_name: string;
  storage_path: string;
  mime_type: string;
  asset_role?: "logo" | "brand_photo" | "product" | "background" | "document" | "reference" | null;
};

export default function Builder() {
  const params = useParams<{ projectId?: string }>();
  const router = useRouter();
  const routeProjectId = typeof params.projectId === "string" ? params.projectId : "";
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState<Purpose>("Company Profile");
  const [slideCount, setSlideCount] = useState("8");
  const [image, setImage] = useState<string | null>(null);
  const [removeBg, setRemoveBg] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const [imageProcessing, setImageProcessing] = useState<"palette" | "background" | null>(null);
  const [paletteId, setPaletteId] = useState("clay");
  const [custom, setCustom] = useState<CustomColors>(DEFAULT_CUSTOM);
  const [motion, setMotion] = useState<Motion>("Professional");
  const [ratio, setRatio] = useState<RatioId>("16:9");
  const [styleId, setStyleId] = useState<StyleId>("modern");
  const [fontSetId, setFontSetId] = useState<FontSetId>("grotesk");
  const [brandNote, setBrandNote] = useState<string | null>(null);
  const [assetContext, setAssetContext] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [blueprintSessionId, setBlueprintSessionId] = useState<string | null>(null);

  const [slides, setSlides] = useState<Slide[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [step, setStep] = useState(-1);
  const [status, setStatus] = useState<string | null>(null);
  const slideImageRef = useRef<HTMLInputElement>(null);
  const pendingAutoBuildRef = useRef("");
  const hasContent = slides.length > 0;
  const generating = step >= 0;

  useEffect(() => {
    if (!selectedId && slides[0]) setSelectedId(slides[0].id);
  }, [slides, selectedId]);

  useEffect(() => {
    const selectedAsset = sessionStorage.getItem("astrocraft:selected-asset");
    if (selectedAsset) setImage(selectedAsset);
    void loadLatestBuyerContext();

    async function loadLatestBuyerContext() {
      const requestedProjectId = routeProjectId && UUID_PATTERN.test(routeProjectId)
        ? routeProjectId
        : "";
      if (routeProjectId && !requestedProjectId) {
        router.replace("/provider/slides");
        return;
      }

      let blueprint: Record<string, unknown> | null = null;
      const handoff = sessionStorage.getItem("astrocraft:latest-blueprint");
      if (handoff) {
        try {
          blueprint = JSON.parse(handoff) as Record<string, unknown>;
        } catch {
          sessionStorage.removeItem("astrocraft:latest-blueprint");
        }
      }
      const avatarIdea = sessionStorage.getItem("astrocraft:avatar-idea");
      const shouldAutoBuild = sessionStorage.getItem("astrocraft:auto-build-content") === "true";
      if (avatarIdea) sessionStorage.removeItem("astrocraft:avatar-idea");
      if (shouldAutoBuild) sessionStorage.removeItem("astrocraft:auto-build-content");

      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;
      const memory = await loadWorkspaceMemory(authData.user.id);
      const { data: assetRows } = await supabase
        .from("workspace_assets")
        .select("file_name,storage_path,mime_type,asset_role")
        .eq("owner_id", authData.user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      const savedAssets = (assetRows ?? []) as WorkspaceAsset[];
      const signedAssets = await Promise.all(savedAssets.map(async (asset) => {
        const { data: signed } = await supabase.storage
          .from("workspace-assets")
          .createSignedUrl(asset.storage_path, 3600);
        return { ...asset, signedUrl: signed?.signedUrl };
      }));
      const latestLogo = signedAssets.find((asset) => asset.asset_role === "logo" && asset.mime_type.startsWith("image/"));
      const latestVisual = signedAssets.find((asset) =>
        ["brand_photo", "product", "background"].includes(asset.asset_role ?? "") &&
        asset.mime_type.startsWith("image/")
      );
      if (!selectedAsset && latestVisual?.signedUrl) setImage(latestVisual.signedUrl);
      if (latestLogo?.signedUrl) setLogo(latestLogo.signedUrl);
      const { data: buyerSession } = await supabase
        .from("blueprint_sessions")
        .select("session_id,blueprint")
        .eq("owner_id", authData.user.id)
        .eq("status", "completed")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      blueprint ??= (buyerSession?.blueprint as Record<string, unknown> | undefined)
        ?? memory?.audience_profile
        ?? null;
      const savedSessionId = buyerSession?.session_id as string | undefined;
      setBlueprintSessionId(savedSessionId ?? memory?.source_session_id ?? null);

      let savedContent: {
        project_id?: string;
        slides?: unknown;
        messages?: unknown;
        theme?: unknown;
        brief?: unknown;
      } | null = null;
      if (requestedProjectId) {
        const { data } = await supabase
          .from("content_sessions")
          .select("project_id,slides,messages,theme,brief")
          .eq("owner_id", authData.user.id)
          .eq("project_id", requestedProjectId)
          .maybeSingle();
        savedContent = data;
      }
      if (requestedProjectId && !savedContent) {
        const { data: fallbackContent } = await supabase
          .from("content_sessions")
          .select("project_id,slides,messages,theme,brief")
          .eq("owner_id", authData.user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        savedContent = fallbackContent;
      }
      const savedProjectId = savedContent?.project_id as string | undefined;
      if (savedProjectId) {
        setProjectId(savedProjectId);
        sessionStorage.setItem(contentProjectKey(authData.user.id), savedProjectId);
        if (requestedProjectId && savedProjectId !== routeProjectId && Array.isArray(savedContent?.slides)) {
          router.replace(`/provider/slides/${savedProjectId}`);
        }
      }

      const profile = blueprint ?? {};
      const list = (value: unknown) =>
        Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
      const persona = typeof profile.persona_name === "string" ? profile.persona_name : "your audience";
      const offer = profile.offer && typeof profile.offer === "object"
        ? profile.offer as Record<string, unknown>
        : memory?.offer_profile && Object.keys(memory.offer_profile).length
          ? memory.offer_profile
          : null;
      const brandBrief = sessionStorage.getItem("astrocraft:brand-brief");
      if (brandBrief) sessionStorage.removeItem("astrocraft:brand-brief");
      const brand = memory?.brand_profile ?? {};
      const brandLines = [
        typeof brand.business_line === "string" ? `Business line: ${brand.business_line}` : "",
        typeof brand.quote_bank === "string" ? `Quote bank: ${brand.quote_bank}` : "",
        typeof brand.usage_notes === "string" ? `Brand asset rules: ${brand.usage_notes}` : "",
        signedAssets.length
          ? `Available brand assets: ${signedAssets.map((asset) => `${asset.asset_role ?? "reference"} - ${asset.file_name}`).join("; ")}`
          : "",
        brandBrief ? `Latest upload handoff: ${brandBrief}` : "",
      ].filter(Boolean).join("\n");
      setAssetContext(brandLines);
      const context = [
        memoryContext(memory),
        brandLines,
        avatarIdea ? `Linked Avatar IQ idea:\n${avatarIdea}` : "",
        `Presentation for ${persona}.`,
        typeof profile.demographics === "string" ? `Audience: ${profile.demographics}` : "",
        typeof profile.core_fear === "string" ? `Core problem: ${profile.core_fear}` : "",
        typeof profile.buying_trigger === "string" ? `Buying trigger: ${profile.buying_trigger}` : "",
        list(profile.objections).length ? `Objections: ${list(profile.objections).join("; ")}` : "",
        list(profile.headlines).length ? `Messaging directions: ${list(profile.headlines).join("; ")}` : "",
        typeof offer?.title === "string" ? `Offer: ${offer.title}` : "",
        typeof offer?.promise === "string" ? `Promise: ${offer.promise}` : "",
        typeof offer?.pricing === "string" ? `Investment: ${offer.pricing}` : "",
        list(offer?.scope).length ? `Scope: ${list(offer?.scope).join("; ")}` : "",
      ].filter(Boolean).join("\n");

      setDescription((current) => current.trim() ? current : context);
      if (avatarIdea && shouldAutoBuild) {
        pendingAutoBuildRef.current = context;
      }
      setBrandNote(`${offer ? "Buyer and offer" : "Buyer"} context loaded for ${persona}. Presentation points and messaging will use this saved project.`);
      const rememberedSlides = Array.isArray(savedContent?.slides)
        ? savedContent.slides as Slide[]
        : [];
      if (rememberedSlides.length) {
        const rememberedTheme = savedContent?.theme as Record<string, unknown> | undefined;
        const rememberedBrief = savedContent?.brief as Record<string, unknown> | undefined;
        const rememberedStyle = STYLES.find((item) => item.id === rememberedTheme?.style)?.id;
        const rememberedFont = FONT_SETS.find((item) => item.id === rememberedTheme?.font_set)?.id;
        const rememberedRatio = RATIOS.find((item) => item.id === rememberedTheme?.ratio)?.id;
        const rememberedMotion = ["None", "Professional", "Dynamic"].find((item) => item === rememberedTheme?.motion) as Motion | undefined;
        const rememberedPurpose = PURPOSES.find((item) => item === rememberedBrief?.purpose);
        if (rememberedStyle) setStyleId(rememberedStyle);
        if (rememberedFont) setFontSetId(rememberedFont);
        if (rememberedRatio) setRatio(rememberedRatio);
        if (rememberedMotion) setMotion(rememberedMotion);
        if (rememberedPurpose) setPurpose(rememberedPurpose);
        if (typeof rememberedTheme?.palette === "string") setPaletteId(rememberedTheme.palette);
        if (Array.isArray(savedContent?.messages)) setMessages(savedContent.messages as ChatMessage[]);
        setSlideCount(String(rememberedSlides.length));
        setSlides(rememberedSlides);
        setSelectedId(rememberedSlides[0]?.id ?? null);
      } else if (slides.length === 0 && sessionStorage.getItem("astrocraft:creation-intent") === "ideas") {
        setPurpose("Sales");
        setSlideCount("10");
        setDescription((current) => current || `Generate ten strong presentation and content ideas for ${persona}. Each idea should include a hook, audience promise, example visual, and recommended icon.`);
      }
    }
  }, [routeProjectId, router]);

  useEffect(() => {
    if (!pendingAutoBuildRef.current || generating || projectId || slides.length) return;
    const brief = pendingAutoBuildRef.current;
    pendingAutoBuildRef.current = "";
    window.setTimeout(() => void handleGenerate(brief), 0);
  }, [description, generating, projectId, slides.length]);

  useEffect(() => {
    if (!projectId) return;
    const timeout = window.setTimeout(() => {
      void supabase.auth.getUser().then(({ data: authData }) => {
        if (!authData.user) return;
        return supabase.from("content_sessions").upsert({
          project_id: projectId,
          owner_id: authData.user.id,
          blueprint_session_id: blueprintSessionId,
          status: slides.length ? "completed" : "draft",
          title: slides[0]?.title || "Untitled presentation",
          brief: { description, purpose, slide_count: slideCount },
          slides,
          messages,
          theme: { style: styleId, font_set: fontSetId, palette: paletteId, ratio, motion },
          last_error: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "owner_id,project_id" });
      });
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [blueprintSessionId, description, fontSetId, messages, motion, paletteId, projectId, purpose, ratio, slideCount, slides, styleId]);

  /** Uploads stay untouched until the user explicitly applies an image action. */
  const ingestBrandArt = async (dataUrl: string | null, kind: "logo" | "image") => {
    if (!dataUrl) {
      if (kind === "logo") setLogo(null);
      else setImage(null);
      return;
    }
    if (kind === "logo") setLogo(dataUrl);
    else {
      setImage(dataUrl);
      setRemoveBg(false);
    }
    setBrandNote(null);
  };

  const generatePaletteFromUpload = async () => {
    const source = logo ?? image;
    if (!source) return;
    setImageProcessing("palette");
    const pal = await extractPalette(source);
    if (pal) {
      setCustom(pal);
      setPaletteId("custom");
      setBrandNote("Palette generated from your upload. You can fine-tune each colour below.");
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) await saveWorkspaceMemory(authData.user.id, { brand_profile: { palette: pal } });
    }
    setImageProcessing(null);
  };

  const removeUploadedBackground = async () => {
    if (!image) return;
    setImageProcessing("background");
    const cleaned = await removeBackground(image, 46);
    setImage(cleaned);
    setRemoveBg(true);
    setBrandNote("Photo background removed. Click the photo whenever you want to replace it.");
    setImageProcessing(null);
  };

  const palette: Palette = useMemo(() => {
    if (paletteId === "custom") {
      return {
        id: "custom",
        name: "Custom",
        primary: custom.primary,
        secondary: custom.secondary,
        accent: custom.accent,
        background: custom.background,
        ink: "#181816",
        muted: "#706E68",
      };
    }
    return PALETTES.find((p) => p.id === paletteId) ?? PALETTES[0]!;
  }, [paletteId, custom]);

  const fontSet = FONT_SETS.find((f) => f.id === fontSetId) ?? FONT_SETS[0]!;
  const baseSpec = STYLE_SPECS[styleId];
  const spec = useMemo(
    () => ({
      ...baseSpec,
      headingFont: fontSet.headingFont,
      bodyFont: fontSet.bodyFont,
      headingWeight: fontSet.headingWeight,
      tracking: fontSet.tracking,
    }),
    [baseSpec, fontSet],
  );
  const ratioValue = RATIOS.find((r) => r.id === ratio)!.value;
  const selected = slides.find((s) => s.id === selectedId) ?? slides[0] ?? null;

  const patch = (id: string, next: Partial<Slide>) =>
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...next } : s)));

  const applyStyle = (s: StyleId) => {
    setStyleId(s);
    setFontSetId(STYLE_FONT[s]);
    const layout = STYLE_LAYOUT[s];
    setSlides((prev) => prev.map((sl) => ({ ...sl, layout }))); 
  };

  const handleGenerate = async (briefOverride?: unknown) => {
    if (generating) return;
    const activeDescription = typeof briefOverride === "string" && briefOverride.trim()
      ? briefOverride.trim()
      : description.trim();
    if (!activeDescription) {
      setStatus("Describe what you want to create first.");
      return;
    }
    const [{ data: authData }, activeProjectId] = await Promise.all([
      supabase.auth.getUser(),
      Promise.resolve(projectId || crypto.randomUUID()),
    ]);
    if (!authData.user) {
      setStatus("Your sign-in session expired. Please sign in again.");
      return;
    }
    const requestedCount = Math.min(90, Math.max(1, Number.parseInt(slideCount, 10) || 8));
    setSlideCount(String(requestedCount));
    setStatus(null);
    setStep(0);
    const progress = window.setInterval(() => {
      setStep((current) => Math.min(current + 1, GENERATION_STEPS.length - 1));
    }, 1100);
    try {
      let remote: AssistantActions | null = await askAssistant({
          mode: "generate",
          projectId: activeProjectId,
          blueprintSessionId,
          message: `Generate exactly ${requestedCount} slides. Include a deliberate opening, a logical middle sequence, and a clear closing or thank-you slide. Keep each slide concise. Brief: ${activeDescription}`,
          description: activeDescription,
          purpose,
          slideCount: String(requestedCount),
          style: styleId,
          fontSet: fontSetId,
          palette: paletteId,
          ratio,
          slides,
          selectedSlideId: selectedId,
          messages,
          assetContext,
        }).catch((error): AssistantActions => ({
          reply: error instanceof Error ? error.message : "Content Maker workflow failed.",
          slides: buildLocalDeck(activeDescription, requestedCount, purpose, Boolean(image || logo)),
        }));
      if (!remote?.slides?.length) {
        remote = {
          reply: "Content Maker workflow returned no slides, so I built an editable deck locally.",
          slides: buildLocalDeck(activeDescription, requestedCount, purpose, Boolean(image || logo)),
        };
      }
      const generatedSlides = remote.slides ?? buildLocalDeck(activeDescription, requestedCount, purpose, Boolean(image || logo));
      if (remote.style) applyStyle(remote.style);
      if (remote.fontSet) setFontSetId(remote.fontSet);
      if (remote.palette) setPaletteId(remote.palette);
      if (remote.purpose) setPurpose(remote.purpose);
      if (remote.ratio) setRatio(remote.ratio);
      const nextMessages = remote.reply
        ? [...messages, { id: `generation-${Date.now()}`, role: "assistant" as const, text: remote.reply }]
        : messages;
      const [memorySave, sessionSave] = await Promise.all([
        saveWorkspaceMemory(authData.user.id, {
          creation_preferences: {
            purpose: remote.purpose ?? purpose,
            slide_count: generatedSlides.length,
            style: remote.style ?? styleId,
            font_set: remote.fontSet ?? fontSetId,
            palette: remote.palette ?? paletteId,
            ratio: remote.ratio ?? ratio,
            motion,
          },
        }),
        supabase.from("content_sessions").upsert({
          project_id: activeProjectId,
          owner_id: authData.user.id,
          blueprint_session_id: blueprintSessionId,
          status: "completed",
          title: generatedSlides[0]?.title || "Untitled presentation",
          brief: { description: activeDescription, purpose: remote.purpose ?? purpose, slide_count: generatedSlides.length },
          slides: generatedSlides,
          messages: nextMessages,
          theme: {
            style: remote.style ?? styleId,
            font_set: remote.fontSet ?? fontSetId,
            palette: remote.palette ?? paletteId,
            ratio: remote.ratio ?? ratio,
            motion,
          },
          last_error: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "owner_id,project_id" }),
      ]);
      const saveError = memorySave.error ?? sessionSave.error;
      if (!sessionSave.error) {
        setProjectId(activeProjectId);
        sessionStorage.setItem(contentProjectKey(authData.user.id), activeProjectId);
      }
      setSlideCount(String(generatedSlides.length));
      setSlides(generatedSlides);
      setSelectedId(generatedSlides[0]?.id ?? null);
      if (remote.reply) setMessages(nextMessages);
      if (!sessionSave.error && activeProjectId !== routeProjectId) {
        window.history.replaceState(null, "", `/provider/slides/${activeProjectId}`);
      }
      setStatus(saveError
        ? `${generatedSlides.length} slides generated, but save failed: ${saveError.message}`
        : `${generatedSlides.length} slides generated and saved`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Content Maker could not generate the deck");
    } finally {
      window.clearInterval(progress);
      setStep(-1);
    }
  };

  const handleChat = async (text: string) => {
    const id = `m${Date.now().toString(36)}`;
    const userMessage: ChatMessage = { id, role: "user", text };
    setMessages((prev) => [...prev, userMessage]);
    if (!hasContent) {
      const wantsBuild = /\b(build|generate|create|make|deck|ppt|presentation|slides?)\b/i.test(text);
      const reply = brainstormReply(text, Boolean(assetContext));
      setDescription((current) => [
        current.trim(),
        `Brainstormed idea: ${text}`,
        assetContext ? `Saved brand and asset context:\n${assetContext}` : "",
      ].filter(Boolean).join("\n\n"));
      window.setTimeout(() => {
        setMessages((prev) => [...prev, {
          id: `${id}r`,
          role: "assistant",
          text: wantsBuild ? `${reply}\n\nI am building this into a deck now.` : reply,
        }]);
        if (wantsBuild) {
          const nextBrief = [
            description.trim(),
            `User request:\n${text}`,
            assetContext ? `Saved brand and asset context:\n${assetContext}` : "",
          ].filter(Boolean).join("\n\n");
          void handleGenerate(nextBrief || text);
        }
      }, 180);
      return;
    }
    setChatBusy(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Your sign-in session expired. Please sign in again.");
      const activeProjectId = projectId || crypto.randomUUID();
      if (!projectId) {
        setProjectId(activeProjectId);
        sessionStorage.setItem(contentProjectKey(authData.user.id), activeProjectId);
      }
      const remote = await askAssistant({
        mode: "assistant",
        projectId: activeProjectId,
        blueprintSessionId,
        message: text,
        description,
        purpose,
        slideCount,
        style: styleId,
        fontSet: fontSetId,
        palette: paletteId,
        ratio,
        slides,
        selectedSlideId: selectedId,
        messages: [...messages, userMessage],
        assetContext,
      });
      if (!remote) throw new Error("Content Maker returned an empty response.");
      if (remote.style) applyStyle(remote.style);
      if (remote.fontSet) setFontSetId(remote.fontSet);
      if (remote.palette) setPaletteId(remote.palette);
      if (remote.purpose) setPurpose(remote.purpose);
      if (remote.ratio) setRatio(remote.ratio);
      if (remote.motion) setMotion(remote.motion);
      if (remote.slideCount) setSlideCount(String(remote.slideCount));
      if (Array.isArray(remote.slides) && remote.slides.length > 0) {
        setSlides(remote.slides);
        setSlideCount(String(remote.slides.length));
        setSelectedId((current) => remote.slides!.some((slide) => slide.id === current) ? current : remote.slides![0]?.id ?? null);
      }
      if (activeProjectId !== routeProjectId) {
        window.history.replaceState(null, "", `/provider/slides/${activeProjectId}`);
      }
      setMessages((prev) => [...prev, { id: `${id}r`, role: "assistant", text: remote.reply ?? "Your deck has been updated." }]);
    } catch (error) {
      const fallback = error instanceof Error ? error.message : "Content Maker could not process that request.";
      setMessages((prev) => [...prev, {
        id: `${id}e`,
        role: "assistant",
        text: `${fallback}\n\nThe deck is still editable. Try a direct command like "regenerate this selected slide shorter" or click Generate again to rebuild the full deck.`,
      }]);
    } finally {
      setChatBusy(false);
    }
  };

  const regenerateSelectedSlide = () => {
    if (!selected) return;
    void handleChat(`Regenerate only the selected slide "${selected.title}". Keep its position in the deck, improve the copy and visual concept, use no more than four concise bullets, and return the complete deck with only that slide changed.`);
  };

  const useIdeaAsBrief = (text: string, build = false) => {
    const nextBrief = [
      description.trim(),
      `Selected idea from brainstorm:\n${text}`,
      assetContext ? `Use saved brand assets and lines:\n${assetContext}` : "",
    ].filter(Boolean).join("\n\n");
    setDescription(nextBrief);
    if (build) {
      window.setTimeout(() => void handleGenerate(nextBrief), 0);
    }
  };



  const handleExport = async () => {
    setStatus("Building .pptx…");
    try {
      await exportPptx({
        slides,
        palette,
        spec,
        ratio,
        image,
        logo,
        fileName: `${(description.split(/[.\n]/)[0] || "presentation").slice(0, 40).trim()}.pptx`,
      });
      setStatus(`Downloaded .pptx — ${slides.length} slides`);
    } catch {
      setStatus("Could not build the .pptx file");
    }
  };

  const addSlide = () => {
    const base = generateDeck({ purpose, count: 10, company: description, hasImage: Boolean(image) });
    const pick = { ...base[slides.length % base.length]!, id: `s${Date.now().toString(36)}` };
    setSlides((prev) => [...prev, pick]);
    setSelectedId(pick.id);
  };

  const duplicate = (id: string) => {
    const i = slides.findIndex((s) => s.id === id);
    if (i < 0) return;
    const copy = { ...slides[i]!, id: `s${Date.now().toString(36)}` };
    setSlides((prev) => [...prev.slice(0, i + 1), copy, ...prev.slice(i + 1)]);
    setSelectedId(copy.id);
  };

  const remove = (id: string) => {
    setSlides((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (id === selectedId) setSelectedId(next[0]?.id ?? null);
      return next;
    });
  };

  return (
    <div className="deck-builder flex h-[calc(100dvh-4rem-1px)] min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <input
        ref={slideImageRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file || !selected) return;
          const reader = new FileReader();
          reader.onload = () => patch(selected.id, { image: String(reader.result), useImage: true });
          reader.readAsDataURL(file);
          event.target.value = "";
        }}
      />
      <h1 className="sr-only">PowerPoint presentation builder</h1>
      <Toolbar
        ratio={ratio}
        onRatio={setRatio}
        style={styleId}
        onStyle={(s) => applyStyle(s)}
        motion={motion}
        onMotion={setMotion}
        generating={generating}
        hasContent={hasContent}
        onGenerate={handleGenerate}
        onExport={() => void handleExport()}
      />

      <div className="flex min-h-0 flex-1">
        {hasContent ? <LeftPanel
          image={image}
          onImage={(v: string | null) => void ingestBrandArt(v, "image")}
          logo={logo}
          onLogo={(v: string | null) => void ingestBrandArt(v, "logo")}
          onExtractPalette={() => void generatePaletteFromUpload()}
          onRemoveBackground={() => void removeUploadedBackground()}
          processing={imageProcessing}
          brandNote={brandNote}
          paletteId={paletteId}
          onPaletteId={setPaletteId}
          custom={custom}
          onCustom={setCustom}
        /> : null}

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 items-center justify-center px-5 py-6 sm:px-8">
            {generating ? (
              <GenerationStage
                step={step}
                slideCount={Math.min(90, Math.max(1, Number.parseInt(slideCount, 10) || 8))}
              />
            ) : selected ? <div
              className="max-h-full w-full overflow-hidden rounded-[12px] border border-border bg-card transition-[max-width] duration-200"
              style={{
                aspectRatio: String(ratioValue),
                maxWidth: `min(100%, calc((100vh - 340px) * ${ratioValue}))`,
              }}
            >
              <SlideView
                  key={`${selected.id}-${selected.layout}-${styleId}-${paletteId}`}
                  slide={selected}
                  palette={palette}
                  spec={spec}
                  image={selected.useImage ? selected.image ?? image : null}
                  removeBg={removeBg}
                  logo={logo}
                  motion={motion}
                  onEdit={(patchData) => patch(selected.id, patchData)}
                  onRequestImage={() => slideImageRef.current?.click()}
                />
            </div> : (
              <section className="w-full max-w-3xl rounded-[28px] border border-border bg-card p-6 shadow-[0_24px_80px_rgba(20,52,40,0.08)] sm:p-9">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <ListTree className="h-4 w-4" />
                  One intelligent creation brief
                </div>
                <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
                  What do you want to make?
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Your saved business, buyer, offer, and brand context are already attached. Describe only what is different for this presentation.
                </p>

                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={5}
                  placeholder="Example: Build a 20-slide webinar that opens with the expertise ceiling problem, teaches our five-step method, includes proof placeholders, then closes with a fit-call offer and thank-you slide."
                  className="mt-6 w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-6 outline-none transition focus:border-foreground/35"
                />

                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_150px]">
                  <label className="rounded-xl border border-border bg-background px-3 py-2">
                    <span className="block text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Format</span>
                    <select value={purpose} onChange={(event) => setPurpose(event.target.value as Purpose)} className="mt-1 w-full bg-transparent text-sm outline-none">
                      {PURPOSES.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </label>
                  <label className="rounded-xl border border-border bg-background px-3 py-2">
                    <span className="block text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Pages, 1-90</span>
                    <input type="number" min={1} max={90} value={slideCount} onChange={(event) => setSlideCount(event.target.value)} className="mt-1 w-full bg-transparent text-sm outline-none" />
                  </label>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <button type="button" onClick={() => setDescription("Generate ten strong pitch and presentation ideas. For every idea include the hook, promise, example visual direction, and recommended icon.")} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-left text-xs hover:border-foreground/30">
                    <Lightbulb className="h-4 w-4" /> Idea generator
                  </button>
                  <button type="button" onClick={() => { setPurpose("Sales"); setSlideCount("12"); setDescription("Create a professional sales presentation with a strong opening, problem, insight, method, proof placeholders, offer, next steps, and thank-you slide."); }} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-left text-xs hover:border-foreground/30">
                    <Presentation className="h-4 w-4" /> Sales presentation
                  </button>
                  <button type="button" onClick={() => { setPurpose("Pitch"); setSlideCount("28"); setDescription("Create a 60-90 minute webinar deck with an opening promise, agenda, audience fit, problem, belief shifts, step-by-step method, proof placeholders, implementation plan, offer, Q&A, final CTA, and thank-you slide."); }} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-left text-xs hover:border-foreground/30">
                    <ListTree className="h-4 w-4" /> Webinar structure
                  </button>
                </div>

                <button type="button" onClick={() => void handleGenerate()} disabled={generating || !description.trim()} className="mt-5 w-full rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background disabled:opacity-40">
                  {generating ? "Building your presentation..." : `Generate ${Math.min(90, Math.max(1, Number.parseInt(slideCount, 10) || 8))} pages`}
                </button>
                {status ? <p className="mt-3 text-xs leading-5 text-muted-foreground">{status}</p> : null}
              </section>
            )}
          </div>

          <div className="flex h-8 shrink-0 items-center gap-3 px-8 text-[12px] text-muted-foreground">
            {generating ? (
              <span className="generation-working text-foreground">{GENERATION_STEPS[step]}</span>
            ) : (
              <span>{status ?? `${slides.length} slides · ${ratio} · ${styleId} theme · click text to edit`}</span>
            )}
          </div>

          {selected ? (
            <LayoutBar
              slide={selected}
              onLayout={(l: LayoutVariant) => patch(selected.id, { layout: l })}
              onAllLayout={(l: LayoutVariant) =>
                setSlides((prev) => prev.map((s) => ({ ...s, layout: l })))
              }
              onRegenerate={regenerateSelectedSlide}
              regenerating={chatBusy}
            />
          ) : null}

          {hasContent ? <SlideStrip
            slides={slides}
            selectedId={selected?.id ?? null}
            onSelect={setSelectedId}
            onAdd={addSlide}
            onDuplicate={duplicate}
            onDelete={remove}
          /> : null}
        </main>

        <ChatPanel
          messages={messages}
          busy={chatBusy}
          hasContent={hasContent}
          onSend={handleChat}
          onUseIdea={useIdeaAsBrief}
        />
      </div>
    </div>
  );
}

function brainstormReply(input: string, hasAssetContext: boolean) {
  const idea = input.trim();
  return [
    "I added this to the working brief as a brainstormed direction.",
    "",
    `Angle: ${idea}`,
    "Content direction: turn this into a focused deck with a clear opening problem, one main promise, proof or example slides, and a direct next step.",
    "Suggested structure: Hook, audience fit, problem, insight, method, example, offer or recommendation, closing.",
    hasAssetContext
      ? "Brand context: saved logo, visual assets, business lines, quotes, and usage notes will be attached when you build from this."
      : "Brand context: add logos, quotes, and source files in Brand Assets if you want them attached automatically.",
    "",
    "Use Add to brief if you want to keep shaping it, or Build from this when you want Content Maker to create the PPT/PDF-ready deck.",
  ].join("\n");
}

function buildLocalDeck(brief: string, count: number, purpose: Purpose, hasImage: boolean): Slide[] {
  const base = generateDeck({ purpose, count: Math.min(count, 10), company: brief, hasImage });
  if (count <= base.length) return base.slice(0, count);

  const extraTypes: Slide["type"][] = ["bullets", "process", "visual", "metrics", "timeline", "services", "chart"];
  const extras = Array.from({ length: count - base.length }, (_, index): Slide => {
    const chapter = index + 1;
    return {
      ...base[(index + 1) % base.length]!,
      id: `s${Date.now().toString(36)}x${index.toString(36)}`,
      name: `Detail ${chapter}`,
      type: extraTypes[index % extraTypes.length]!,
      eyebrow: `Section ${chapter}`,
      title: `Build point ${chapter}: ${brief.split(/[.\n]/)[0]?.slice(0, 42) || "Core message"}`,
      body: "Use this slide to expand the argument with one clear point, practical proof, and a specific transition into the next idea.",
      bullets: [
        "State the point in plain language.",
        "Show an example, proof marker, or visual cue.",
        "Connect it back to the audience outcome.",
      ],
      useImage: hasImage && index % 3 === 0,
    };
  });

  const closing = base[base.length - 1];
  const middle = base.slice(0, -1);
  return closing ? [...middle, ...extras, closing].slice(0, count) : [...base, ...extras].slice(0, count);
}
