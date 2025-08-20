import React, { useState, useEffect, useCallback, useRef } from "react";
import Region from "./Region";
import Ticker from "./Ticker";
import useTVKeys from "../hooks/useTVKeys";

function Player({ data, deviceId, onExit }) {
  const settings = (data && data.settings) || {};
  const channel = (data && data.channel) || {};

  const [gridX] = useState(channel.gridX || 12);
  const [gridY] = useState(channel.gridY || 12);
  const [regions] = useState(channel.regions || []);
  const [tickers] = useState(channel.tickers || []);

  // ✅ Wrap handlers in useCallback so they’re stable
  const onNext = useCallback(() => {
    window.dispatchEvent(new CustomEvent("tv-control", { detail: { action: "next" } }));
  }, []);

  const onPrev = useCallback(() => {
    window.dispatchEvent(new CustomEvent("tv-control", { detail: { action: "prev" } }));
  }, []);

  const onToggle = useCallback(() => {
    window.dispatchEvent(new CustomEvent("tv-control", { detail: { action: "toggle-play" } }));
  }, []);

  const onBack = useCallback(() => {
    if (onExit) onExit();
  }, [onExit]);

  // ✅ Robust input handling for TVs and desktop
  const lastHandledRef = useRef(0);
  const debounceOnce = useCallback((fn) => {
    const now = Date.now();
    if (now - lastHandledRef.current < 100) return; // prevent double fire between listeners
    lastHandledRef.current = now;
    fn();
  }, []);

  // Desktop keyboard fallback (e.key)
  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case "ArrowRight":
        debounceOnce(onNext);
        break;
      case "ArrowLeft":
        debounceOnce(onPrev);
        break;
      case "Enter":
        debounceOnce(onToggle);
        break;
      case "Backspace":
      case "Escape":
        debounceOnce(onBack);
        break;
      default:
        break;
    }
  }, [debounceOnce, onNext, onPrev, onToggle, onBack]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // TV remote support (keyCode mapping, Tizen return key, etc.)
  useTVKeys({
    onNext: () => debounceOnce(onNext),
    onPrev: () => debounceOnce(onPrev),
    onToggle: () => debounceOnce(onToggle),
    onBack: () => debounceOnce(onBack),
  });

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(${gridX}, 1fr)`,
    gridTemplateRows: `repeat(${gridY}, 1fr)`,
    width: "100vw",
    height: "100vh",
  };

  return (
    <div className="player-root">
      {/* <div className="player-top">
        <div>{settings.device_name || `Device ${deviceId}`}</div>
        <div className="small">
          Press LEFT / RIGHT to change slides, ENTER to play/pause, RETURN to exit
        </div>
      </div> */}

      <div className="player-grid" style={gridStyle}>
        {regions.map((r, idx) => (
          <Region key={idx} region={r} settings={settings} />
        ))}
      </div>

      {tickers && tickers.length > 0 && <Ticker items={tickers} />}
    </div>
  );
}

export default Player;




