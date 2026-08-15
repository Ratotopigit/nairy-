import AstroAIChat from "@/components/provider/AstroAIChat";

export default function AstroAIPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">
            Provider Workspace
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
            Astro AI
          </h1>
        </div>
      </div>

      <AstroAIChat />
    </div>
  );
}
