import React, { useState, useEffect, useCallback, useRef } from "react";
import html2canvas from "html2canvas";
import { getOrCacheOffline, tizenIsAvailable } from "../lib/tizenFS";
import Ticker from "./Ticker";
import useTVKeys from "../hooks/useTVKeys";
import Region from "./Region";

function Player({ data, deviceId, onExit }) {
  const settings = (data && data.settings) || {};
  const channel = (data && data.channel) || {};

  const [gridX] = useState(channel.gridX || 12);
  const [gridY] = useState(channel.gridY || 12);
  const [regions] = useState(channel.regions || []);
  const [tickers] = useState(channel.tickers || []);

  // Background music
  const audioRef = useRef(null);
  const backgroundMusicUrl = (
    (settings && (settings.backgroundMusicUrl || (settings.backgroundMusic && settings.backgroundMusic.url))) ||
    (channel && (channel.backgroundMusicUrl || (channel.backgroundMusic && channel.backgroundMusic.url))) ||
    null
  );
  const allowMusicSound = String(settings && (settings.musicSound || settings.sound || "")).toLowerCase() === "unmute";

  const [resolvedMusicUrl, setResolvedMusicUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!backgroundMusicUrl) { setResolvedMusicUrl(null); return; }
      if (tizenIsAvailable()) {
        const local = await getOrCacheOffline(backgroundMusicUrl, { downloadIfMissing: true });
        if (!cancelled) setResolvedMusicUrl(local || backgroundMusicUrl);
      } else {
        setResolvedMusicUrl(backgroundMusicUrl);
      }
    })();
    return () => { cancelled = true; };
  }, [backgroundMusicUrl]);

  const tryPlayMusic = useCallback(() => {
    const el = audioRef.current;
    const srcUrl = resolvedMusicUrl || backgroundMusicUrl;
    if (!el || !srcUrl) return;
    try {
      el.src = srcUrl;
      el.muted = !allowMusicSound;
      const p = el.play();
      if (p && typeof p.then === "function") p.catch(() => {});
    } catch (_) {}
  }, [backgroundMusicUrl, resolvedMusicUrl, allowMusicSound]);

  // Screenshot support (inline)
  const gridRef = useRef(null);
  const captureGridScreenshot = useCallback(async () => {
    try {
      if (!gridRef.current) return null;
      const canvas = await html2canvas(gridRef.current, {
        useCORS: true,
        backgroundColor: "#000",
        logging: false,
        scale: (typeof window !== "undefined" && window.devicePixelRatio) ? window.devicePixelRatio : 1,
      });
      const dataUrl = canvas.toDataURL("image/png");
      window.lastScreenshot = dataUrl;
      return dataUrl;
    } catch (_) {
      return null;
    }
  }, []);

  // ✅ Wrap handlers in useCallback so they’re stable
  const onNext = useCallback(() => {
    window.dispatchEvent(new CustomEvent("tv-control", { detail: { action: "next" } }));
    tryPlayMusic();
  }, [tryPlayMusic]);

  const onPrev = useCallback(() => {
    window.dispatchEvent(new CustomEvent("tv-control", { detail: { action: "prev" } }));
    tryPlayMusic();
  }, [tryPlayMusic]);

  const onToggle = useCallback(() => {
    window.dispatchEvent(new CustomEvent("tv-control", { detail: { action: "toggle-play" } }));
    tryPlayMusic();
  }, [tryPlayMusic]);

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
      case "s":
      case "S":
        debounceOnce(() => {
          captureGridScreenshot();
        });
        break;
      case "Backspace":
      case "Escape":
        debounceOnce(onBack);
        break;
      default:
        break;
    }
  }, [debounceOnce, onNext, onPrev, onToggle, onBack, captureGridScreenshot]);

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

      {(resolvedMusicUrl || backgroundMusicUrl) && (
        <audio
          ref={audioRef}
          src={resolvedMusicUrl || backgroundMusicUrl}
          autoPlay
          loop
          muted={!allowMusicSound}
          style={{ display: "none" }}
        />
      )}

      <div className="player-grid" style={gridStyle} ref={gridRef}>
        {regions.map((r, idx) => (
          <Region key={idx} region={r} settings={settings} />
        ))}
      </div>

      {tickers && tickers.length > 0 && <Ticker items={tickers} />}
    </div>
  );
}

export default Player;




