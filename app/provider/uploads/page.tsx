import UploadsManager from "@/components/provider/UploadsManager";

export default function UploadsPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">
            Brand Assets
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
            Logos, Photos, and Source Files
          </h1>
        </div>
      </div>

      <UploadsManager />
    </div>
  );
}
