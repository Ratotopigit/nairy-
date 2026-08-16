"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, ImageIcon, Link2, Loader2, Trash2, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Asset = {
  id: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  byte_size: number;
  asset_type: "logo" | "photo" | "reference" | "document" | "video";
  signedUrl?: string;
};

const formatBytes = (bytes: number) => bytes < 1024 * 1024
  ? `${Math.max(1, bytes / 1024).toFixed(1)} KB`
  : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const typeFor = (file: File): Asset["asset_type"] => {
  if (file.type.startsWith("image/")) return file.name.toLowerCase().includes("logo") ? "logo" : "photo";
  if (file.type.startsWith("video/")) return "video";
  return "document";
};

export default function UploadsManager() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { void loadAssets(); }, []);

  async function loadAssets() {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;
    const { data, error } = await supabase
      .from("workspace_assets")
      .select("id,file_name,storage_path,mime_type,byte_size,asset_type")
      .eq("owner_id", authData.user.id)
      .order("created_at", { ascending: false });
    if (error) return setMessage(`Asset library is not ready: ${error.message}`);
    const withUrls = await Promise.all(((data ?? []) as Asset[]).map(async (asset) => {
      const { data: signed } = await supabase.storage.from("workspace-assets").createSignedUrl(asset.storage_path, 3600);
      return { ...asset, signedUrl: signed?.signedUrl };
    }));
    setAssets(withUrls);
  }

  async function uploadFiles(files: FileList | File[]) {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user || !files.length) return;
    setBusy(true);
    setMessage(null);
    try {
      for (const file of Array.from(files)) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
        const path = `${authData.user.id}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("workspace-assets").upload(path, file, { contentType: file.type });
        if (uploadError) throw uploadError;
        const { error: rowError } = await supabase.from("workspace_assets").insert({
          owner_id: authData.user.id,
          file_name: file.name,
          storage_path: path,
          mime_type: file.type || "application/octet-stream",
          byte_size: file.size,
          asset_type: typeFor(file),
        });
        if (rowError) {
          await supabase.storage.from("workspace-assets").remove([path]);
          throw rowError;
        }
      }
      await loadAssets();
      setMessage("Files uploaded to your private asset library.");
    } catch (error) {
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

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div onClick={() => !busy && inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void uploadFiles(event.dataTransfer.files); }} className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center hover:border-emerald-300 hover:bg-emerald-50/40">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">{busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <UploadCloud className="h-6 w-6" />}</div>
          <p className="text-lg font-semibold text-slate-900">{busy ? "Uploading..." : "Drag and drop private assets"}</p>
          <p className="mt-1 text-sm text-slate-500">Images, logos, PDF, PPTX, and TXT up to 50 MB</p>
          <button type="button" className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Choose files</button>
          <input ref={inputRef} type="file" className="hidden" multiple accept="image/*,.pdf,.pptx,.txt" onChange={(event) => event.target.files && void uploadFiles(event.target.files)} />
        </div>
        {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {assets.length === 0 ? <div className="px-6 py-12 text-center text-sm text-slate-500">No saved assets yet.</div> : (
          <div className="divide-y divide-slate-200">
            {assets.map((asset) => (
              <div key={asset.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-slate-600">{asset.signedUrl && asset.mime_type.startsWith("image/") ? <img src={asset.signedUrl} alt="" className="h-full w-full object-cover" /> : asset.mime_type.startsWith("image/") ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-800">{asset.file_name}</p><p className="mt-0.5 text-xs text-slate-500">{asset.asset_type} · {formatBytes(asset.byte_size)}</p></div>
                <button type="button" onClick={() => useInDeck(asset)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"><Link2 className="h-3.5 w-3.5" /> Use in deck</button>
                <button type="button" disabled={busy} onClick={() => void removeAsset(asset)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
