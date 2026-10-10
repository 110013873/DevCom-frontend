import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  hue: number;
}

export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isVisibleRef = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Use IntersectionObserver to pause when not visible
    const observer = new IntersectionObserver((entries) => {
      isVisibleRef.current = entries[0].isIntersecting;
    }, { threshold: 0.01 });
    observer.observe(canvas);

    let animId: number;
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;

    const resize = () => {
      // For background particles, we don't need high-DPI. 1.0 is enough and much faster.
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const init = () => {
      particles = [];
      // Reduce density: 1 particle per 25000 square pixels instead of 18000
      const count = Math.min(Math.floor((width * height) / 25000), 120); 
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          radius: Math.random() * 1.2 + 0.3,
          opacity: Math.random() * 0.4 + 0.1,
          hue: Math.random() > 0.85 ? 0 : 210 + Math.random() * 20,
        });
      }
    };

    const draw = () => {
      if (!isVisibleRef.current) {
        animId = requestAnimationFrame(draw);
        return;
      }

      ctx.clearRect(0, 0, width, height);
      const LINK_DIST = 100; // Reduced from 120

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${p.opacity})`;
        ctx.fill();

        // draw connections - slightly optimize by using a step if density is high
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const d2 = dx * dx + dy * dy;

          if (d2 < LINK_DIST * LINK_DIST) {
            const dist = Math.sqrt(d2);
            const alpha = (1 - dist / LINK_DIST) * 0.05;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `hsla(210, 100%, 70%, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };

    resize();
    init();
    draw();

    window.addEventListener("resize", () => { resize(); init(); });
    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
      window.removeEventListener("resize", () => { resize(); init(); });
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ opacity: 0.5 }}
    />
  );
}
