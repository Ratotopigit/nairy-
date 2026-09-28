"use client";

import { useEffect, useRef, useState, useId } from "react";
import { Volume2, VolumeX } from "lucide-react";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

function loadYouTubeApi(): Promise<any> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return;
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }

    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevCallback?.();
      resolve(window.YT);
    };

    if (!document.getElementById("yt-iframe-api-script")) {
      const tag = document.createElement("script");
      tag.id = "yt-iframe-api-script";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

interface CustomYouTubePlayerProps {
  videoId: string;
  className?: string;
  autoplay?: boolean;
}

export default function CustomYouTubePlayer({
  videoId,
  className = "",
  autoplay = true,
}: CustomYouTubePlayerProps) {
  const uniqueId = useId().replace(/[:]/g, "_");
  const iframeId = `yt_custom_player_${uniqueId}`;

  const playerRef = useRef<any>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    let interval: any = null;

    // Fallback timer so black cover fades even if YouTube delays event
    const fallbackTimer = setTimeout(() => {
      if (mounted) setIsPlayerReady(true);
    }, 2400);

    loadYouTubeApi().then((YT) => {
      if (!mounted) return;

      try {
        playerRef.current = new YT.Player(iframeId, {
          events: {
            onReady: (event: any) => {
              if (!mounted) return;
              const p = event.target;
              if (autoplay) {
                p.mute();
                p.playVideo();
                setIsMuted(true);
                setIsPlaying(true);
              }
              const d = p.getDuration();
              if (d && !isNaN(d)) setDuration(d);

              interval = setInterval(() => {
                if (p && typeof p.getCurrentTime === "function") {
                  const curr = p.getCurrentTime();
                  if (typeof curr === "number" && !isNaN(curr)) {
                    setCurrentTime(curr);
                  }
                  const dur = p.getDuration();
                  if (typeof dur === "number" && !isNaN(dur) && dur > 0) {
                    setDuration(dur);
                  }
                  if (typeof p.isMuted === "function") {
                    setIsMuted(p.isMuted());
                  }
                }
              }, 250);
            },
            onStateChange: (event: any) => {
              if (!mounted) return;
              if (event.data === YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                // Delay revealing until YouTube finishes its initial center pause/buffering animation
                setTimeout(() => {
                  if (mounted) setIsPlayerReady(true);
                }, 800);
              } else if (event.data === YT.PlayerState.PAUSED) {
                setIsPlaying(false);
              } else if (event.data === YT.PlayerState.ENDED) {
                // Auto replay seamlessly
                setCurrentTime(0);
                event.target.seekTo(0, true);
                event.target.playVideo();
                setIsPlaying(true);
              }
            },
          },
        });
      } catch (err) {
        console.error("Error initializing YT player:", err);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(fallbackTimer);
      if (interval) clearInterval(interval);
      if (playerRef.current && typeof playerRef.current.destroy === "function") {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore cleanup error
        }
      }
    };
  }, [iframeId, autoplay, videoId]);

  const toggleMute = () => {
    const nextMuted = !isMuted;
    if (playerRef.current) {
      if (nextMuted) {
        playerRef.current.mute?.();
      } else {
        playerRef.current.unMute?.();
      }
      setIsMuted(nextMuted);
    } else {
      const iframe = document.getElementById(iframeId) as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(
          JSON.stringify({
            event: "command",
            func: nextMuted ? "mute" : "unMute",
            args: [],
          }),
          "*"
        );
      }
      setIsMuted(nextMuted);
    }
  };

  const togglePlayPause = () => {
    const nextPlaying = !isPlaying;

    if (playerRef.current) {
      if (nextPlaying) {
        playerRef.current.playVideo?.();
      } else {
        playerRef.current.pauseVideo?.();
      }
      setIsPlaying(nextPlaying);
    } else {
      const iframe = document.getElementById(iframeId) as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(
          JSON.stringify({
            event: "command",
            func: nextPlaying ? "playVideo" : "pauseVideo",
            args: [],
          }),
          "*"
        );
      }
      setIsPlaying(nextPlaying);
    }
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime);
    if (playerRef.current && typeof playerRef.current.seekTo === "function") {
      playerRef.current.seekTo(newTime, true);
    } else {
      const iframe = document.getElementById(iframeId) as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(
          JSON.stringify({
            event: "command",
            func: "seekTo",
            args: [newTime, true],
          }),
          "*"
        );
      }
    }
  };

  const origin =
    typeof window !== "undefined" && window.location.origin
      ? encodeURIComponent(window.location.origin)
      : "";

  const embedSrc = `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&autoplay=${
    autoplay ? "1" : "0"
  }&mute=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1&fs=0&disablekb=1&showinfo=0${
    origin ? `&origin=${origin}` : ""
  }`;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative w-full h-full overflow-hidden bg-black select-none ${className}`}
    >
      {/* 
        The YouTube iframe is cropped and positioned so that the top bar
        (title, share button, clock/watch later) and bottom watermark
        are outside the overflow-hidden container bounds.
      */}
      <div className="absolute inset-0 overflow-hidden flex items-center justify-center">
        <iframe
          id={iframeId}
          src={embedSrc}
          title="Video Broadcast"
          className="pointer-events-none absolute w-[122%] h-[132%] -top-[16%] -left-[11%] border-0 object-cover"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>

      {/* 
        Initial Black Cover Mask:
        Covers the initial load/buffer flash so YouTube template/title/share/clock
        never flashes when the page is reloaded.
      */}
      <div
        className={`pointer-events-none absolute inset-0 z-10 bg-black transition-opacity duration-500 ease-out ${
          isPlayerReady ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* Transparent Clickable Area to Play/Pause on Video Body */}
      <div
        onClick={togglePlayPause}
        className="absolute inset-0 z-15 cursor-pointer"
        aria-label="Toggle play/pause"
      />

      {/* 
        Hover Controls Overlay:
        Completely hidden until mouse hover, then smoothly fades in
      */}
      <div
        className={`pointer-events-none absolute inset-0 z-20 flex flex-col justify-between transition-opacity duration-300 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Top: Clean Mute / Unmute Icon Button (No Text) */}
        <div className="pointer-events-auto flex items-center justify-end bg-gradient-to-b from-black/75 via-black/30 to-transparent p-3.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleMute();
            }}
            aria-label={isMuted ? "Unmute" : "Mute"}
            className="grid size-9 place-items-center rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md text-white border border-white/20 transition-all shadow-md active:scale-90"
          >
            {isMuted ? (
              <VolumeX className="size-4 text-white" />
            ) : (
              <Volume2 className="size-4 text-white" />
            )}
          </button>
        </div>

        {/* Bottom: Progress Slider & Timestamp */}
        <div className="pointer-events-auto bg-gradient-to-t from-black/85 via-black/45 to-transparent px-4 pb-3 pt-6 flex flex-col gap-1.5">
          <div className="flex items-center gap-3 w-full">
            <span className="text-[11px] font-mono text-white/90 shrink-0 select-none">
              {formatTime(currentTime)}
            </span>

            {/* Slider track */}
            <div className="relative flex-1 flex items-center group/slider py-1.5 cursor-pointer">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  e.stopPropagation();
                  handleSeek(parseFloat(e.target.value));
                }}
                className="w-full h-1.5 appearance-none bg-white/25 rounded-full cursor-pointer transition-all hover:h-2 focus:outline-none accent-white"
                style={{
                  background: `linear-gradient(to right, #10b981 ${progressPercent}%, rgba(255,255,255,0.25) ${progressPercent}%)`,
                }}
              />
            </div>

            <span className="text-[11px] font-mono text-white/90 shrink-0 select-none">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
