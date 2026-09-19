import WebinarChat from "@/components/provider/WebinarChat";

export function generateStaticParams() {
  return [{ chatId: "default" }];
}

export default function WebinarChatDeepLinkPage() {
  return <WebinarChat />;
}
