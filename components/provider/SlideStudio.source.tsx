"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Lightbulb, ListTree, Presentation } from "lucide-react";
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
import { askAssistant } from "@/lib/assistant";
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

export default function Builder() {
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [blueprintSessionId, setBlueprintSessionId] = useState<string | null>(null);

  const [slides, setSlides] = useState<Slide[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [step, setStep] = useState(-1);
  const [status, setStatus] = useState<string | null>(null);
  const slideImageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedId && slides[0]) setSelectedId(slides[0].id);
  }, [slides, selectedId]);

  useEffect(() => {
    const selectedAsset = sessionStorage.getItem("astrocraft:selected-asset");
    if (selectedAsset) setImage(selectedAsset);
    void loadLatestBuyerContext();

    async function loadLatestBuyerContext() {
      let blueprint: Record<string, unknown> | null = null;
      const handoff = sessionStorage.getItem("astrocraft:latest-blueprint");
      if (handoff) {
        try {
          blueprint = JSON.parse(handoff) as Record<string, unknown>;
        } catch {
          sessionStorage.removeItem("astrocraft:latest-blueprint");
        }
      }

      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;
      const memory = await loadWorkspaceMemory(authData.user.id);
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

      const rememberedProjectId = sessionStorage.getItem("astrocraft:content-project-id");
      const { data: savedContent } = await supabase
        .from("content_sessions")
        .select("project_id,slides,messages,theme,brief")
        .eq("owner_id", authData.user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextProjectId = (savedContent?.project_id as string | undefined)
        ?? rememberedProjectId
        ?? crypto.randomUUID();
      setProjectId(nextProjectId);
      sessionStorage.setItem("astrocraft:content-project-id", nextProjectId);

      const profile = blueprint ?? {};
      const list = (value: unknown) =>
        Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
      const persona = typeof profile.persona_name === "string" ? profile.persona_name : "your audience";
      const offer = profile.offer && typeof profile.offer === "object"
        ? profile.offer as Record<string, unknown>
        : memory?.offer_profile && Object.keys(memory.offer_profile).length
          ? memory.offer_profile
          : null;
      const context = [
        memoryContext(memory),
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
      } else if (sessionStorage.getItem("astrocraft:creation-intent") === "ideas") {
        setPurpose("Sales");
        setSlideCount("10");
        setDescription((current) => current || `Generate ten strong presentation and content ideas for ${persona}. Each idea should include a hook, audience promise, example visual, and recommended icon.`);
      }
    }
  }, []);

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
        }, { onConflict: "project_id" });
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
  const hasContent = slides.length > 0;
  const generating = step >= 0;

  const patch = (id: string, next: Partial<Slide>) =>
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...next } : s)));

  const applyStyle = (s: StyleId) => {
    setStyleId(s);
    setFontSetId(STYLE_FONT[s]);
    const layout = STYLE_LAYOUT[s];
    setSlides((prev) => prev.map((sl) => ({ ...sl, layout }))); 
  };

  const handleGenerate = async () => {
    if (generating) return;
    if (!projectId) {
      setStatus("Your workspace is still loading. Try again in a moment.");
      return;
    }
    if (!description.trim()) {
      setStatus("Describe what you want to create first.");
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
      const remote = await askAssistant({
        mode: "generate",
        projectId,
        blueprintSessionId,
        message: `Generate exactly ${requestedCount} slides. Include a deliberate opening, a logical middle sequence, and a clear closing or thank-you slide. Keep each slide concise. Brief: ${description}`,
        description,
        purpose,
        slideCount: String(requestedCount),
        style: styleId,
        fontSet: fontSetId,
        palette: paletteId,
        ratio,
        slides,
        selectedSlideId: selectedId,
        messages,
      });
      if (!remote?.slides?.length) throw new Error("Content Maker returned no slides.");
      if (remote.style) applyStyle(remote.style);
      if (remote.fontSet) setFontSetId(remote.fontSet);
      if (remote.palette) setPaletteId(remote.palette);
      if (remote.purpose) setPurpose(remote.purpose);
      if (remote.ratio) setRatio(remote.ratio);
      setSlideCount(String(remote.slides.length));
      setSlides(remote.slides);
      setSelectedId(remote.slides[0]?.id ?? null);
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        await saveWorkspaceMemory(authData.user.id, {
          creation_preferences: {
            purpose: remote.purpose ?? purpose,
            slide_count: remote.slides.length,
            style: remote.style ?? styleId,
            font_set: remote.fontSet ?? fontSetId,
            palette: remote.palette ?? paletteId,
            ratio: remote.ratio ?? ratio,
            motion,
          },
        });
      }
      if (remote.reply) {
        setMessages((current) => [...current, { id: `generation-${Date.now()}`, role: "assistant", text: remote.reply! }]);
      }
      setStatus(`${remote.slides.length} slides generated and saved`);
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
    setChatBusy(true);
    try {
      if (!projectId) throw new Error("Your workspace is still loading. Try again in a moment.");
      const remote = await askAssistant({
        mode: "assistant",
        projectId,
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
      });
      if (!remote) throw new Error("Content Maker returned an empty response.");
      if (remote.style) applyStyle(remote.style);
      if (remote.fontSet) setFontSetId(remote.fontSet);
      if (remote.palette) setPaletteId(remote.palette);
      if (remote.purpose) setPurpose(remote.purpose);
      if (remote.ratio) setRatio(remote.ratio);
      if (remote.slideCount) setSlideCount(String(remote.slideCount));
      if (remote.slides?.length) {
        setSlides(remote.slides);
        setSelectedId((current) => remote.slides!.some((slide) => slide.id === current) ? current : remote.slides![0]?.id ?? null);
      }
      setMessages((prev) => [...prev, { id: `${id}r`, role: "assistant", text: remote.reply ?? "Your deck has been updated." }]);
    } catch (error) {
      setMessages((prev) => [...prev, { id: `${id}e`, role: "assistant", text: error instanceof Error ? error.message : "Content Maker could not process that request." }]);
    } finally {
      setChatBusy(false);
    }
  };

  const regenerateSelectedSlide = () => {
    if (!selected) return;
    void handleChat(`Regenerate only the selected slide "${selected.title}". Keep its position in the deck, improve the copy and visual concept, use no more than four concise bullets, and return the complete deck with only that slide changed.`);
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
        />
      </div>
    </div>
  );
}
