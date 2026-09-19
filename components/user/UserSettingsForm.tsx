"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, MapPin, Briefcase, Save, Check, AlertCircle } from "lucide-react";

interface UserSettingsFormProps {
  initialData: {
    fullName: string;
    email: string;
    role: string;
    location: string;
    bio: string;
  };
  onSave?: (data: UserSettingsFormProps["initialData"]) => Promise<void> | void;
}

export default function UserSettingsForm({ initialData, onSave }: UserSettingsFormProps) {
  const [formData, setFormData] = useState(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<Partial<typeof formData>>({});

  const roles = ["Provider Admin", "Provider Manager", "Provider Staff", "Viewer"];
  const locations = ["San Francisco, CA", "New York, NY", "Austin, TX", "Seattle, WA", "Remote"];

  const validateForm = () => {
    const newErrors: Partial<typeof formData> = {};
    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Invalid email format";
    if (!formData.role) newErrors.role = "Role is required";
    if (!formData.location.trim()) newErrors.location = "Location is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      await onSave?.(formData);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch {
      // Error handled by form validation
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
      className="bg-card rounded-3xl border border-border p-6 lg:p-8 w-full"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Profile Settings</h3>
        {showSuccess && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1.5 text-primary text-sm font-medium"
          >
            <Check className="w-4 h-4" />
            Saved
          </motion.span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="fullName" className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Full Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
              <User className="w-4 h-4" />
            </div>
            <input
              id="fullName"
              type="text"
              value={formData.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              placeholder="John Doe"
              className={`w-full pl-10 pr-4 py-2.5 bg-muted border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary focus:bg-card transition-all ${
                errors.fullName ? "border-accent focus:border-accent focus:ring-accent/20" : "border-border"
              }`}
              aria-invalid={errors.fullName ? "true" : "false"}
              aria-describedby={errors.fullName ? "fullName-error" : undefined}
            />
          </div>
          {errors.fullName && (
            <p id="fullName-error" className="mt-1.5 text-xs text-accent flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.fullName}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="name@company.com"
              className={`w-full pl-10 pr-4 py-2.5 bg-muted border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary focus:bg-card transition-all ${
                errors.email ? "border-accent focus:border-accent focus:ring-accent/20" : "border-border"
              }`}
              aria-invalid={errors.email ? "true" : "false"}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
          </div>
          {errors.email && (
            <p id="email-error" className="mt-1.5 text-xs text-accent flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="role" className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Workspace Role
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
              <Briefcase className="w-4 h-4" />
            </div>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => handleChange("role", e.target.value)}
              className={`w-full pl-10 pr-10 py-2.5 bg-muted border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary focus:bg-card transition-all appearance-none bg-no-repeat bg-right ${
                errors.role ? "border-accent focus:border-accent focus:ring-accent/20" : "border-border"
              }`}
              aria-invalid={errors.role ? "true" : "false"}
            >
              <option value="">Select a role</option>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-muted-foreground">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {errors.role && (
            <p className="mt-1.5 text-xs text-accent flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.role}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="location" className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Location
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
              <MapPin className="w-4 h-4" />
            </div>
            <input
              id="location"
              type="text"
              value={formData.location}
              onChange={(e) => handleChange("location", e.target.value)}
              placeholder="San Francisco, CA"
              list="locations"
              className={`w-full pl-10 pr-4 py-2.5 bg-muted border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary focus:bg-card transition-all ${
                errors.location ? "border-accent focus:border-accent focus:ring-accent/20" : "border-border"
              }`}
              aria-invalid={errors.location ? "true" : "false"}
              aria-describedby={errors.location ? "location-error" : undefined}
            />
          </div>
          <datalist id="locations">
            {locations.map((loc) => (
              <option key={loc} value={loc} />
            ))}
          </datalist>
          {errors.location && (
            <p id="location-error" className="mt-1.5 text-xs text-accent flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.location}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="bio" className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Bio
          </label>
          <textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => handleChange("bio", e.target.value)}
            placeholder="Tell us about yourself..."
            rows={4}
            className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary focus:bg-card transition-all resize-none"
          />
          <p className="mt-1.5 text-xs text-muted-foreground text-right">Max 500 characters</p>
        </div>

        <motion.button
          type="submit"
          disabled={isSaving}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3 px-4 bg-primary text-primary-foreground hover:opacity-90 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-70"
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </>
          )}
        </motion.button>
      </form>
    </motion.div>
  );
}