import SlideStudio from "@/components/provider/SlideStudio";

export default function SlidesPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">
            Creative Studio
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
            Slides
          </h1>
        </div>
      </div>

      <SlideStudio />
    </div>
  );
}
