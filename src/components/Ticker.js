import React, { useState, useEffect, useRef } from "react";

function Ticker({ items = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [textWidth, setTextWidth] = useState(0);

  const textRef = useRef(null);
  const timerRef = useRef(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const updateTextWidthAndStartTimer = () => {
    if (!items || items.length === 0) return;
    if (!textRef.current) return;

    // Measure text width
    const width = textRef.current.scrollWidth;
    setTextWidth(width);

    const current = items[currentIndex];
    const speed = (current && current.speed) || 50; // px/sec
    const duration = (width + window.innerWidth) / speed; // seconds

    clearTimer();
    timerRef.current = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, duration * 1000);
  };

  // --- Lifecycle ---
  useEffect(() => {
    updateTextWidthAndStartTimer();
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, items]);

  if (!items || items.length === 0) return null;

  const current = items[currentIndex];
  const fontSize = parseInt(current.fontsize, 10) || 20;
  const speed = current.speed || 50;
  const duration = (textWidth + window.innerWidth) / speed;

  const marqueeAnimation = textWidth
    ? `ticker-marquee ${duration}s linear infinite`
    : "none";

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1300,
        background: current.background || "rgba(0,0,0,0.8)",
        overflow: "hidden",
        whiteSpace: "nowrap",
        height: `${fontSize + 10}px`,
      }}
    >
      <div
        ref={textRef}
        style={{
          display: "inline-block",
          paddingLeft: "100%",
          fontSize: `${fontSize}px`,
          color: current.color || "#fff",
          animation: marqueeAnimation,
        }}
      >
        {current.text}
      </div>

      <style>
        {`
          @keyframes ticker-marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-100%); }
          }
        `}
      </style>
    </div>
  );
}

export default Ticker;



