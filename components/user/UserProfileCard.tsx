"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Camera, MapPin, Briefcase, CheckCircle } from "lucide-react";

interface UserProfileCardProps {
  name: string;
  email: string;
  role: string;
  location: string;
  bio: string;
  avatarUrl?: string;
  onPhotoChange?: (file: File) => void;
}

export default function UserProfileCard({
  name,
  email,
  role,
  location,
  bio,
  avatarUrl,
  onPhotoChange,
}: UserProfileCardProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handlePhotoClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onPhotoChange) {
      setIsUploading(true);
      onPhotoChange(file);
      setTimeout(() => setIsUploading(false), 1500);
    }
  };

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-card rounded-3xl border border-border p-6 lg:p-8 w-full"
    >
      <div className="flex flex-col items-center text-center mb-6">
        <div className="relative w-28 h-28 mb-4">
          <div className="absolute inset-0 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-4xl font-bold ring-4 ring-white ring-offset-2">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`${name}'s avatar`}
                className="w-full h-full rounded-full object-cover select-none pointer-events-none"
                draggable={false}
              />
            ) : (
              initials
            )}
          </div>
          <button
            onClick={handlePhotoClick}
            disabled={isUploading}
            className="absolute bottom-0 right-0 w-10 h-10 bg-card rounded-full flex items-center justify-center hover:bg-muted transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-border"
            aria-label="Upload profile photo"
          >
            {isUploading ? (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
            aria-hidden="true"
          />
        </div>

        <h2 className="text-2xl font-bold text-foreground">{name}</h2>
        <p className="text-muted-foreground text-sm mt-1">{email}</p>

        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
          <span className="w-2 h-2 bg-primary rounded-full" />
          {role}
        </div>
      </div>

      {bio && (
        <div className="mb-6 p-4 bg-muted rounded-xl border border-border">
          <p className="text-foreground text-sm leading-relaxed">{bio}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span>{location}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Briefcase className="w-4 h-4 text-muted-foreground" />
          <span>Provider Workspace</span>
        </div>
        <div className="flex items-center gap-2 text-primary text-sm font-medium">
          <CheckCircle className="w-4 h-4" />
          <span>Active</span>
        </div>
      </div>
    </motion.div>
  );
}