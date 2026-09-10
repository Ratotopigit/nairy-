"use client";

import { useEffect, useRef } from "react";

export default function StarfieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    // Generate stars with gold and celestial starlight
    const starCount = 95;
    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.6 + 0.4,
      alpha: Math.random() * 0.7 + 0.2,
      speed: Math.random() * 0.015 + 0.005,
      isGold: Math.random() > 0.75,
      phase: Math.random() * Math.PI * 2,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (const star of stars) {
        star.phase += star.speed;
        const currentAlpha = Math.max(
          0.1,
          star.alpha + Math.sin(star.phase) * 0.35
        );

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);

        if (star.isGold) {
          ctx.fillStyle = `rgba(243, 229, 171, ${currentAlpha})`;
          ctx.shadowColor = "rgba(230, 202, 101, 0.4)";
          ctx.shadowBlur = 4;
        } else {
          ctx.fillStyle = `rgba(224, 231, 255, ${currentAlpha})`;
          ctx.shadowColor = "rgba(147, 197, 253, 0.3)";
          ctx.shadowBlur = 3;
        }

        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#06080d]">
      {/* Velvety Matte Obsidian Base */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#05070c] via-[#07090f] to-[#040508]" />

      {/* Deep Nebula Volumetric Glows */}
      {/* 1. Celestial Deep Blue Nebula (Top Center & Right) */}
      <div className="absolute -top-[20%] right-[-10%] h-[800px] w-[800px] rounded-full bg-gradient-to-br from-blue-950/25 via-indigo-950/20 to-transparent blur-[140px]" />

      {/* 2. Stardust Gold Ambient Glow (Hero Left/Center) */}
      <div className="absolute top-[15%] -left-[10%] h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-amber-950/15 via-[#2b1f0c]/20 to-transparent blur-[130px]" />

      {/* 3. Deep Sapphire & Violet Core Nebula (Center Bottom) */}
      <div className="absolute bottom-[-15%] left-[25%] h-[750px] w-[900px] rounded-full bg-gradient-to-t from-violet-950/20 via-blue-950/15 to-transparent blur-[160px]" />

      {/* Soft Volumetric Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(4,5,8,0.6)_85%)]" />

      {/* Twinkling Starlight Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
