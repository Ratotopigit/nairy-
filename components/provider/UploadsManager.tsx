"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Eraser,
  FileText,
  ImageIcon,
  Link2,
  Loader2,
  Package,
  Palette,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { extractPalette, prepareImageForStorage, type ExtractedPalette } from "@/lib/image";
import { supabase } from "@/lib/supabase/client";
import { loadWorkspaceMemory, saveWorkspaceMemory } from "@/lib/workspace-memory";

type AssetRole = "logo" | "brand_photo" | "product" | "background" | "document" | "reference";

type BrandBrief = {
  businessLine: string;
  quoteBank: string;
  usageNotes: string;
};

type Asset = {
  id: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  byte_size: number;
  asset_type: "logo" | "photo" | "reference" | "document" | "video";
  asset_role?: AssetRole | null;
  palette?: ExtractedPalette | null;
  background_removed_path?: string | null;
  signedUrl?: string;
};

type UploadPreview = {
  id: string;
  fileName: string;
  role: AssetRole;
  mimeType: string;
  byteSize: number;
  previewUrl?: string;
  signedUrl?: string;
  palette?: ExtractedPalette | null;
  backgroundRemoved?: boolean;
  status: "preparing" | "saved" | "failed";
};

const ROLE_OPTIONS: Array<{
  role: AssetRole;
  title: string;
  description: string;
  accept: string;
}> = [
  { role: "logo", title: "Logo", description: "PNG/SVG. White backgrounds are cleaned when possible.", accept: "image/png,image/jpeg,image/webp,image/svg+xml" },
  { role: "brand_photo", title: "Brand photo", description: "Speaker, founder, team, or client photo.", accept: "image/png,image/jpeg,image/webp" },
  { role: "product", title: "Product image", description: "Product, screenshot, mockup, or proof visual.", accept: "image/png,image/jpeg,image/webp" },
  { role: "background", title: "Background", description: "Hero images or slide texture references.", accept: "image/png,image/jpeg,image/webp" },
  { role: "document", title: "Brief/PDF", description: "Source material for future content prompts.", accept: ".pdf,.pptx,.txt" },
];

const roleCopy: Record<AssetRole, string> = {
  logo: "Logo",
  brand_photo: "Brand photo",
  product: "Product image",
  background: "Background",
  document: "Brief/PDF",
  reference: "Reference",
};

const formatBytes = (bytes: number) => bytes < 1024 * 1024
  ? `${Math.max(1, bytes / 1024).toFixed(1)} KB`
  : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const typeFor = (role: AssetRole, file: File): Asset["asset_type"] => {
  if (role === "logo") return "logo";
  if (role === "document" || file.type === "application/pdf") return "document";
  if (file.type.startsWith("image/")) return "photo";
  if (file.type.startsWith("video/")) return "video";
  return "reference";
};

const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]+/g, "-") || "asset";

const revokeLocalPreview = (preview: UploadPreview) => {
  if (preview.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(preview.previewUrl);
};

export default function UploadsManager() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [recentUploads, setRecentUploads] = useState<UploadPreview[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [role, setRole] = useState<AssetRole>("logo");
  const [brandBrief, setBrandBrief] = useState<BrandBrief>({
    businessLine: "",
    quoteBank: "",
    usageNotes: "",
  });
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedRole = ROLE_OPTIONS.find((item) => item.role === role) ?? ROLE_OPTIONS[0]!;
  const recentPreviewsByRole = ROLE_OPTIONS
    .map((option) => ({
      ...option,
      previews: recentUploads.filter((preview) => preview.role === option.role),
    }))
    .filter((option) => option.previews.length > 0);

  useEffect(() => { void loadAssets(); }, []);

  async function loadAssets() {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;
    const memory = await loadWorkspaceMemory(authData.user.id);
    setBrandBrief({
      businessLine: typeof memory?.brand_profile.business_line === "string" ? memory.brand_profile.business_line : "",
      quoteBank: typeof memory?.brand_profile.quote_bank === "string" ? memory.brand_profile.quote_bank : "",
      usageNotes: typeof memory?.brand_profile.usage_notes === "string" ? memory.brand_profile.usage_notes : "",
    });
    const { data, error } = await supabase
      .from("workspace_assets")
      .select("id,file_name,storage_path,mime_type,byte_size,asset_type,asset_role,palette,background_removed_path")
      .eq("owner_id", authData.user.id)
      .order("created_at", { ascending: false });
    if (error) return setMessage(`Asset library is not ready: ${error.message}`);
    const withUrls = await Promise.all(((data ?? []) as Asset[]).map(async (asset) => {
      const { data: signed } = await supabase.storage.from("workspace-assets").createSignedUrl(asset.storage_path, 3600);
      return { ...asset, signedUrl: signed?.signedUrl };
    }));
    setAssets(withUrls);
  }

  async function saveBrandBrief(openContentMaker = false) {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;
    setBusy(true);
    setMessage(null);
    try {
      const currentMemory = await loadWorkspaceMemory(authData.user.id);
      const brandProfile = {
        ...(currentMemory?.brand_profile ?? {}),
        business_line: brandBrief.businessLine.trim(),
        quote_bank: brandBrief.quoteBank.trim(),
        usage_notes: brandBrief.usageNotes.trim(),
      };
      const { error } = await saveWorkspaceMemory(authData.user.id, {
        brand_profile: brandProfile,
      });
      if (error) throw error;
      const handoff = [
        brandBrief.businessLine.trim() ? `Business line: ${brandBrief.businessLine.trim()}` : "",
        brandBrief.quoteBank.trim() ? `Quote bank:\n${brandBrief.quoteBank.trim()}` : "",
        brandBrief.usageNotes.trim() ? `Asset and brand notes:\n${brandBrief.usageNotes.trim()}` : "",
      ].filter(Boolean).join("\n\n");
      if (handoff) sessionStorage.setItem("astrocraft:brand-brief", handoff);
      setMessage(openContentMaker ? "Brand context saved and sent to Content Maker." : "Brand context saved.");
      if (openContentMaker) router.push("/provider/slides");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save brand context.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user || !list.length) return;
    setBusy(true);
    setMessage(null);
    const localPreviews = list.map((file, index): UploadPreview => ({
      id: `local-${Date.now()}-${index}`,
      fileName: file.name,
      role,
      mimeType: file.type || "application/octet-stream",
      byteSize: file.size,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      status: "preparing",
    }));
    setRecentUploads((current) => [...localPreviews, ...current]);
    try {
      for (const [index, file] of list.entries()) {
        const previewId = localPreviews[index]?.id;
        const isImage = file.type.startsWith("image/") && file.type !== "image/svg+xml";
        const prepared = isImage
          ? await prepareImageForStorage(file, { logo: role === "logo" })
          : null;
        const blob = prepared?.blob ?? file;
        const fileName = prepared?.fileName ?? safeName(file.name);
        const mimeType = prepared?.mimeType ?? (file.type || "application/octet-stream");
        const path = `${authData.user.id}/${role}/${crypto.randomUUID()}-${fileName}`;
        const palette = prepared?.previewUrl ? await extractPalette(prepared.previewUrl) : null;
        if (prepared?.previewUrl && previewId) {
          setRecentUploads((current) => current.map((preview) => {
            if (preview.id !== previewId) return preview;
            revokeLocalPreview(preview);
            return {
              ...preview,
              fileName,
              mimeType,
              byteSize: blob.size,
              previewUrl: prepared.previewUrl,
              palette,
              backgroundRemoved: prepared.backgroundRemoved,
            };
          }));
        }
        const { error: uploadError } = await supabase.storage
          .from("workspace-assets")
          .upload(path, blob, { contentType: mimeType });
        if (uploadError) throw uploadError;
        const { data: signed } = await supabase.storage.from("workspace-assets").createSignedUrl(path, 3600);
        const { error: rowError } = await supabase.from("workspace_assets").insert({
          owner_id: authData.user.id,
          file_name: fileName,
          storage_path: path,
          mime_type: mimeType,
          byte_size: blob.size,
          asset_type: typeFor(role, file),
          asset_role: role,
          palette,
          background_removed_path: role === "logo" && prepared?.backgroundRemoved ? path : null,
        });
        if (rowError) {
          await supabase.storage.from("workspace-assets").remove([path]);
          throw rowError;
        }
        if (palette || role === "logo") {
          const currentMemory = await loadWorkspaceMemory(authData.user.id);
          const brandProfile = {
            ...(currentMemory?.brand_profile ?? {}),
            last_asset_role: role,
            ...(role === "logo" ? { logo_path: path } : {}),
            ...(palette ? { palette } : {}),
          };
          await saveWorkspaceMemory(authData.user.id, {
            brand_profile: brandProfile,
          });
        }
        if (previewId) {
          setRecentUploads((current) => current.map((preview) => (
            preview.id === previewId
              ? {
                  ...preview,
                  id: path,
                  fileName,
                  role,
                  mimeType,
                  byteSize: blob.size,
                  signedUrl: signed?.signedUrl,
                  palette,
                  backgroundRemoved: prepared?.backgroundRemoved,
                  status: "saved",
                }
              : preview
          )));
        }
      }
      await loadAssets();
      setMessage(role === "logo"
        ? "Logo saved automatically. If the background still looks boxed, upload a transparent PNG or SVG for best results."
        : `${list.length} ${roleCopy[role].toLowerCase()} asset${list.length === 1 ? "" : "s"} saved automatically to your private library.`);
    } catch (error) {
      const previewIds = new Set(localPreviews.map((preview) => preview.id));
      setRecentUploads((current) => current.map((preview) => (
        previewIds.has(preview.id) && preview.status === "preparing" ? { ...preview, status: "failed" } : preview
      )));
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removeAsset(asset: Asset) {
    setBusy(true);
    await supabase.storage.from("workspace-assets").remove([asset.storage_path]);
    await supabase.from("workspace_assets").delete().eq("id", asset.id);
    setAssets((current) => current.filter((item) => item.id !== asset.id));
    setBusy(false);
  }

  function useInDeck(asset: Asset) {
    if (!asset.signedUrl || !asset.mime_type.startsWith("image/")) {
      setMessage("Only image assets can be placed directly into a deck.");
      return;
    }
    sessionStorage.setItem("astrocraft:selected-asset", asset.signedUrl);
    router.push("/provider/slides");
  }

  function usePreviewInDeck(preview: UploadPreview) {
    const url = preview.signedUrl ?? preview.previewUrl;
    if (!url || !preview.mimeType.startsWith("image/")) {
      setMessage("Only image assets can be placed directly into a deck.");
      return;
    }
    sessionStorage.setItem("astrocraft:selected-asset", url);
    router.push("/provider/slides");
  }

  function clearRecentUploads() {
    recentUploads.forEach(revokeLocalPreview);
    setRecentUploads([]);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[22px] border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Brand Assets
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
                Save logos, photos, and source files.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Choose what you are uploading first. Logos are cleaned and saved as PNG when possible; photos are compressed before they go to Supabase.
              </p>
            </div>
            <div className="rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-foreground">
              Auto-saved per user
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {ROLE_OPTIONS.map((option) => (
              <button
                key={option.role}
                type="button"
                onClick={() => setRole(option.role)}
                className={`rounded-2xl border p-3 text-left transition ${
                  role === option.role
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-foreground hover:border-foreground/30"
                }`}
              >
                <span className="text-sm font-semibold">{option.title}</span>
                <span className={`mt-1 block text-[11px] leading-4 ${role === option.role ? "text-background/70" : "text-muted-foreground"}`}>
                  {option.description}
                </span>
              </button>
            ))}
          </div>

          <div
            onClick={() => !busy && inputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); void uploadFiles(event.dataTransfer.files); }}
            className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-border bg-background px-6 py-10 text-center transition hover:border-foreground/30"
          >
            <div className="mb-3 grid size-14 place-items-center rounded-2xl bg-secondary text-foreground">
              {busy ? <Loader2 className="size-6 animate-spin" /> : <UploadCloud className="size-6" />}
            </div>
            <p className="text-lg font-semibold text-foreground">{busy ? "Preparing and saving..." : `Upload ${selectedRole.title}`}</p>
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
              {role === "logo"
                ? "Use SVG or transparent PNG when you have it. JPG/WebP logos are converted and background-cleaned as best as the browser can do."
                : selectedRole.description}
            </p>
            <button type="button" className="mt-4 rounded-xl bg-foreground px-5 py-2.5 text-sm font-semibold text-background shadow-sm">
              Choose and save files
            </button>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              multiple
              accept={selectedRole.accept}
              onChange={(event) => event.target.files && void uploadFiles(event.target.files)}
            />
          </div>
          {message ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p> : null}
          {recentPreviewsByRole.length ? (
            <div className="mt-5 rounded-2xl border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Upload previews by section</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">New uploads stay under their selected type instead of replacing each other.</p>
                </div>
                <button
                  type="button"
                  onClick={clearRecentUploads}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Clear previews
                </button>
              </div>
              <div className="mt-4 space-y-4">
                {recentPreviewsByRole.map((group) => (
                  <section key={group.role} className="rounded-2xl border border-border bg-card p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{group.title}</p>
                        <p className="text-xs text-muted-foreground">{group.previews.length} recent upload{group.previews.length === 1 ? "" : "s"}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRole(group.role)}
                        className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                      >
                        Add more
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {group.previews.map((preview) => {
                        const displayUrl = preview.signedUrl ?? preview.previewUrl;
                        return (
                          <article key={preview.id} className="rounded-xl border border-border bg-background p-3">
                            <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-lg bg-secondary">
                              {displayUrl && preview.mimeType.startsWith("image/") ? (
                                <img src={displayUrl} alt="" className="h-full w-full object-contain" />
                              ) : (
                                <FileText className="size-6 text-muted-foreground" />
                              )}
                            </div>
                            <p className="mt-3 truncate text-sm font-semibold text-foreground">{preview.fileName}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {roleCopy[preview.role]} · {formatBytes(preview.byteSize)}
                            </p>
                            <p className={`mt-1 text-xs ${
                              preview.status === "failed" ? "text-red-600" : "text-muted-foreground"
                            }`}>
                              {preview.status === "saved"
                                ? "Saved to library"
                                : preview.status === "failed"
                                  ? "Upload needs attention"
                                  : "Preparing preview and saving"}
                            </p>
                            {preview.backgroundRemoved ? (
                              <p className="mt-2 text-xs text-muted-foreground">Logo background cleaned where possible.</p>
                            ) : null}
                            {preview.palette ? (
                              <div className="mt-3 flex gap-1.5">
                                {Object.values(preview.palette).map((color) => (
                                  <span key={color} className="size-4 rounded-full border border-border" style={{ background: color }} />
                                ))}
                              </div>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => usePreviewInDeck(preview)}
                              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-2.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                            >
                              <Link2 className="size-3.5" />
                              Use in deck
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="rounded-[22px] border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-semibold text-foreground">What gets saved</p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
            <div className="flex gap-3"><BadgeCheck className="mt-1 size-4 shrink-0 text-foreground" /> Files go to private Supabase Storage under the signed-in user.</div>
            <div className="flex gap-3"><Palette className="mt-1 size-4 shrink-0 text-foreground" /> Image palettes are saved so Content Maker can reuse brand colors.</div>
            <div className="flex gap-3"><Eraser className="mt-1 size-4 shrink-0 text-foreground" /> Logo cleanup works best on flat white or solid backgrounds.</div>
            <div className="flex gap-3"><Package className="mt-1 size-4 shrink-0 text-foreground" /> Saved assets can be pushed into the slide builder.</div>
          </div>
        </aside>
      </section>

      <section className="grid gap-4 rounded-[22px] border border-border bg-card p-5 shadow-sm lg:grid-cols-[320px_minmax(0,1fr)]">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Brand Lines
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.035em] text-foreground">
            Give Content Maker your reusable wording.
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Add the lines, quotes, claims, and asset instructions that should follow every PPT/PDF.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveBrandBrief(false)}
            className="mt-4 hidden rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-sm disabled:opacity-40 lg:inline-flex"
          >
            Save brand context
          </button>
        </div>
        <div className="grid gap-3">
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold text-foreground">Business one-liner</span>
            <input
              value={brandBrief.businessLine}
              onChange={(event) => setBrandBrief((current) => ({ ...current, businessLine: event.target.value }))}
              placeholder="Example: We help premium service businesses turn expertise into booked sales calls."
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground/35"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold text-foreground">Quotes, phrases, proof lines</span>
            <textarea
              value={brandBrief.quoteBank}
              onChange={(event) => setBrandBrief((current) => ({ ...current, quoteBank: event.target.value }))}
              rows={4}
              placeholder="Paste founder quotes, customer language, positioning phrases, proof placeholders, or lines the deck should reuse."
              className="resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-6 outline-none focus:border-foreground/35"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold text-foreground">How assets should be used</span>
            <textarea
              value={brandBrief.usageNotes}
              onChange={(event) => setBrandBrief((current) => ({ ...current, usageNotes: event.target.value }))}
              rows={3}
              placeholder="Example: Use logo on intro/closing only. Use founder photo on authority slides. Keep product images for proof sections."
              className="resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-6 outline-none focus:border-foreground/35"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveBrandBrief(false)}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:border-foreground/35 disabled:opacity-40"
            >
              Save brand context
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveBrandBrief(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-40"
            >
              Send to Content Maker
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[22px] border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Saved Brand Library</h2>
        </div>
        {assets.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            No saved brand assets yet.
          </div>
        ) : (
          <div className="grid gap-0 sm:grid-cols-2 xl:grid-cols-3">
            {assets.map((asset) => (
              <article key={asset.id} className="border-b border-border p-4 sm:border-r">
                <div className="flex items-start gap-4">
                  <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary text-muted-foreground">
                    {asset.signedUrl && asset.mime_type.startsWith("image/") ? (
                      <img src={asset.signedUrl} alt="" className="h-full w-full object-contain" />
                    ) : asset.mime_type.startsWith("image/") ? (
                      <ImageIcon className="size-5" />
                    ) : (
                      <FileText className="size-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{asset.file_name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {roleCopy[asset.asset_role ?? "reference"]} · {formatBytes(asset.byte_size)}
                    </p>
                    {asset.palette ? (
                      <div className="mt-3 flex gap-1.5">
                        {Object.values(asset.palette).map((color) => (
                          <span key={color} className="size-4 rounded-full border border-border" style={{ background: color }} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => useInDeck(asset)}
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    <Link2 className="size-3.5" />
                    Use in deck
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void removeAsset(asset)}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-40"
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
