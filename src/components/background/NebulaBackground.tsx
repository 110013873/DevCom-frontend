import { useMemo, type CSSProperties } from "react";
import { motion } from "framer-motion";

interface Orb {
  class: string;
  style: CSSProperties;
  animate: { x: number[]; y: number[] };
  duration: number;
}

// Animated flowing orbs (nebula clouds)
function NebulaOrbs() {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const orbs = useMemo(() => {
    const baseOrbs: Orb[] = [
      {
        class: "w-[800px] h-[800px]",
        style: { background: "radial-gradient(circle, hsla(210,100%,60%,0.1) 0%, hsla(210,100%,50%,0.03) 40%, transparent 75%)", top: "-15%", left: "-5%" },
        animate: { x: [0, 40, -20, 0], y: [0, 30, -15, 0] },
        duration: 35,
      },
      {
        class: "w-[600px] h-[600px]",
        style: { background: "radial-gradient(circle, hsla(0,85%,50%,0.07) 0%, hsla(0,85%,40%,0.02) 40%, transparent 75%)", top: "25%", right: "-10%" },
        animate: { x: [0, -40, 25, 0], y: [0, -25, 40, 0] },
        duration: 42,
      },
    ];

    if (!isMobile) {
      baseOrbs.push(
        {
          class: "w-[500px] h-[500px]",
          style: { background: "radial-gradient(circle, hsla(195,100%,50%,0.06) 0%, hsla(195,100%,40%,0.01) 40%, transparent 75%)", bottom: "-5%", left: "15%" },
          animate: { x: [0, 30, -40, 0], y: [0, -30, 15, 0] },
          duration: 48,
        }
      );
    }
    return baseOrbs;
  }, [isMobile]);

  return (
    <>
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full pointer-events-none ${orb.class}`}
          // Using a smaller blur and relying more on the gradient's native softness
          style={{ 
            filter: "blur(50px)", 
            willChange: "transform",
            ...orb.style 
          }}
          animate={orb.animate}
          transition={{ duration: orb.duration, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

export function NebulaBackground() {
  return (
    <div className="fixed inset-0 -z-20 overflow-hidden" style={{ background: "#ffffff" }}>
      {/* Subtle orbs */}
      <NebulaOrbs />
    </div>
  );
}
