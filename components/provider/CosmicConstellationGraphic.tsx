"use client";

import { motion } from "framer-motion";
import { Sparkles, Layers, Cpu, Presentation, ShieldCheck } from "lucide-react";
import { useEffect, useRef } from "react";

export default function CosmicConstellationGraphic() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 540);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 460);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener("resize", handleResize);

    // Particle Swarm (Gold and Deep Blue Stardust)
    const particleCount = 70;
    const particles = Array.from({ length: particleCount }, () => {
      const isGold = Math.random() > 0.45;
      const radius = Math.random() * 160 + 40;
      const speed = (Math.random() * 0.006 + 0.003) * (Math.random() > 0.5 ? 1 : -1);
      const angle = Math.random() * Math.PI * 2;
      const ySquash = 0.52; // Elliptical 3D perspective
      return {
        radius,
        angle,
        speed,
        ySquash,
        size: Math.random() * 2 + (isGold ? 1.2 : 0.8),
        isGold,
        alpha: Math.random() * 0.6 + 0.3,
        pulseSpeed: Math.random() * 0.03 + 0.01,
        pulsePhase: Math.random() * Math.PI * 2,
      };
    });

    // Constellation Nodes
    const nodes = [
      { x: 0, y: 0, ox: -120, oy: -60, isGold: true },
      { x: 0, y: 0, ox: 140, oy: -80, isGold: false },
      { x: 0, y: 0, ox: 110, oy: 90, isGold: true },
      { x: 0, y: 0, ox: -130, oy: 80, isGold: false },
      { x: 0, y: 0, ox: 0, oy: -130, isGold: true },
      { x: 0, y: 0, ox: -50, oy: 120, isGold: false },
    ];

    let t = 0;
    const render = () => {
      t += 0.015;
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Draw subtle orbital paths in 3D perspective
      ctx.save();
      ctx.translate(centerX, centerY);

      // Outer ellipse
      ctx.beginPath();
      ctx.ellipse(0, 0, 190, 100, -0.2, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(212, 175, 55, 0.12)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.stroke();

      // Middle ellipse
      ctx.beginPath();
      ctx.ellipse(0, 0, 140, 75, 0.35, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(59, 130, 246, 0.16)";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Update and connect constellation nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const rotX = node.ox * Math.cos(t * 0.25) - node.oy * Math.sin(t * 0.25) * 0.55;
        const rotY = node.ox * Math.sin(t * 0.25) * 0.55 + node.oy * Math.cos(t * 0.25);
        node.x = rotX;
        node.y = rotY;
      }

      // Draw constellation filaments
      ctx.strokeStyle = "rgba(230, 202, 101, 0.15)";
      ctx.lineWidth = 0.8;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw constellation nodes
      for (const node of nodes) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.isGold ? 3 : 2.5, 0, Math.PI * 2);
        if (node.isGold) {
          ctx.fillStyle = "#fef08a";
          ctx.shadowColor = "rgba(234, 179, 8, 0.8)";
          ctx.shadowBlur = 10;
        } else {
          ctx.fillStyle = "#93c5fd";
          ctx.shadowColor = "rgba(59, 130, 246, 0.8)";
          ctx.shadowBlur = 8;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Render swirling 3D stardust particles
      for (const p of particles) {
        p.angle += p.speed;
        p.pulsePhase += p.pulseSpeed;

        const px = Math.cos(p.angle) * p.radius;
        const py = Math.sin(p.angle) * (p.radius * p.ySquash);

        // Rotation tilt
        const tiltedX = px * Math.cos(0.2) - py * Math.sin(0.2);
        const tiltedY = px * Math.sin(0.2) + py * Math.cos(0.2);

        const alpha = Math.max(
          0.15,
          p.alpha + Math.sin(p.pulsePhase) * 0.25
        );

        ctx.beginPath();
        ctx.arc(tiltedX, tiltedY, p.size, 0, Math.PI * 2);

        if (p.isGold) {
          ctx.fillStyle = `rgba(243, 229, 171, ${alpha})`;
          ctx.shadowColor = "rgba(212, 175, 55, 0.7)";
          ctx.shadowBlur = 6;
        } else {
          ctx.fillStyle = `rgba(147, 197, 253, ${alpha})`;
          ctx.shadowColor = "rgba(37, 99, 235, 0.7)";
          ctx.shadowBlur = 5;
        }

        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full h-[360px] sm:h-[420px] lg:h-[480px] rounded-3xl overflow-hidden border border-white/[0.08] bg-gradient-to-b from-white/[0.04] via-[#090c14]/80 to-[#05070c] shadow-[0_20px_50px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.15)] flex items-center justify-center p-6 select-none backdrop-blur-xl">
      {/* Background Volumetric Glows */}
      <div className="absolute -top-16 -right-16 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Interactive Swirling Stardust Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full pointer-events-none" />

      {/* Central Celestial Singularity Nexus */}
      <motion.div
        animate={{
          scale: [1, 1.04, 1],
          boxShadow: [
            "0 0 25px rgba(212, 175, 55, 0.25), 0 0 50px rgba(59, 130, 246, 0.2)",
            "0 0 45px rgba(212, 175, 55, 0.4), 0 0 70px rgba(59, 130, 246, 0.35)",
            "0 0 25px rgba(212, 175, 55, 0.25), 0 0 50px rgba(59, 130, 246, 0.2)",
          ],
        }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10 size-24 sm:size-28 rounded-2xl bg-gradient-to-b from-[#121624] to-[#080b12] border border-amber-300/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)] flex flex-col items-center justify-center p-3 text-center"
      >
        <div className="size-10 rounded-xl bg-gradient-to-br from-amber-400/20 via-blue-500/20 to-transparent border border-amber-300/30 flex items-center justify-center text-amber-200 mb-1.5 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
          <Cpu className="size-5 text-amber-300 drop-shadow-[0_0_6px_rgba(252,211,77,0.8)]" />
        </div>
        <span className="font-mono text-[9px] uppercase tracking-widest font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-blue-200">
          Cosmic Core
        </span>
        <span className="text-[10px] text-slate-400 font-medium">
          WebinarKit AI
        </span>
      </motion.div>

      {/* Floating Beveled Glass Chip 1: Webinar Chat (Top-Left) */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: [0, -7, 0] }}
        transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        className="absolute top-6 left-5 sm:top-10 sm:left-8 z-20 rounded-2xl border border-emerald-500/30 bg-[#0c1017]/85 backdrop-blur-xl px-3.5 py-2.5 shadow-[0_10px_25px_rgba(0,0,0,0.6),0_0_20px_rgba(16,185,129,0.2)] flex items-center gap-3"
      >
        <div className="size-8 rounded-xl bg-gradient-to-br from-emerald-400/20 to-emerald-950/40 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.35)]">
          <Sparkles className="size-4" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-white">Webinar Chat</p>
            <ShieldCheck className="size-3 text-emerald-400" />
          </div>
          <p className="text-[10px] text-slate-400">Buyer Persona Synced</p>
        </div>
      </motion.div>

      {/* Floating Beveled Glass Chip 2: Webinar Offer (Top-Right) */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: [0, 7, 0] }}
        transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        className="absolute top-8 right-5 sm:top-12 sm:right-8 z-20 rounded-2xl border border-amber-400/35 bg-[#0c1017]/85 backdrop-blur-xl px-3.5 py-2.5 shadow-[0_10px_25px_rgba(0,0,0,0.6),0_0_20px_rgba(245,158,11,0.2)] flex items-center gap-3"
      >
        <div className="size-8 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-950/40 border border-amber-400/40 text-amber-300 flex items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.35)]">
          <Layers className="size-4" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-white">Webinar Offer</p>
            <span className="font-mono text-[9px] px-1.5 py-0.2 bg-amber-400/15 border border-amber-400/30 text-amber-300 rounded font-semibold">$25k-$40k</span>
          </div>
          <p className="text-[10px] text-slate-400">Direct-Response Funnel</p>
        </div>
      </motion.div>

      {/* Floating Beveled Glass Chip 3: Webinar Content (Bottom-Right) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: [0, -8, 0] }}
        transition={{ duration: 6.2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-6 right-8 sm:bottom-8 sm:right-12 z-20 rounded-2xl border border-sky-400/35 bg-[#0c1017]/85 backdrop-blur-xl px-3.5 py-2.5 shadow-[0_10px_25px_rgba(0,0,0,0.6),0_0_20px_rgba(14,165,233,0.2)] flex items-center gap-3"
      >
        <div className="size-8 rounded-xl bg-gradient-to-br from-sky-400/20 to-sky-950/40 border border-sky-400/40 text-sky-300 flex items-center justify-center shadow-[0_0_10px_rgba(14,165,233,0.35)]">
          <Presentation className="size-4" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-white">Webinar Content</p>
            <span className="font-mono text-[9px] px-1.5 py-0.2 bg-sky-400/15 border border-sky-400/30 text-sky-300 rounded font-semibold">16:9</span>
          </div>
          <p className="text-[10px] text-slate-400">Presentation Deck Ready</p>
        </div>
      </motion.div>

      {/* Bottom Left Pulse Indicator */}
      <div className="absolute bottom-4 left-6 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 backdrop-blur-md">
        <span className="size-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse" />
        <span className="font-mono text-[9px] uppercase tracking-wider text-slate-300 font-medium">
          Constellation Pipeline Active
        </span>
      </div>
    </div>
  );
}
