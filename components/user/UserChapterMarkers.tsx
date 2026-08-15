"use client";

import { useEffect, useState } from "react";

interface ChapterMarker {
  id: number;
  title: string;
  time: string;
  videoTime: number;
}

interface UserChapterMarkersProps {
  currentTime?: number;
  onChapterSelect: (chapterId: number) => void;
}

const defaultChapters: ChapterMarker[] = [
  { id: 1, title: "Authority & Outcomes", time: "00:00", videoTime: 0 },
  { id: 2, title: "Problem & Cost of Inaction", time: "05:00", videoTime: 300 },
  { id: 3, title: "The 5 Belief Stack", time: "15:00", videoTime: 900 },
  { id: 4, title: "The 5-Step Method", time: "35:00", videoTime: 2100 },
  {
    id: 5,
    title: "Fast-Track Offer & Qualification",
    time: "55:00",
    videoTime: 3300,
  },
];

export default function UserChapterMarkers({
  currentTime,
  onChapterSelect,
}: UserChapterMarkersProps) {
  const [highlightedChapter, setHighlightedChapter] = useState(1);

  useEffect(() => {
    if (currentTime === undefined) return;

    let highlighted = 1;
    if (currentTime >= 3300) highlighted = 5;
    else if (currentTime >= 2100) highlighted = 4;
    else if (currentTime >= 900) highlighted = 3;
    else if (currentTime >= 300) highlighted = 2;

    setHighlightedChapter(highlighted);
  }, [currentTime]);

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white/80 border-t border-slate-200 px-6 py-3 flex flex-wrap gap-4 text-sm">
      {defaultChapters.map((chapter) => (
        <button
          key={chapter.id}
          type="button"
          onClick={() => onChapterSelect(chapter.id)}
          className={`flex items-center gap-2 ${
            highlightedChapter === chapter.id
              ? "text-emerald-600 font-medium border-b-2 border-emerald-600 pb-1"
              : "text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer"
          }`}
        >
          <span>{chapter.title}</span>
          <span
            className={`w-2 h-2 rounded-full bg-emerald-600 transition-transform ${
              highlightedChapter === chapter.id ? "scale-100" : "scale-0"
            }`}
          />
        </button>
      ))}
    </div>
  );
}
