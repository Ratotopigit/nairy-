"use client";

import React, { useEffect, useRef } from "react";

interface VoiceWaveVisualizerProps {
  isListening: boolean;
  className?: string;
}

export default function VoiceWaveVisualizer({
  isListening,
  className = "",
}: VoiceWaveVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Smooth amplitude and phase trackers
  const ampRef = useRef<number>(0);
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    if (!isListening) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        try {
          audioContextRef.current.close();
        } catch {}
        audioContextRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    let isMounted = true;

    async function initAudio() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) return;

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        const audioCtx = new AudioCtx();
        if (audioCtx.state === "suspended") {
          await audioCtx.resume();
        }
        audioContextRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.75;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
      } catch (err) {
        console.warn("Web Audio API permission or init issue:", err);
      }
    }

    initAudio();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dataArray = new Uint8Array(128);

    function render() {
      if (!canvas || !ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const width = rect.width;
      const height = rect.height;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Measure volume level from audio analyser
      let targetAmp = 0;
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        const startBin = 4;
        const endBin = Math.min(dataArray.length, 45);
        for (let i = startBin; i < endBin; i++) {
          sum += dataArray[i];
        }
        const avg = sum / (endBin - startBin);
        if (avg > 14) {
          targetAmp = Math.min(1, Math.max(0, (avg - 14) / 60));
        }
      }

      // Smooth interpolation for fluid liquid transitions
      ampRef.current += (targetAmp - ampRef.current) * 0.16;
      const currentAmp = ampRef.current;

      const speed = currentAmp > 0.04 ? 0.08 + currentAmp * 0.08 : 0.03;
      phaseRef.current += speed;
      const phase = phaseRef.current;

      const isSilent = currentAmp < 0.025;

      // Clean neutral grey gradient for idle line
      const greyGradient = ctx.createLinearGradient(0, 0, width, 0);
      greyGradient.addColorStop(0, "rgba(161, 161, 170, 0.25)");
      greyGradient.addColorStop(0.2, "rgba(113, 113, 122, 0.8)");
      greyGradient.addColorStop(0.8, "rgba(113, 113, 122, 0.8)");
      greyGradient.addColorStop(1, "rgba(161, 161, 170, 0.25)");

      if (isSilent) {
        // Idle state: sleek, simple grey line in center (like Gemini idle line)
        const linePadding = Math.min(width * 0.15, 36);
        const startX = linePadding;
        const endX = width - linePadding;

        // Gentle breathing pulse
        const breatheAlpha = 0.65 + Math.sin(phase * 1.5) * 0.18;

        ctx.beginPath();
        ctx.moveTo(startX, centerY);
        ctx.lineTo(endX, centerY);
        ctx.strokeStyle = greyGradient;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.globalAlpha = breatheAlpha;
        ctx.stroke();
      } else {
        // Speaking state: multi-layer simple grey waves with natural bell envelope
        const waveConfigs = [
          {
            ampScale: 1.0,
            freq: 0.035,
            phaseOffset: 0,
            lineWidth: 2.2,
            color: "#52525b", // zinc-600 neutral grey
            alpha: 0.9,
          },
          {
            ampScale: 0.65,
            freq: 0.045,
            phaseOffset: Math.PI * 0.5,
            lineWidth: 1.8,
            color: "#71717a", // zinc-500 neutral grey
            alpha: 0.65,
          },
          {
            ampScale: 0.38,
            freq: 0.06,
            phaseOffset: Math.PI * 1.2,
            lineWidth: 1.4,
            color: "#a1a1aa", // zinc-400 soft grey
            alpha: 0.45,
          },
        ];

        const maxDisplacement = height / 2 - 3;

        for (const config of waveConfigs) {
          ctx.beginPath();
          ctx.lineWidth = config.lineWidth;
          ctx.strokeStyle = config.color;
          ctx.globalAlpha = config.alpha;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";

          const stepPixels = 3;
          for (let x = 0; x <= width; x += stepPixels) {
            const normX = x / width;
            const envelope = Math.pow(Math.sin(normX * Math.PI), 1.8);

            const waveY =
              Math.sin(x * config.freq + phase + config.phaseOffset) * 0.7 +
              Math.sin(x * config.freq * 1.6 - phase * 0.8) * 0.3;

            const displacement =
              waveY * currentAmp * maxDisplacement * config.ampScale * envelope;

            const y = centerY + displacement;

            if (x === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();
        }
      }

      ctx.restore();
      animationFrameRef.current = requestAnimationFrame(render);
    }

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      isMounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        try {
          audioContextRef.current.close();
        } catch {}
        audioContextRef.current = null;
      }
    };
  }, [isListening]);

  if (!isListening) return null;

  return (
    <div className={`w-full flex items-center justify-center ${className}`}>
      <div className="relative w-full max-w-[260px] sm:max-w-[320px] h-6 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}
