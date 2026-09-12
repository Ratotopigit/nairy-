import SpeakerPortalView from "@/components/provider/SpeakerPortalView";

export default function SpeakerPortalPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">
            Event Ops
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
            Webinar Speakar Portal
          </h1>
        </div>
      </div>

      <SpeakerPortalView />
    </div>
  );
}
