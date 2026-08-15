"use client";

import { useRef, useState } from "react";
import {
  CheckCircle2,
  FileText,
  Link2,
  Trash2,
  UploadCloud,
} from "lucide-react";

interface Asset {
  name: string;
  type: string;
  size: string;
  status: "Processed" | "Transcribing";
}

const initialAssets: Asset[] = [
  {
    name: "Masterclass_Intro.mp4",
    type: "Video",
    size: "185 MB",
    status: "Processed",
  },
  {
    name: "Creator_Deck_Final.pdf",
    type: "PDF",
    size: "4.8 MB",
    status: "Processed",
  },
  {
    name: "Speaker_Transcript.txt",
    type: "Transcript",
    size: "820 KB",
    status: "Transcribing",
  },
  {
    name: "Offer_Deck_Pitch.pptx",
    type: "PowerPoint",
    size: "6.2 MB",
    status: "Processed",
  },
];

export default function UploadsManager() {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleDelete = (name: string) => {
    setAssets((current) => current.filter((asset) => asset.name !== name));
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center transition-colors hover:border-emerald-300 hover:bg-emerald-50/40"
        >
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <UploadCloud className="h-6 w-6" />
          </div>
          <p className="text-lg font-semibold text-slate-900">
            Drag & drop files here
          </p>
          <p className="mt-1 text-sm text-slate-500">
            MP4, PDF, PPTX, TXT transcripts
          </p>
          <button
            type="button"
            className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
          >
            Choose Files
          </button>
          <input ref={inputRef} type="file" className="hidden" multiple />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
              <tr>
                <th className="px-5 py-4">Asset Name</th>
                <th className="px-5 py-4">File Type</th>
                <th className="px-5 py-4">Size</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-sm text-slate-700">
              {assets.map((asset) => (
                <tr key={asset.name} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <FileText className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-slate-800">
                        {asset.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">{asset.type}</td>
                  <td className="px-5 py-4">{asset.size}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${
                        asset.status === "Processed"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {asset.status === "Processed" ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                      )}
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        Link to Deck
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(asset.name)}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
