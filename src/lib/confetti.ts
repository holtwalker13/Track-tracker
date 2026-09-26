"use client";

/** Lightweight CSS confetti burst — no dependency. */
export function fireConfetti(root?: HTMLElement | null) {
  if (typeof document === "undefined") return;
  const host = root ?? document.body;
  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.className =
    "pointer-events-none fixed inset-0 z-[100] overflow-hidden";
  host.appendChild(layer);

  const colors = ["#38bdf8", "#34d399", "#fbbf24", "#f472b6", "#a78bfa", "#fb7185"];
  const count = 48;
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("span");
    const left = Math.random() * 100;
    const delay = Math.random() * 0.25;
    const duration = 0.9 + Math.random() * 0.8;
    const size = 6 + Math.random() * 8;
    const color = colors[i % colors.length]!;
    const rotate = Math.random() * 360;
    piece.style.cssText = `
      position:absolute; top:-12px; left:${left}%;
      width:${size}px; height:${size * 0.6}px;
      background:${color}; border-radius:1px;
      transform:rotate(${rotate}deg);
      animation:tt-confetti-fall ${duration}s ${delay}s ease-out forwards;
      opacity:0.95;
    `;
    layer.appendChild(piece);
  }

  if (!document.getElementById("tt-confetti-style")) {
    const style = document.createElement("style");
    style.id = "tt-confetti-style";
    style.textContent = `
      @keyframes tt-confetti-fall {
        0% { transform: translate3d(0,0,0) rotate(0deg); opacity: 1; }
        100% { transform: translate3d(${Math.random() > 0.5 ? "" : "-"}40px, 110vh, 0) rotate(720deg); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  window.setTimeout(() => layer.remove(), 2200);
}
