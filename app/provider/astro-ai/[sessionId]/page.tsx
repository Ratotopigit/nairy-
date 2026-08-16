import AstroAIChat from "@/components/provider/AstroAIChat";

export function generateStaticParams() {
  return [{ sessionId: "default" }];
}

export default function AstroAISessionPage() {
  return <AstroAIChat />;
}

