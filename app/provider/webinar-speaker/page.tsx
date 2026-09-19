import SpeakerPortalView from "@/components/provider/SpeakerPortalView";

export default function SpeakerPortalPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Event Ops
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Webinar Speaker Portal
        </h1>
      </header>

      <SpeakerPortalView />
    </div>
  );
}
