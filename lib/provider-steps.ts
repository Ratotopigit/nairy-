import { FileText, Layers3, MessageSquare, UploadCloud, Video, type LucideIcon } from "lucide-react";

export type ProviderStep = {
  number: number;
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

/** The order people work through the app. The side menu and home page both read this list. */
export const PROVIDER_STEPS: ProviderStep[] = [
  {
    number: 1,
    href: "/provider/webinars",
    label: "Your Webinar",
    description: "Name it, choose free or paid and live or recorded, then make your sign-up and thank-you pages.",
    icon: Video,
  },
  {
    number: 2,
    href: "/provider/webinar-upload",
    label: "Brand & Files",
    description: "Add your logos, photos, briefs and PDFs so the AI knows your business.",
    icon: UploadCloud,
  },
  {
    number: 3,
    href: "/provider/webinar-chat",
    label: "AI Chat",
    description: "Map your ideal buyer and plan your webinar with the AI.",
    icon: MessageSquare,
  },
  {
    number: 4,
    href: "/provider/webinar-offer",
    label: "Your Offer",
    description: "Turn your plan into a clear offer.",
    icon: Layers3,
  },
  {
    number: 5,
    href: "/provider/webinar-content",
    label: "Your Slides",
    description: "Create and edit your presentation.",
    icon: FileText,
  },
];
