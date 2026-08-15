"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import {
  ChevronRight,
  Clock3,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const filters = [
  "All specialties",
  "Brand strategy",
  "Video production",
  "Audience research",
  "Launch planning",
];

const providers = [
  {
    name: "Harper Ellis",
    specialty: "Brand Strategy",
    summary:
      "Helps founders clarify positioning, sharpen messaging, and build a premium narrative that converts.",
    location: "San Francisco, CA",
    availability: "Available today",
    rating: 4.9,
    experience: "9 yrs",
    accent: "from-[#82A893] via-[#DDEEE4] to-[#F7FBF9] dark:from-[#2d564b] dark:via-[#17392f] dark:to-[#12251d]",
    initials: "HE",
  },
  {
    name: "Mila Chen",
    specialty: "Audience Research",
    summary:
      "Translates customer signals into sharper buyer segments and higher-intent content strategy.",
    location: "New York, NY",
    availability: "Next opening Tue",
    rating: 4.8,
    experience: "7 yrs",
    accent: "from-[#CEDCC6] via-[#EFF7F0] to-[#F7FBF9] dark:from-[#3a523b] dark:via-[#1e3322] dark:to-[#12251d]",
    initials: "MC",
  },
  {
    name: "Owen Park",
    specialty: "Video Production",
    summary:
      "Builds conversion-focused launch films and executive storytelling systems for SaaS teams.",
    location: "Austin, TX",
    availability: "Open this week",
    rating: 5.0,
    experience: "11 yrs",
    accent: "from-[#9CB7A8] via-[#E8F6F1] to-[#F7FBF9] dark:from-[#254636] dark:via-[#162d22] dark:to-[#12251d]",
    initials: "OP",
  },
];

export default function ProviderDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("All specialties");
  const [hoveredIndex, setHoveredIndex] = useState(null as number | null);

  const filteredProviders = useMemo(() => {
    return providers.filter((provider) => {
      const matchesSpecialty =
        selectedSpecialty === "All specialties" ||
        provider.specialty.toLowerCase() === selectedSpecialty.toLowerCase();

      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        query === "" ||
        provider.name.toLowerCase().includes(query) ||
        provider.specialty.toLowerCase().includes(query) ||
        provider.summary.toLowerCase().includes(query) ||
        provider.location.toLowerCase().includes(query);

      return matchesSpecialty && matchesSearch;
    });
  }, [searchQuery, selectedSpecialty]);

  return (
    <div className="relative">
      {/* 
        ========================================================================
        DIRECTORY SECTION (Search, Filters, Cards) — Top-level content
        ========================================================================
      */}
      <section id="directory" className="relative pt-10 pb-8">
        <div className="mb-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#587166] dark:text-[#90a89c]">
            Provider directory
          </p>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[#183d30] dark:text-[#ebf7f1] sm:text-4xl">
              Explore our providers
            </h2>
            <div className="inline-flex items-center rounded-full border border-[#bfd8c8]/40 bg-[#edf8f1]/80 dark:border-[#2d564b]/40 dark:bg-[#122a1e]/40 px-3.5 py-1.5 text-xs font-semibold text-[#183d30] dark:text-[#40916c] w-fit">
              {filteredProviders.length} {filteredProviders.length === 1 ? "specialist" : "specialists"}
            </div>
          </div>
        </div>

        {/* Search & Filters block */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative block w-full lg:max-w-[480px]">
            <Search className="pointer-events-none absolute left-4.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#587166] dark:text-[#90a89c]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search providers..."
              className="w-full rounded-2xl border border-[#bfd8c8]/60 bg-[#f4faf6]/50 dark:border-[#204437]/50 dark:bg-[#12251d]/40 py-3.5 pl-12 pr-4 text-sm text-[#183d30] dark:text-[#ebf7f1] placeholder-[#587166]/70 dark:placeholder-[#90a89c]/60 outline-none transition-all duration-300 focus:border-[#183d30] dark:focus:border-[#40916c] focus:bg-white dark:focus:bg-[#12251d]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-2 rounded-xl border border-[#bfd8c8]/50 bg-white/40 dark:border-[#2d564b]/40 dark:bg-[#12251d]/30 px-3.5 py-2 text-sm text-[#587166] dark:text-[#90a89c]">
              <SlidersHorizontal className="h-4 w-4 text-[#183d30] dark:text-[#40916c]" />
              <span>Filter:</span>
            </div>

            {filters.map((filter) => {
              const isSelected = selectedSpecialty === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setSelectedSpecialty(filter)}
                  className={`rounded-full border px-4.5 py-2 text-sm font-medium transition-all duration-200 ${isSelected
                      ? "border-[#183d30] bg-[#183d30] text-white dark:border-[#40916c] dark:bg-[#40916c]"
                      : "border-[#bfd8c8]/40 bg-transparent text-[#587166] hover:bg-[#edf8f1]/50 dark:border-[#2d564b]/40 dark:text-[#90a89c] dark:hover:bg-[#17392f]/40"
                    }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>

        {/* Providers grid layout */}
        <div className="mt-12">
          <AnimatePresence mode="popLayout">
            {filteredProviders.length > 0 ? (
              <motion.div
                layout
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {filteredProviders.map((provider, index) => {
                  // Calculate transform based on hover state
                  const isHovered = hoveredIndex === index;
                  const getCardTransform = () => {
                    if (hoveredIndex === null) return "translateY(0px) translateX(0px) scale(1)";
                    if (isHovered) return "translateY(-16px) translateX(0px) scale(1.03)";
                    // Push siblings away from the hovered card
                    const diff = index - hoveredIndex;
                    const shiftX = diff < 0 ? -18 : 18;
                    return `translateY(0px) translateX(${shiftX}px) scale(0.97)`;
                  };

                  return (
                    <motion.article
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                      key={provider.name}
                      onMouseEnter={() => setHoveredIndex(index)}
                      style={{
                        transform: getCardTransform(),
                        transition: "transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.45s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.3s",
                        boxShadow: isHovered ? "0 20px 50px rgba(24,61,48,0.10)" : "none",
                        zIndex: isHovered ? 10 : 1,
                      }}
                      className={`group flex flex-col justify-between overflow-hidden rounded-[28px] border bg-[#f4faf6]/40 dark:bg-[#12251d]/35 p-3.5 ${
                        isHovered
                          ? "border-[#183d30]/30 dark:border-[#40916c]/30"
                          : "border-[#bfd8c8]/40 dark:border-[#2d564b]/30"
                      }`}
                    >
                      <div>
                        {/* Accent color background top area */}
                        <div
                          className={`relative overflow-hidden rounded-[20px] bg-gradient-to-br ${provider.accent} transition-transform duration-500`}
                        >
                          {/* Background subtle decoration */}
                          <div className="absolute right-[-20px] top-[-20px] h-24 w-24 rounded-full bg-white/20 blur-xl pointer-events-none" />

                          <div className="flex h-44 items-end justify-between p-4.5">
                            {/* Profile initials */}
                            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/80 bg-white/80 dark:border-[#2d564b]/80 dark:bg-[#12251d]/80 text-[1.1rem] font-bold text-[#183d30] dark:text-[#ebf7f1] shadow-[0_4px_12px_rgba(24,61,48,0.04)] transition-transform duration-300 group-hover:scale-105">
                              {provider.initials}
                            </div>

                            {/* Rating pill */}
                            <div className="inline-flex items-center gap-1 rounded-full border border-white/80 bg-white/90 dark:border-[#2d564b]/80 dark:bg-[#12251d]/90 px-2.5 py-1 text-xs font-semibold text-[#183d30] dark:text-[#ebf7f1]">
                              <Star className="h-3.5 w-3.5 fill-[#183d30] text-[#183d30] dark:fill-[#40916c] dark:text-[#40916c]" />
                              {provider.rating}
                            </div>
                          </div>
                        </div>

                        {/* Content details */}
                        <div className="px-2 pb-1 pt-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-xl font-bold tracking-tight text-[#183d30] dark:text-[#ebf7f1] transition-colors group-hover:text-[#183d30]">
                                {provider.name}
                              </h3>
                              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-[#587166] dark:text-[#90a89c]">
                                {provider.specialty}
                              </p>
                            </div>
                            <div className="rounded-full bg-[#bfd8c8]/25 dark:bg-[#40916c]/25 px-2.5 py-1 text-[11px] font-semibold text-[#183d30] dark:text-[#ebf7f1] shrink-0">
                              {provider.experience}
                            </div>
                          </div>

                          <p className="mt-4 text-[14px] leading-relaxed text-[#4d6158] dark:text-[#a0b3a8]">
                            {provider.summary}
                          </p>
                        </div>
                      </div>

                      {/* Footer values */}
                      <div className="px-2 pt-4 mt-6 border-t border-[#bfd8c8]/20 dark:border-[#2d564b]/20 text-xs text-[#587166] dark:text-[#90a89c] space-y-3.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-[#183d30] dark:text-[#40916c]" />
                            <span>{provider.location}</span>
                          </div>
                          <span className="font-medium text-[#183d30] dark:text-[#40916c]">
                            {provider.availability}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <div className="flex items-center gap-1.5">
                            <Clock3 className="h-4 w-4 text-[#183d30] dark:text-[#40916c]" />
                            <span>Response &lt; 2h</span>
                          </div>
                          <Link
                            href={`/provider/astro-ai?provider=${provider.name.toLowerCase().replace(" ", "-")}`}
                            className="inline-flex items-center gap-1 font-semibold text-[#183d30] dark:text-[#ebf7f1]"
                          >
                            View profile
                            <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                          </Link>
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </motion.div>
            ) : (
              /* Premium Empty State */
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20 px-6 rounded-[28px] border border-[#bfd8c8]/30 bg-[#f4faf6]/20 dark:border-[#2d564b]/20 dark:bg-[#12251d]/10 text-center"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edf8f1] dark:bg-[#17392f] text-[#183d30] dark:text-[#40916c] mb-5">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-[#183d30] dark:text-[#ebf7f1]">
                  No matching providers found
                </h3>
                <p className="mt-2 max-w-sm text-sm text-[#4d6158] dark:text-[#90a89c] leading-relaxed">
                  We couldn't find any specialists matching your current search or specialty filters. Try clearing your search query or choosing another specialty.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedSpecialty("All specialties");
                  }}
                  className="mt-6 rounded-full bg-[#183d30] dark:bg-[#40916c] px-6 py-2.5 text-xs font-semibold text-white transition-all duration-200 hover:bg-[#123a2d] dark:hover:bg-[#317254]"
                >
                  Clear search and filters
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}

