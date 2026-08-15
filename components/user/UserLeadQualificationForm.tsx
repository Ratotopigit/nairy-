"use client";

import React, { useState } from "react";
import { 
  Menu, 
  MessageSquare, 
  BarChart2, 
  Calendar, 
  Clock, 
  CheckCircle, 
  Lock 
} from "lucide-react";

interface QualificationData {
  offerType: string;
  revenueRange: string;
  audienceSize: string;
  budgetRange: string;
  timeline: string;
}

interface UserLeadQualificationFormProps {
  onSubmit: (data: QualificationData) => void;
}

export default function UserLeadQualificationForm({ onSubmit }: UserLeadQualificationFormProps) {
  const [formData, setFormData] = useState<QualificationData>({
    offerType: "",
    revenueRange: "",
    audienceSize: "",
    budgetRange: "",
    timeline: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-medium text-slate-600">100-Point Lead Qualification</h3>
      <p className="text-xs text-slate-500 mb-4">
        Help us determine your fast-track eligibility
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Offer Type
          </label>
          <select
            value={formData.offerType}
            onChange={(e) => setFormData((prev) => ({ ...prev, offerType: e.target.value }))}
            className="w-full bg-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">Select offer type</option>
            <option value="High-Value Coaching">High-Value Coaching</option>
            <option value="Mastermind">Mastermind</option>
            <option value="Group Program">Group Program</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Revenue Range
          </label>
          <select
            value={formData.revenueRange}
            onChange={(e) => setFormData((prev) => ({ ...prev, revenueRange: e.target.value }))}
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
            value={formData.audienceSize}
            onChange={(e) => setFormData((prev) => ({ ...prev, audienceSize: e.target.value }))}
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
            value={formData.budgetRange}
            onChange={(e) => setFormData((prev) => ({ ...prev, budgetRange: e.target.value }))}
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
            value={formData.timeline}
            onChange={(e) => setFormData((prev) => ({ ...prev, timeline: e.target.value }))}
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
            onClick={() => {}}
            className="flex-1 bg-slate-100 rounded-lg py-2.5 text-sm hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}