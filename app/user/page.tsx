"use client";

import { useState } from "react";
import UserVideoPlayer from "@/components/user/UserVideoPlayer";
import { Clock, CheckCircle, Calendar, X } from "lucide-react";

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
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-border px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <span className="text-lg font-bold uppercase tracking-[-0.01em] text-foreground">
            WebinarKit
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:inline">
            45 min remaining
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={openModal}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Apply for Fast-Track
          </button>
          <button
            onClick={closeModal}
            className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Exit session"
            type="button"
          >
            <X className="size-4" />
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
          <div className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm flex items-center justify-center">
            <div
              className={`relative bg-card rounded-3xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto transition-all duration-300 ${
                isModalOpen
                  ? "transform-scale-1 opacity-100"
                  : "transform-scale-95 opacity-0"
              }`}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h3 className="text-base font-semibold tracking-tight text-foreground">
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
                  className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                      <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
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
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
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
                      <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
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
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
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
                      <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
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
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
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
                      <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
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
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                      >
                        <option value="">Select budget range</option>
                        <option value="50,000+">50,000+</option>
                        <option value="20,000-50,000">20,000-50,000</option>
                        <option value="10,000-20,000">10,000-20,000</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
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
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
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
                        className="flex-1 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                      >
                        Calculate Score
                      </button>
                      <button
                        type="button"
                        onClick={closeModal}
                        className="flex-1 rounded-full border border-border bg-card py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {modalStep === "booking" && (
                  <div className="space-y-4">
                    <p className="text-primary font-medium">
                      Congratulations! Score {qualificationScore}/100 - You
                      qualify for fast-track!
                    </p>
                    <div className="bg-primary/10 rounded-2xl border border-primary p-4">
                      <Calendar className="w-5 h-5 text-primary mb-3 block" />
                      <p className="text-sm text-muted-foreground">
                        1-on-1 Zoom consultation booked automatically. Calendar
                        hold confirmed for 30-min discovery call.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        A link will be sent to your email within 24 hours.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="w-full rounded-full border border-border bg-card py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                    >
                      Continue to Next Session
                    </button>
                  </div>
                )}

                {modalStep === "checklist" && (
                  <div className="space-y-4">
                    <p className="text-ochre font-medium">
                      Strong score! {qualificationScore}/100 - You&apos;re
                      consultation-ready.
                    </p>
                    <div className="bg-muted rounded-2xl border border-ochre p-4">
                      <CheckCircle className="w-5 h-5 text-ochre mb-3 block" />
                      <p className="text-sm text-muted-foreground">
                        Complete the consultation readiness checklist below.
                      </p>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        <li>Review your business goals and objectives</li>
                        <li>Prepare your revenue metrics and KPIs</li>
                        <li>Define your ideal client profile</li>
                      </ul>
                    </div>
                    <button
                      type="button"
                      className="w-full rounded-full border border-border bg-card py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                    >
                      Mark Checklist Complete
                    </button>
                  </div>
                )}

                {modalStep === "nurture" && (
                  <div className="space-y-4">
                    <p className="text-accent font-medium">
                      Keep nurturing. {qualificationScore}/100 - Stay engaged
                      for future opportunities.
                    </p>
                    <div className="bg-accent-soft rounded-2xl border border-accent p-4">
                      <Clock className="w-5 h-5 text-accent mb-3 block" />
                      <p className="text-sm text-muted-foreground">
                        You&apos;ll receive a nurture sequence with future
                        masterclass announcements and offers.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Updated {new Date().toLocaleDateString()}.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="w-full rounded-full border border-border bg-card py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
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
