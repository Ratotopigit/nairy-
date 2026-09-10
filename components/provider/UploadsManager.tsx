"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CloudUpload,
  Eraser,
  FileText,
  Link2,
  Loader2,
  Package,
  Palette,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { extractPalette, prepareImageForStorage, type ExtractedPalette } from "@/lib/image";
import { extractDocumentExcerpt } from "@/lib/workspace-context";
import { loadWorkspaceMemory, saveWorkspaceMemory } from "@/lib/workspace-memory";
import { auth, db, storage } from "@/lib/firebase/config";
import { addDoc, collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";

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

type PendingUpload = {
  id: string;
  role: AssetRole;
  fileName: string;
  mimeType: string;
  previewUrl?: string;
};

const ROLE_OPTIONS: Array<{
  role: Exclude<AssetRole, "reference">;
  title: string;
  badge: string;
  heading: string;
  cardDescription: string;
  description: string;
  accept: string;
}> = [
  {
    role: "logo",
    title: "Logo",
    badge: "PNG / SVG / JPG",
    heading: "Upload Logo",
    cardDescription: "PNG/SVG. White backgrounds are cleaned when possible.",
    description: "Use SVG or transparent PNG when you have it. JPG/WebP logos are cleaned.",
    accept: "image/png,image/jpeg,image/webp,image/svg+xml",
  },
  {
    role: "brand_photo",
    title: "Brand photo",
    badge: "Speaker / Team",
    heading: "Upload Brand Photo",
    cardDescription: "Speaker, founder, team, or client photo.",
    description: "Upload speaker, founder, team, or client photos.",
    accept: "image/png,image/jpeg,image/webp",
  },
  {
    role: "product",
    title: "Product image",
    badge: "Mockup / Proof",
    heading: "Upload Product Image",
    cardDescription: "Product, screenshot, mockup, or proof visual.",
    description: "Upload product images, screenshots, mockups, or proof visuals.",
    accept: "image/png,image/jpeg,image/webp",
  },
  {
    role: "background",
    title: "Background",
    badge: "Hero / Slide texture",
    heading: "Upload Background",
    cardDescription: "Hero images or slide texture references.",
    description: "Upload hero images or slide texture references.",
    accept: "image/png,image/jpeg,image/webp",
  },
  {
    role: "document",
    title: "Brief/PDF",
    badge: "PDF / PPTX / TXT",
    heading: "Upload Brief/PDF",
    cardDescription: "Source material for future content prompts.",
    description: "Upload source material for future content prompts.",
    accept: ".pdf,.pptx,.txt",
  },
];

const roleCopy: Record<AssetRole, string> = {
  logo: "Logo",
  brand_photo: "Brand photo",
  product: "Product image",
  background: "Background",
  document: "Brief/PDF",
  reference: "Reference",
};

const formatBytes = (bytes: number) =>
  bytes < 1024 * 1024
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

const fileMatchesAccept = (file: File, accept: string) => {
  const tokens = accept.split(",").map((token) => token.trim().toLowerCase()).filter(Boolean);
  const name = file.name.toLowerCase();
  const mime = (file.type || "").toLowerCase();
  return tokens.some((token) => {
    if (token.startsWith(".")) return name.endsWith(token);
    if (token.endsWith("/*")) return mime.startsWith(token.slice(0, -1));
    return mime === token;
  });
};

export default function UploadsManager() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; role?: string } | null>(null);
  const [dragActiveRole, setDragActiveRole] = useState<AssetRole | null>(null);
  const [brandBrief, setBrandBrief] = useState<BrandBrief>({
    businessLine: "",
    quoteBank: "",
    usageNotes: "",
  });

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const bucketReadyRef = useRef(false);

  useEffect(() => {
    void loadAssets();
  }, []);

  async function loadAssets() {
    const user = auth.currentUser;
    if (!user) return;
    const memory = await loadWorkspaceMemory(user.uid);
    setBrandBrief({
      businessLine: typeof memory?.brand_profile.business_line === "string" ? memory.brand_profile.business_line : "",
      quoteBank: typeof memory?.brand_profile.quote_bank === "string" ? memory.brand_profile.quote_bank : "",
      usageNotes: typeof memory?.brand_profile.usage_notes === "string" ? memory.brand_profile.usage_notes : "",
    });

    try {
      const q = query(
        collection(db, "workspace_assets"),
        where("owner_id", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      const rawAssets = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Asset, "id"> & { created_at?: string }),
      }));

      rawAssets.sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });

      const withUrls = await Promise.all(
        rawAssets.map(async (asset) => {
          try {
            const fileRef = ref(storage, asset.storage_path);
            const signedUrl = await getDownloadURL(fileRef);
            return { ...asset, signedUrl };
          } catch (urlErr) {
            console.warn("Could not get download URL:", asset.storage_path, urlErr);
            return asset;
          }
        })
      );
      setAssets(withUrls);
    } catch (error: any) {
      console.error("Failed to load workspace assets:", error?.message || error);
    }
  }

  async function ensureAssetBucket() {
    // Firebase Storage buckets are provisioned and accessible by default
    bucketReadyRef.current = true;
  }

  async function saveBrandBrief(openContentMaker = false) {
    const user = auth.currentUser;
    if (!user) return;
    setBusy(true);
    try {
      const currentMemory = await loadWorkspaceMemory(user.uid);
      const brandProfile = {
        ...(currentMemory?.brand_profile ?? {}),
        business_line: brandBrief.businessLine.trim(),
        quote_bank: brandBrief.quoteBank.trim(),
        usage_notes: brandBrief.usageNotes.trim(),
      };
      const { error } = await saveWorkspaceMemory(user.uid, {
        brand_profile: brandProfile,
      });
      if (error) throw error;
      const handoff = [
        brandBrief.businessLine.trim() ? `Business line: ${brandBrief.businessLine.trim()}` : "",
        brandBrief.quoteBank.trim() ? `Quote bank:\n${brandBrief.quoteBank.trim()}` : "",
        brandBrief.usageNotes.trim() ? `Asset and brand notes:\n${brandBrief.usageNotes.trim()}` : "",
      ].filter(Boolean).join("\n\n");
      if (handoff) sessionStorage.setItem("astrocraft:brand-brief", handoff);
      if (openContentMaker) router.push("/provider/slides");
    } catch (error) {
      console.error("Could not save brand context:", error);
    } finally {
      setBusy(false);
    }
  }

  function triggerPickerForRole(targetRole: Exclude<AssetRole, "reference">) {
    if (busy) return;
    fileInputRefs.current[targetRole]?.click();
  }

  async function uploadFiles(files: FileList | File[], targetRole: Exclude<AssetRole, "reference">) {
    const option = ROLE_OPTIONS.find((item) => item.role === targetRole) ?? ROLE_OPTIONS[0]!;
    const incoming = Array.from(files).filter((file) => file.size > 0);
    const list = incoming.filter((file) => fileMatchesAccept(file, option.accept));
    const user = auth.currentUser;
    if (!user || !list.length) return;
    if (busy) return;
    setBusy(true);
    setProgress({ current: 0, total: list.length, role: targetRole });
    try {
      for (const [index, file] of list.entries()) {
        const pendingId = crypto.randomUUID();
        const localPreview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
        setPending((current) => [
          {
            id: pendingId,
            role: targetRole,
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            previewUrl: localPreview,
          },
          ...current,
        ]);
        try {
          const isImage = file.type.startsWith("image/") && file.type !== "image/svg+xml";
          const prepared = isImage ? await prepareImageForStorage(file, { logo: targetRole === "logo" }) : null;
          const blob = prepared?.blob ?? file;
          const fileName = prepared?.fileName ?? safeName(file.name);
          const mimeType = prepared?.mimeType ?? (file.type || "application/octet-stream");
          const path = `${user.uid}/${targetRole}/${crypto.randomUUID()}-${fileName}`;
          const palette = prepared?.previewUrl ? await extractPalette(prepared.previewUrl) : null;

          const fileRef = ref(storage, path);
          await uploadBytes(fileRef, blob, { contentType: mimeType });

          try {
            await addDoc(collection(db, "workspace_assets"), {
              owner_id: user.uid,
              file_name: fileName,
              storage_path: path,
              mime_type: mimeType,
              byte_size: blob.size,
              asset_type: typeFor(targetRole, file),
              asset_role: targetRole,
              palette,
              background_removed_path: targetRole === "logo" && prepared?.backgroundRemoved ? path : null,
              created_at: new Date().toISOString(),
            });
          } catch (rowError) {
            await deleteObject(fileRef).catch(() => {});
            throw rowError;
          }

          if (palette || targetRole === "logo") {
            const currentMemory = await loadWorkspaceMemory(user.uid);
            const brandProfile = {
              ...(currentMemory?.brand_profile ?? {}),
              last_asset_role: targetRole,
              ...(targetRole === "logo" ? { logo_path: path } : {}),
              ...(palette ? { palette } : {}),
            };
            await saveWorkspaceMemory(user.uid, {
              brand_profile: brandProfile,
            });
          }

          if (
            targetRole === "document" ||
            file.type === "application/pdf" ||
            /\.(pdf|pptx|txt)$/i.test(file.name)
          ) {
            try {
              const excerpt = await extractDocumentExcerpt(file, 8000);
              if (excerpt.trim()) {
                const currentMemory = await loadWorkspaceMemory(user.uid);
                const existingExcerpts = Array.isArray(currentMemory?.brand_profile?.brief_excerpts)
                  ? [...(currentMemory.brand_profile.brief_excerpts as Array<{ file_name?: string; excerpt?: string }>)]
                  : [];
                existingExcerpts.push({ file_name: fileName, excerpt: excerpt.trim() });
                await saveWorkspaceMemory(user.uid, {
                  brand_profile: {
                    ...(currentMemory?.brand_profile ?? {}),
                    brief_excerpts: existingExcerpts.slice(-10),
                  },
                });
              }
            } catch (excerptError) {
              console.warn("Brief excerpt extraction failed:", excerptError);
            }
          }
        } finally {
          setPending((current) => {
            const item = current.find((preview) => preview.id === pendingId);
            if (item?.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
            return current.filter((preview) => preview.id !== pendingId);
          });
          setProgress({ current: index + 1, total: list.length, role: targetRole });
        }
      }
      await loadAssets();
    } catch (error) {
      await loadAssets();
      console.error("Upload error:", error);
    } finally {
      setBusy(false);
      setProgress(null);
      if (fileInputRefs.current[targetRole]) {
        fileInputRefs.current[targetRole]!.value = "";
      }
    }
  }

  async function removeAsset(asset: Asset) {
    if (!window.confirm(`Delete ${asset.file_name}? This permanently removes the asset.`)) return;
    setBusy(true);
    try {
      const fileRef = ref(storage, asset.storage_path);
      await deleteObject(fileRef).catch((e) => console.warn("Could not delete from storage:", e));
      await deleteDoc(doc(db, "workspace_assets", asset.id));
      setAssets((current) => current.filter((item) => item.id !== asset.id));
    } catch (error) {
      console.error("Could not delete asset:", error);
    } finally {
      setBusy(false);
    }
  }

  function useInDeck(asset: Asset) {
    if (!asset.signedUrl || !asset.mime_type.startsWith("image/")) {
      return;
    }
    sessionStorage.setItem("astrocraft:selected-asset", asset.signedUrl);
    router.push("/provider/slides");
  }

  return (
    <div className="space-y-6">
      {/* Unified Canvas Section */}
      <section className="rounded-[22px] border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/70 pb-5">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Unified Canvas
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-foreground">
              Brand Asset Canvas
            </h2>
            <p className="mt-1 max-w-2xl text-xs sm:text-sm leading-5 text-muted-foreground">
              Drop files directly into each category slot below. All 5 brand asset categories are organized side-by-side in one unified workspace.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground">
              <BadgeCheck className="size-3.5 text-primary" />
              Auto-saved per user
            </span>
          </div>
        </div>

        {/* 5-Column Side-by-Side Unified Canvas Row */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {ROLE_OPTIONS.map((option) => {
            const roleAssets = assets.filter((asset) => (asset.asset_role ?? "reference") === option.role);
            const rolePending = pending.filter((item) => item.role === option.role);
            const hasItems = roleAssets.length > 0 || rolePending.length > 0;
            const isDraggingOver = dragActiveRole === option.role;
            const isUploadingThisRole = busy && progress?.role === option.role;

            return (
              <div
                key={option.role}
                className={`flex flex-col rounded-2xl border bg-background/60 p-3 transition-all duration-200 ${
                  isDraggingOver
                    ? "border-primary bg-secondary/70 ring-2 ring-primary/20"
                    : "border-border/90 hover:border-border-strong"
                }`}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragActiveRole(option.role);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActiveRole(option.role);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                    setDragActiveRole(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActiveRole(null);
                  if (!busy && e.dataTransfer.files) {
                    void uploadFiles(e.dataTransfer.files, option.role);
                  }
                }}
              >
                {/* Slot Category Header */}
                <div className="mb-3 flex items-start justify-between gap-2 px-1 pt-0.5">
                  <div className="min-w-0">
                    <h3 className="truncate text-base sm:text-lg font-bold text-neutral-900 leading-snug">
                      {option.title}
                    </h3>
                    <p className="mt-0.5 text-xs font-medium text-neutral-600">
                      {option.badge}
                    </p>
                  </div>
                  {hasItems ? (
                    <span className="mt-0.5 shrink-0 rounded-md bg-secondary/80 px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                      {roleAssets.length}
                    </span>
                  ) : null}
                </div>

                {/* Slot Content: Empty State Dropzone OR Populated Product Cards */}
                {!hasItems ? (
                  /* Empty State: Matching Exact Font Style, Muted Color, Dashed Border & Icon */
                  <div
                    onClick={() => triggerPickerForRole(option.role)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        triggerPickerForRole(option.role);
                      }
                    }}
                    className={`group relative flex min-h-[190px] flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#ccc5b5] bg-[#faf8f4] p-4 text-center transition-colors duration-150 hover:border-[#8e9894] hover:bg-[#f5f1e8] ${
                      isDraggingOver ? "border-primary bg-secondary/60" : ""
                    }`}
                  >
                    {isUploadingThisRole ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="size-5 animate-spin text-foreground" />
                        <span className="font-serif text-[13px] text-[#4d5955]">
                          Uploading {progress.current} of {progress.total}...
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-row items-center justify-center gap-2 text-center">
                        <CloudUpload
                          className="size-[18px] shrink-0 text-[#52605b] transition-transform duration-200 group-hover:-translate-y-0.5"
                          strokeWidth={1.5}
                        />
                        <span className="font-serif text-[12.5px] leading-snug text-[#4a5552]">
                          Drag files here or choose files
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Populated State (Product Card / Shopping Card Style) */
                  <div className="flex flex-1 flex-col gap-2.5">
                    {/* Pending Uploading Cards */}
                    {rolePending.map((item) => (
                      <article
                        key={item.id}
                        className="overflow-hidden rounded-xl border border-border bg-card shadow-xs"
                      >
                        <div className="relative grid aspect-[4/3] place-items-center overflow-hidden bg-secondary/50">
                          {item.previewUrl ? (
                            <img src={item.previewUrl} alt="" className="h-full w-full object-contain" />
                          ) : (
                            <FileText className="size-6 text-muted-foreground" />
                          )}
                          <div className="absolute inset-0 grid place-items-center bg-background/60 backdrop-blur-[1px]">
                            <Loader2 className="size-5 animate-spin text-foreground" />
                          </div>
                        </div>
                        <div className="p-2.5">
                          <p className="truncate text-xs font-semibold text-foreground">{item.fileName}</p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">Uploading...</p>
                        </div>
                      </article>
                    ))}

                    {/* Populated Asset Cards */}
                    {roleAssets.map((asset) => (
                      <article
                        key={asset.id}
                        className="group overflow-hidden rounded-xl border border-border bg-card shadow-xs transition-shadow hover:shadow-sm"
                      >
                        {/* Thumbnail Preview Area */}
                        <div className="relative grid aspect-[4/3] place-items-center overflow-hidden bg-secondary/35">
                          {asset.signedUrl && asset.mime_type.startsWith("image/") ? (
                            <img
                              src={asset.signedUrl}
                              alt={asset.file_name}
                              className="h-full w-full object-contain p-1.5"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1 p-2 text-center">
                              <FileText className="size-7 text-muted-foreground" />
                              <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-muted-foreground">
                                {asset.mime_type.includes("pdf")
                                  ? "PDF"
                                  : asset.mime_type.includes("presentation") || asset.file_name.endsWith(".pptx")
                                  ? "PPTX"
                                  : "Document"}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Metadata & Actions Area */}
                        <div className="p-2.5">
                          <p
                            className="truncate text-xs font-semibold text-foreground"
                            title={asset.file_name}
                          >
                            {asset.file_name}
                          </p>
                          <div className="mt-1 flex items-center justify-between gap-1 text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="shrink-0">{formatBytes(asset.byte_size)}</span>
                              {asset.palette ? (
                                <div className="flex items-center gap-1">
                                  {Object.values(asset.palette)
                                    .slice(0, 3)
                                    .map((color) => (
                                      <span
                                        key={color}
                                        className="size-2.5 rounded-full border border-border/80"
                                        style={{ backgroundColor: color }}
                                        title={color}
                                      />
                                    ))}
                                </div>
                              ) : null}
                            </div>

                            {/* Compact Muted Trash Button (turns red on hover) */}
                            <button
                              type="button"
                              disabled={busy}
                              onClick={(e) => {
                                e.stopPropagation();
                                void removeAsset(asset);
                              }}
                              title={`Delete ${asset.file_name}`}
                              aria-label={`Delete ${asset.file_name}`}
                              className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>

                          {/* Full-width "Use in deck" Action Button */}
                          {asset.mime_type.startsWith("image/") ? (
                            <button
                              type="button"
                              onClick={() => useInDeck(asset)}
                              className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary/40 py-1.5 text-center text-xs font-medium text-foreground transition hover:border-foreground/30 hover:bg-secondary/80"
                            >
                              <Link2 className="size-3 shrink-0" />
                              <span>Use in deck</span>
                            </button>
                          ) : null}
                        </div>
                      </article>
                    ))}

                    {/* Compact Dropzone to Add More Files to this Slot */}
                    <div
                      onClick={() => triggerPickerForRole(option.role)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          triggerPickerForRole(option.role);
                        }
                      }}
                      className="group flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#ccc5b5] bg-[#faf8f4] px-2.5 py-2 text-center transition-colors hover:border-[#8e9894] hover:bg-[#f5f1e8]"
                    >
                      <Plus className="size-3.5 text-[#52605b]" />
                      <span className="font-serif text-[11.5px] text-[#4a5552]">
                        Add more
                      </span>
                    </div>
                  </div>
                )}

                {/* Hidden File Input for this Role */}
                <input
                  ref={(el) => {
                    fileInputRefs.current[option.role] = el;
                  }}
                  type="file"
                  className="hidden"
                  multiple
                  accept={option.accept}
                  onChange={(event) =>
                    event.target.files && void uploadFiles(event.target.files, option.role)
                  }
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Brand Context & Overview Sections */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Reusable Wording / Brand Lines Form */}
        <section className="rounded-[22px] border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Brand Lines
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.035em] text-foreground">
                Give Content Maker your reusable wording
              </h2>
              <p className="mt-1 text-xs sm:text-sm leading-5 text-muted-foreground">
                Add the lines, quotes, claims, and asset instructions that should follow every PPT/PDF.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-foreground">Business one-liner</span>
              <input
                value={brandBrief.businessLine}
                onChange={(event) =>
                  setBrandBrief((current) => ({ ...current, businessLine: event.target.value }))
                }
                placeholder="Example: We help premium service businesses turn expertise into booked sales calls."
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-xs sm:text-sm outline-none focus:border-foreground/35"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-foreground">Quotes, phrases, proof lines</span>
              <textarea
                value={brandBrief.quoteBank}
                onChange={(event) =>
                  setBrandBrief((current) => ({ ...current, quoteBank: event.target.value }))
                }
                rows={3}
                placeholder="Paste founder quotes, customer language, positioning phrases, proof placeholders, or lines the deck should reuse."
                className="resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-xs sm:text-sm leading-6 outline-none focus:border-foreground/35"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-foreground">How assets should be used</span>
              <textarea
                value={brandBrief.usageNotes}
                onChange={(event) =>
                  setBrandBrief((current) => ({ ...current, usageNotes: event.target.value }))
                }
                rows={3}
                placeholder="Example: Use logo on intro/closing only. Use founder photo on authority slides. Keep product images for proof sections."
                className="resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-xs sm:text-sm leading-6 outline-none focus:border-foreground/35"
              />
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveBrandBrief(false)}
                className="rounded-xl border border-border bg-card px-4 py-2 text-xs sm:text-sm font-semibold text-foreground transition hover:border-foreground/35 disabled:opacity-40"
              >
                Save brand context
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveBrandBrief(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-xs sm:text-sm font-semibold text-background transition hover:bg-foreground/90 disabled:opacity-40"
              >
                <span>Send to Content Maker</span>
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </section>

        {/* What gets saved Aside */}
        <aside className="rounded-[22px] border border-border bg-card p-5 shadow-sm">
          <p className="text-xs sm:text-sm font-semibold text-foreground">What gets saved</p>
          <div className="mt-4 space-y-3.5 text-xs sm:text-sm leading-5 text-muted-foreground">
            <div className="flex gap-3">
              <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>Files go to private Firebase Storage under your account.</span>
            </div>
            <div className="flex gap-3">
              <Palette className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>Image palettes are saved so Content Maker can reuse brand colors.</span>
            </div>
            <div className="flex gap-3">
              <Eraser className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>Logo cleanup removes solid/white backgrounds automatically.</span>
            </div>
            <div className="flex gap-3">
              <Package className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>Saved assets can be placed directly into the slide builder.</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
