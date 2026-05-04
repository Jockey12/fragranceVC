"use client";

import { type CSSProperties, useState } from "react";

import type { FragranceResult } from "@/lib/fragrance-search";

type Props = {
  fragrance: FragranceResult;
  compact?: boolean;
};

type BottleStyle = CSSProperties & {
  "--bottle-a": string;
  "--bottle-b": string;
  "--rotate-x": string;
  "--rotate-y": string;
};

export default function RotatableBottle({ fragrance, compact = false }: Props) {
  const [rotation, setRotation] = useState({ x: -8, y: -22 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number; rx: number; ry: number } | null>(null);

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragStart) return;

    const deltaX = event.clientX - dragStart.x;
    const deltaY = event.clientY - dragStart.y;

    setRotation({
      x: Math.max(-42, Math.min(34, dragStart.rx - deltaY * 0.22)),
      y: dragStart.ry + deltaX * 0.28,
    });
  }

  const style: BottleStyle = {
    "--bottle-a": fragrance.colorA,
    "--bottle-b": fragrance.colorB,
    "--rotate-x": `${rotation.x}deg`,
    "--rotate-y": `${rotation.y}deg`,
  };

  return (
    <div className={compact ? "bottle-stage bottle-stage-compact" : "bottle-stage"}>
      <div
        className="bottle-viewport"
        role="img"
        aria-label={`Rotatable perfume bottle for ${fragrance.name}`}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragStart({ x: event.clientX, y: event.clientY, rx: rotation.x, ry: rotation.y });
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => {
          event.currentTarget.releasePointerCapture(event.pointerId);
          setDragStart(null);
        }}
        onPointerCancel={() => setDragStart(null)}
      >
        <div className="bottle-object" style={style}>
          <div className="bottle-cap" />
          <div className="bottle-neck" />
          <div className="bottle-body">
            <div className="bottle-face bottle-front">
              {fragrance.imageUrl ? (
                <img src={fragrance.imageUrl} alt="" className="bottle-image" />
              ) : (
                <div className="bottle-label">
                  <span>{fragrance.house.slice(0, 10)}</span>
                  <strong>{fragrance.name.slice(0, 16)}</strong>
                </div>
              )}
            </div>
            <div className="bottle-face bottle-back" />
            <div className="bottle-face bottle-left" />
            <div className="bottle-face bottle-right" />
            <div className="bottle-face bottle-top" />
            <div className="bottle-face bottle-bottom" />
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[0.68rem] font-black uppercase tracking-[0.2em] text-ink/45">
        Drag to rotate
      </p>
    </div>
  );
}
