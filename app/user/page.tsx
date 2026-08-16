"use client";

import { useState } from "react";
import UserVideoPlayer from "@/components/user/UserVideoPlayer";
import { Play, Clock, CheckCircle, Calendar, X } from "lucide-react";

const videoSrc = "/assets/masterclass-sample.mp4";

type ModalStep = "qualification" | "booking" | "checklist" | "nurture";

export default function UserPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>("qualification");
  const [qualificationScore, setQualificationScore] = useState<number | null>(
    null,
  );
  const [formData, setFormData] = useState({
    offerType: "",
    revenueRange: "",
    audienceAssets: "",
    budgetRange: "",
    timeline: "",
  });

  const openModal = () => setIsModalOpen(true);

  const closeModal = () => {
    setIsModalOpen(false);
    setModalStep("qualification");
    setFormData({
      offerType: "",
      revenueRange: "",
      audienceAssets: "",
      budgetRange: "",
      timeline: "",
    });
    setQualificationScore(null);
  };

  const calculateScore = (): number => {
    let score = 0;

    if (formData.offerType === "High-Value Coaching") score += 25;
    else if (formData.offerType === "Mastermind") score += 20;
    else if (formData.offerType === "Group Program") score += 15;
    else score += 10;

    if (formData.revenueRange === "7-figure ($1M+)") score += 25;
    else if (formData.revenueRange === "6-figure ($500k-999k)") score += 20;
    else if (formData.revenueRange === "5-figure ($150k-499k)") score += 15;
    else score += 10;

    if (formData.audienceAssets === "5,000+ subscribers/followers") score += 20;
    else if (formData.audienceAssets === "1,000-5,000") score += 15;
    else if (formData.audienceAssets === "500-1,000") score += 10;
    else score += 5;

    if (formData.budgetRange === "50,000+") score += 20;
    else if (formData.budgetRange === "20,000-50,000") score += 15;
    else if (formData.budgetRange === "10,000-20,000") score += 10;
    else score += 5;

    if (formData.timeline === "Within 30 days") score += 15;
    else if (formData.timeline === "Within 90 days") score += 10;
    else if (formData.timeline === "Within 6 months") score += 5;

    return Math.min(Math.max(score, 0), 100);
  };

  const determineStep = (score: number): ModalStep => {
    if (score >= 85) return "booking";
    if (score >= 70) return "checklist";
    return "nurture";
  };

  const handleSubmit = () => {
    const score = calculateScore();
    setQualificationScore(score);
    setModalStep(determineStep(score));
  };

  return (
    <div className="min-h-screen w-full relative">
      <header className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <X className="w-6 h-6 text-slate-400 hover:text-slate-600 transition-colors" />
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
              AstroCraft
            </span>
          </div>
          <span className="text-sm font-medium text-slate-500">
            Session Timer: 45 min remaining
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openModal}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Apply for Fast-Track
          </button>
          <button
            onClick={closeModal}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
            aria-label="Exit session"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="relative z-10 min-h-screen w-full flex">
        <div className="flex-1 flex justify-center items-center">
          <UserVideoPlayer
            videoSrc={videoSrc}
            onOpenQualificationForm={openModal}
          />
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
            <div
              className={`relative bg-white rounded-2xl w-full max-w-md mx-4 transition-all duration-300 ${
                isModalOpen
                  ? "transform-scale-1 opacity-100"
                  : "transform-scale-95 opacity-0"
              }`}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-900">
                  {modalStep === "qualification"
                    ? "100-Point Lead Qualification Engine"
                    : modalStep === "booking"
                      ? "Fast-Track Qualified!"
                      : modalStep === "checklist"
                        ? "Consultation Ready"
                        : "Nurture Sequence"}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-slate-500 hover:text-slate-700 transition-colors"
                  aria-label="Close modal"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {modalStep === "qualification" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSubmit();
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Offer Type
                      </label>
                      <select
                        value={formData.offerType}
                        onChange={(e) =>
                          setFormData((prev) => ({
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
                        Current Revenue
                      </label>
                      <select
                        value={formData.revenueRange}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            revenueRange: e.target.value,
                          }))
                        }
                        className="w-full bg-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="">Select revenue range</option>
                        <option value="7-figure ($1M+)">7-figure ($1M+)</option>
                        <option value="6-figure ($500k-999k)">
                          6-figure ($500k-999k)
                        </option>
                        <option value="5-figure ($150k-499k)">
                          5-figure ($150k-499k)
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Audience Assets
                      </label>
                      <select
                        value={formData.audienceAssets}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            audienceAssets: e.target.value,
                          }))
                        }
                        className="w-full bg-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="">Select audience size</option>
                        <option value="5,000+ subscribers/followers">
                          5,000+ subscribers/followers
                        </option>
                        <option value="1,000-5,000">1,000-5,000</option>
                        <option value="500-1,000">500-1,000</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Budget Range
                      </label>
                      <select
                        value={formData.budgetRange}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            budgetRange: e.target.value,
                          }))
                        }
                        className="w-full bg-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="">Select budget range</option>
                        <option value="50,000+">50,000+</option>
                        <option value="20,000-50,000">20,000-50,000</option>
                        <option value="10,000-20,000">10,000-20,000</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Timeline
                      </label>
                      <select
                        value={formData.timeline}
                        onChange={(e) =>
                          setFormData((prev) => ({
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
                        Calculate Score
                      </button>
                      <button
                        type="button"
                        onClick={closeModal}
                        className="flex-1 bg-slate-100 rounded-lg py-2.5 text-sm hover:bg-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {modalStep === "booking" && (
                  <div className="space-y-4">
                    <p className="text-emerald-600 font-medium">
                      Congratulations! Score {qualificationScore}/100 - You
                      qualify for fast-track!
                    </p>
                    <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                      <Calendar className="w-5 h-5 text-emerald-600 mb-3 block" />
                      <p className="text-sm text-slate-600">
                        1-on-1 Zoom consultation booked automatically. Calendar
                        hold confirmed for 30-min discovery call.
                      </p>
                      <p className="text-xs text-slate-500">
                        A link will be sent to your email within 24 hours.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="w-full bg-slate-100 rounded-lg py-2.5 text-sm hover:bg-slate-200 transition-colors"
                    >
                      Continue to Next Session
                    </button>
                  </div>
                )}

                {modalStep === "checklist" && (
                  <div className="space-y-4">
                    <p className="text-amber-600 font-medium">
                      Strong score! {qualificationScore}/100 - You&apos;re
                      consultation-ready.
                    </p>
                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                      <CheckCircle className="w-5 h-5 text-amber-600 mb-3 block" />
                      <p className="text-sm text-slate-600">
                        Complete the consultation readiness checklist below.
                      </p>
                      <ul className="list-disc list-inside text-sm text-slate-500 space-y-1">
                        <li>Review your business goals and objectives</li>
                        <li>Prepare your revenue metrics and KPIs</li>
                        <li>Define your ideal client profile</li>
                      </ul>
                    </div>
                    <button
                      type="button"
                      className="w-full bg-slate-100 rounded-lg py-2.5 text-sm hover:bg-slate-200 transition-colors"
                    >
                      Mark Checklist Complete
                    </button>
                  </div>
                )}

                {modalStep === "nurture" && (
                  <div className="space-y-4">
                    <p className="text-red-600 font-medium">
                      Keep nurturing. {qualificationScore}/100 - Stay engaged
                      for future opportunities.
                    </p>
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <Clock className="w-5 h-5 text-red-600 mb-3 block" />
                      <p className="text-sm text-slate-600">
                        You&apos;ll receive a nurture sequence with future
                        masterclass announcements and offers.
                      </p>
                      <p className="text-xs text-slate-500">
                        Updated {new Date().toLocaleDateString()}.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="w-full bg-slate-100 rounded-lg py-2.5 text-sm hover:bg-slate-200 transition-colors"
                    >
                      Stay Updated
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
