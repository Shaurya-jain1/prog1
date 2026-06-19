"use client";

import { useEffect, useRef } from "react";

type Particle = { x: number; y: number; vx: number; vy: number; angle: number; length: number; color: string };

const COLORS = ["#4285F4", "#EA4335", "#FBBC04", "#34A853", "#A142F4", "#FF6D01", "#FF00FF"];

export function ParticleField() {
  const ref = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999, active: false });
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const density = Math.min(110, Math.floor((w * h) / 14000));
      particlesRef.current = Array.from({ length: density }, () => spawn(w, h));
    };

    const spawn = (W: number, H: number): Particle => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      angle: Math.random() * Math.PI * 2,
      length: 6 + Math.random() * 10,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    });

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - r.left;
      mouseRef.current.y = e.clientY - r.top;
      mouseRef.current.active = true;
    };
    const onLeave = () => { mouseRef.current.active = false; mouseRef.current.x = -9999; };

    const onResize = () => resize();
    resize();
    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      const m = mouseRef.current;
      const REPEL = 120;
      const FORCE = 0.6;

      for (const p of particlesRef.current) {
        if (m.active) {
          const dx = p.x - m.x, dy = p.y - m.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < REPEL * REPEL) {
            const d = Math.sqrt(d2) || 1;
            const f = (1 - d / REPEL) * FORCE;
            p.vx += (dx / d) * f;
            p.vy += (dy / d) * f;
          }
        }
        p.vx *= 0.94; p.vy *= 0.94;
        p.vx += (Math.random() - 0.5) * 0.05;
        p.vy += (Math.random() - 0.5) * 0.05;
        p.x += p.vx; p.y += p.vy;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
        p.angle = Math.atan2(p.vy, p.vx);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const r = p.length / 2;
        ctx.roundRect(-r, -1.2, p.length, 2.4, 1.2);
        ctx.fill();
        ctx.restore();
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return <canvas ref={ref} className="fixed inset-0 w-full h-full pointer-events-none z-0" aria-hidden />;
}
