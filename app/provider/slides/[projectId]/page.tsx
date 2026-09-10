import SlideStudio from "@/components/provider/SlideStudio";

export function generateStaticParams() {
  return [{ projectId: "default" }];
}

export default function SlidesProjectPage() {
  return <SlideStudio />;
}
