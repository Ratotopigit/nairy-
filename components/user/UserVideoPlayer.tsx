"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Play,
  MessageSquare,
  BarChart2,
  Calendar,
  Clock,
  CheckCircle,
  Lock,
} from "lucide-react";

interface QualificationFormState {
  offerType: string;
  revenueRange: string;
  audienceSize: string;
  budgetRange: string;
  timeline: string;
}

interface UserVideoPlayerProps {
  videoSrc: string;
  onOpenQualificationForm?: () => void;
}

const chapterMarkers = [
  { id: 1, title: "Authority & Outcomes", time: "00:00" },
  { id: 2, title: "Problem & Cost of Inaction", time: "05:00" },
  { id: 3, title: "The 5 Belief Stack", time: "15:00" },
  { id: 4, title: "The 5-Step Method", time: "35:00" },
  { id: 5, title: "Fast-Track Offer & Qualification", time: "55:00" },
];

export default function UserVideoPlayer({
  videoSrc,
  onOpenQualificationForm,
}: UserVideoPlayerProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [sidePanelView, setSidePanelView] = useState<
    "chat-polls" | "polls" | "qualification" | "routing"
  >("chat-polls");
  const [qualificationData, setQualificationData] =
    useState<QualificationFormState>({
      offerType: "",
      revenueRange: "",
      audienceSize: "",
      budgetRange: "",
      timeline: "",
    });
  const [score, setScore] = useState(0);
  const [routingResult, setRoutingResult] = useState<
    "booking" | "checklist" | "nurture" | null
  >(null);

  useEffect(() => {
    if (!playing) return;

    const interval = window.setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= 7200) {
          setPlaying(false);
          window.clearInterval(interval);
          return 7200;
        }
        return prev + 10;
      });
    }, 100);

    return () => window.clearInterval(interval);
  }, [playing]);

  const calculateScore = (): number => {
    let total = 0;

    if (qualificationData.offerType === "High-Value Coaching") total += 25;
    else if (qualificationData.offerType === "Mastermind") total += 20;
    else if (qualificationData.offerType === "Group Program") total += 15;
    else total += 10;

    if (qualificationData.revenueRange === "7-figure") total += 20;
    else if (qualificationData.revenueRange === "6-figure") total += 15;
    else if (qualificationData.revenueRange === "5-figure") total += 10;
    else total += 5;

    if (qualificationData.audienceSize === "5,000+") total += 20;
    else if (qualificationData.audienceSize === "1,000-5,000") total += 15;
    else if (qualificationData.audienceSize === "500-1,000") total += 10;
    else total += 5;

    if (qualificationData.budgetRange === "50,000+") total += 20;
    else if (qualificationData.budgetRange === "20,000-50,000") total += 15;
    else if (qualificationData.budgetRange === "5,000-20,000") total += 10;
    else total += 5;

    if (qualificationData.timeline === "Within 30 days") total += 15;
    else if (qualificationData.timeline === "Within 90 days") total += 10;
    else if (qualificationData.timeline === "Within 6 months") total += 5;

    return Math.min(Math.max(total, 0), 100);
  };

  const handleSubmitQualification = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextScore = calculateScore();
    setScore(nextScore);
    setRoutingResult(
      nextScore >= 85 ? "booking" : nextScore >= 70 ? "checklist" : "nurture",
    );
    setSidePanelView("routing");
  };

  return (
    <div className="min-h-screen w-full relative">
      <div className="relative z-10 flex min-h-[600px] w-full lg:min-h-[700px]">
        <div className="relative w-full lg:w-3/4 bg-slate-200 rounded-t-xl overflow-hidden">
          <video
            src={videoSrc}
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
            style={{ width: "100%", height: "100%" }}
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-3">
            <Play className="w-16 h-16 text-white" />
            <p className="text-white text-sm">Click to watch the masterclass</p>
          </div>

          <div className="absolute bottom-6 left-6 flex gap-2">
            <button
              type="button"
              className="p-3 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              aria-label="Play/Pause"
              onClick={() => setPlaying((prev) => !prev)}
            >
              <Play className="w-5 h-5 text-white" />
            </button>
            <button
              type="button"
              className="p-3 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              aria-label="Mute"
            >
              <Lock className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-white/80 border-t border-slate-200 px-6 py-3 flex flex-wrap gap-4">
            {chapterMarkers.map((chapter) => (
              <button
                key={chapter.id}
                type="button"
                onClick={() => setSelectedChapter(chapter.id)}
                className={`flex items-center gap-2 text-sm font-medium ${
                  selectedChapter === chapter.id
                    ? "text-emerald-600 border-b-2 border-emerald-600"
                    : "text-slate-500 hover:text-emerald-600 transition-colors"
                }`}
              >
                <span>{chapter.title}</span>
                <span
                  className={`w-2 h-2 rounded-full bg-emerald-600 transition-transform ${
                    selectedChapter === chapter.id ? "scale-100" : "scale-0"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <aside className="relative lg:w-1/4 bg-white border-l border-slate-200 flex flex-col h-fit">
          <div className="border-b border-slate-200 px-4 py-3 flex gap-2">
            <button
              type="button"
              onClick={() => setSidePanelView("chat-polls")}
              className={`flex-1 py-2 px-3 rounded-t-lg font-medium ${
                sidePanelView === "chat-polls"
                  ? "bg-emerald-50 text-emerald-600 border-b-2 border-emerald-600"
                  : "text-slate-500 hover:bg-emerald-50"
              }`}
            >
              Live Chat
            </button>
            <button
              type="button"
              onClick={() => setSidePanelView("polls")}
              className={`flex-1 py-2 px-3 rounded-t-lg font-medium ${
                sidePanelView === "polls"
                  ? "bg-emerald-50 text-emerald-600 border-b-2 border-emerald-600"
                  : "text-slate-500 hover:bg-emerald-50"
              }`}
            >
              Interactive Polls
            </button>
            <button
              type="button"
              onClick={() => {
                onOpenQualificationForm?.();
                setSidePanelView("qualification");
              }}
              className="flex-1 py-2 px-3 rounded-t-lg font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Apply for Fast-Track
            </button>
          </div>

          {sidePanelView === "chat-polls" && (
            <div className="flex-1 p-4 space-y-4">
              <h3 className="text-sm font-medium text-slate-600">Live Chat</h3>
              <div className="h-40 bg-slate-100 rounded-xl overflow-y-auto p-3">
                <p className="text-xs text-slate-400">
                  Welcome to the masterclass chat!
                </p>
                <p className="text-xs text-slate-400">
                  Share your biggest challenge with the offer.
                </p>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 bg-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Type your message..."
                  />
                  <button
                    type="button"
                    className="bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-emerald-700 transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {sidePanelView === "polls" && (
            <div className="flex-1 p-4 space-y-4">
              <h3 className="text-sm font-medium text-slate-600">
                Interactive Polls
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">
                    What&apos;s your biggest obstacle right now?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="flex-1 bg-slate-100 rounded-lg py-2 text-sm hover:bg-slate-200 transition-colors"
                    >
                      Technical hurdles
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">
                    How do you prefer to learn?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="flex-1 bg-slate-100 rounded-lg py-2 text-sm hover:bg-slate-200 transition-colors"
                    >
                      Video tutorials
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {sidePanelView === "qualification" && (
            <div className="flex-1 p-4 space-y-4">
              <h3 className="text-sm font-medium text-slate-600">
                100-Point Lead Qualification
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Help us determine your fast-track eligibility
              </p>

              <form onSubmit={handleSubmitQualification} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    Offer Type
                  </label>
                  <select
                    value={qualificationData.offerType}
                    onChange={(e) =>
                      setQualificationData((prev) => ({
                        ...prev,
                        offerType: e.target.value,
                      }))
                    }
                    className="w-full bg-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">Select offer type</option>
                    <option value="High-Value Coaching">
                      High-Value Coaching
                    </option>
                    <option value="Mastermind">Mastermind</option>
                    <option value="Group Program">Group Program</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    Revenue Range
                  </label>
                  <select
                    value={qualificationData.revenueRange}
                    onChange={(e) =>
                      setQualificationData((prev) => ({
                        ...prev,
                        revenueRange: e.target.value,
                      }))
                    }
                    className="w-full bg-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">Select revenue range</option>
                    <option value="5-figure">5-figure ($0-99k)</option>
                    <option value="6-figure">6-figure ($100k-999k)</option>
                    <option value="7-figure">7-figure ($1M+)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    Audience Size
                  </label>
                  <select
                    value={qualificationData.audienceSize}
                    onChange={(e) =>
                      setQualificationData((prev) => ({
                        ...prev,
                        audienceSize: e.target.value,
                      }))
                    }
                    className="w-full bg-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">Select audience size</option>
                    <option value="500-1,000">500-1,000</option>
                    <option value="1,000-5,000">1,000-5,000</option>
                    <option value="5,000+">5,000+</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    Budget Range
                  </label>
                  <select
                    value={qualificationData.budgetRange}
                    onChange={(e) =>
                      setQualificationData((prev) => ({
                        ...prev,
                        budgetRange: e.target.value,
                      }))
                    }
                    className="w-full bg-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">Select budget range</option>
                    <option value="5,000-20,000">5,000-20,000</option>
                    <option value="20,000-50,000">20,000-50,000</option>
                    <option value="50,000+">50,000+</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    Timeline
                  </label>
                  <select
                    value={qualificationData.timeline}
                    onChange={(e) =>
                      setQualificationData((prev) => ({
                        ...prev,
                        timeline: e.target.value,
                      }))
                    }
                    className="w-full bg-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">Select timeline</option>
                    <option value="Within 30 days">Within 30 days</option>
                    <option value="Within 90 days">Within 90 days</option>
                    <option value="Within 6 months">Within 6 months</option>
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 text-white rounded-lg py-2.5 font-medium hover:bg-emerald-700 transition-colors"
                  >
                    Submit Qualification
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidePanelView("chat-polls")}
                    className="flex-1 bg-slate-100 rounded-lg py-2.5 text-sm hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {sidePanelView === "routing" && routingResult && (
            <div className="flex-1 p-4 space-y-4">
              <h3 className="text-sm font-medium text-slate-600">
                Qualification Score: {score}/100
              </h3>

              {routingResult === "booking" && (
                <div>
                  <p className="text-emerald-600 font-medium">
                    Excellent score! You qualify for a 1-on-1 consultation.
                  </p>
                  <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                    <Calendar className="w-5 h-5 text-emerald-600 mb-3 block" />
                    <p className="text-sm text-slate-600">
                      Automatic calendar hold confirmed
                    </p>
                    <p className="text-xs text-slate-500">
                      A 30-minute discovery call will be scheduled within 24
                      hours.
                    </p>
                  </div>
                </div>
              )}

              {routingResult === "checklist" && (
                <div>
                  <p className="text-amber-600 font-medium">
                    Strong score! You&apos;re consultation-ready.
                  </p>
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <CheckCircle className="w-5 h-5 text-amber-600 mb-3 block" />
                    <p className="text-sm text-slate-600">
                      Complete the consultation readiness checklist
                    </p>
                    <ul className="list-disc list-inside text-sm text-slate-500 space-y-1">
                      <li>Review your business goals</li>
                      <li>Prepare your revenue metrics</li>
                      <li>Define your ideal client profile</li>
                    </ul>
                  </div>
                </div>
              )}

              {routingResult === "nurture" && (
                <div>
                  <p className="text-red-600 font-medium">Keep nurturing.</p>
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <Clock className="w-5 h-5 text-red-600 mb-3 block" />
                    <p className="text-sm text-slate-600">
                      You&apos;ll receive a nurture sequence
                    </p>
                    <p className="text-xs text-slate-500">
                      Stay updated on future masterclasses and offers.
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setSidePanelView("chat-polls")}
                className="w-full bg-slate-100 rounded-lg py-2.5 text-sm hover:bg-slate-200 transition-colors"
              >
                Back to Chat
              </button>
            </div>
          )}

          {sidePanelView === "chat-polls" && !playing && (
            <div className="flex-1 p-4 text-center">
              <Play className="w-12 h-12 mx-auto text-emerald-600 mb-3" />
              <p className="text-slate-500">
                Click play to start the masterclass
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
