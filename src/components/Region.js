import React, { useState, useEffect, useRef, useCallback } from "react";
import Hls from "hls.js";
import { getOrCacheOffline, tizenIsAvailable } from "../lib/tizenFS";

function Region({ region, settings, disableVideoBg = false }) {
  const playlistInit = (region.playlist || []).filter(Boolean);
  const [playlist] = useState(playlistInit); // removed unused setPlaylist
  const [index, setIndex] = useState(0);

  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const pausedRef = useRef(false);
  const attemptedUnmuteRef = useRef(false);
  const hlsRef = useRef(null);
  const [visible, setVisible] = useState(false);

  // --- Helpers ---
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const nextIndex = useCallback(() => {
    setIndex((prev) => {
      const len = playlist.length;
      if (len <= 1) return prev;
      return (prev + 1) % len;
    });
  }, [playlist.length]);

  const prevIndex = useCallback(() => {
    setIndex((prev) => {
      const len = playlist.length;
      if (len <= 1) return prev;
      return (prev - 1 + len) % len;
    });
  }, [playlist.length]);

  const resetTimer = useCallback(() => {
    clearTimer();
    if (!playlist.length) return;

    const cur = playlist[index];
    if (!cur) return;

    if (cur.type === "image") {
      // Start timing after image loads (see onLoad handler)
      return;
    } else if (cur.type === "video") {
      const dur = cur.duration || settings.videoDuration;
      if (dur) timerRef.current = setTimeout(nextIndex, dur);
    } else if (cur.type === "web" || cur.type === "url" || cur.type === "html") {
      const dur = cur.duration || settings.webDuration || settings.imageDuration || 8000;
      timerRef.current = setTimeout(nextIndex, dur);
    } else if (cur.type === "hls") {
      const dur = cur.duration || settings.videoDuration;
      if (dur) timerRef.current = setTimeout(nextIndex, dur);
    }
  }, [playlist, index, settings, clearTimer, nextIndex]);

  // --- Event handlers ---
  const handleTVControl = useCallback(
    (ev) => {
      const action = ev?.detail?.action;
      if (!action) return;

      const cur = playlist[index];
      const videoEl = videoRef.current;

      if (action === "next") {
        nextIndex();
      } else if (action === "prev") {
        prevIndex();
      } else if (action === "toggle-play") {
        if (cur && cur.type === "video" && videoEl) {
          if (videoEl.paused) videoEl.play().catch(() => {});
          else videoEl.pause();
        } else {
          if (timerRef.current) {
            clearTimer();
            pausedRef.current = true;
          } else {
            pausedRef.current = false;
            const dur = cur?.duration || ((cur?.type === "web" || cur?.type === "url") ? (settings.webDuration || settings.imageDuration || 8000) : (settings.imageDuration || 8000));
            timerRef.current = setTimeout(nextIndex, dur);
          }
        }
      }
    },
    [playlist, index, settings, nextIndex, prevIndex, clearTimer]
  );

  const onGlobalPause = useCallback(() => {
    const videoEl = videoRef.current;
    if (videoEl && !videoEl.paused) {
      videoEl.pause();
    }
    clearTimer();
  }, [clearTimer]);

  const onGlobalResume = useCallback(() => {
    const cur = playlist[index];
    const videoEl = videoRef.current;

    if (cur && cur.type === "video" && videoEl) {
      videoEl.play().catch(() => {});
    } else {
      const dur = cur?.duration || ((cur?.type === "web" || cur?.type === "url") ? (settings.webDuration || settings.imageDuration || 8000) : (settings.imageDuration || 8000));
      timerRef.current = setTimeout(nextIndex, dur);
    }
  }, [playlist, index, settings, nextIndex]);

  const handleVideoEnded = useCallback(() => {
    nextIndex();
  }, [nextIndex]);

  const handleVideoError = useCallback(() => {
    // Skip to next on error after brief delay to avoid tight loop
    clearTimer();
    timerRef.current = setTimeout(nextIndex, 500);
  }, [clearTimer, nextIndex]);

  const handleVideoLoaded = useCallback(() => {
    const cur = playlist[index];
    const videoEl = videoRef.current;
    if (!videoEl) return;
    if (cur && cur.type === "video") {
      // Attempt to start playback as soon as data is available
      try {
        const p0 = videoEl.play();
        if (p0 && typeof p0.then === "function") p0.catch(() => {});
      } catch (_) {}
      const allowSound = (region.sound || "").toLowerCase() === "unmute";
      if (allowSound && !attemptedUnmuteRef.current) {
        attemptedUnmuteRef.current = true;
        setTimeout(() => {
          try {
            videoEl.muted = false;
            const p = videoEl.play();
            if (p && typeof p.then === "function") p.catch(() => {});
          } catch (_) {
            // ignore
          }
        }, 100);
      }
    }
  }, [playlist, index, region]);

  const handleImageLoaded = useCallback(() => {
    const cur = playlist[index];
    if (!cur || cur.type !== "image") return;
    clearTimer();
    const dur = cur.duration || settings.imageDuration || 8000;
    timerRef.current = setTimeout(nextIndex, dur);
  }, [playlist, index, settings, nextIndex, clearTimer]);

  const handleImageError = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(nextIndex, 500);
  }, [clearTimer, nextIndex]);

  // --- Lifecycle ---
  // Final fallback: after item changes, try autoplay once after a short delay
  useEffect(() => {
    const cur = playlist[index];
    if (!cur || cur.type !== "video") return;
    const el = videoRef.current;
    if (!el) return;
    let tries = 0;
    const tryPlay = () => {
      tries += 1;
      try {
        el.muted = true;
        const p = el.play();
        if (p && typeof p.then === "function") p.catch(() => {
          if (tries < 3) setTimeout(tryPlay, 150);
        });
      } catch (_) {
        if (tries < 3) setTimeout(tryPlay, 150);
      }
    };
    const t = setTimeout(tryPlay, 250);
    return () => clearTimeout(t);
  }, [playlist, index]);

  useEffect(() => {
    window.addEventListener("tv-control", handleTVControl);
    window.addEventListener("global-pause", onGlobalPause);
    window.addEventListener("global-resume", onGlobalResume);

    resetTimer();

    return () => {
      window.removeEventListener("tv-control", handleTVControl);
      window.removeEventListener("global-pause", onGlobalPause);
      window.removeEventListener("global-resume", onGlobalResume);
      clearTimer();
    };
  }, [handleTVControl, onGlobalPause, onGlobalResume, resetTimer, clearTimer]);

  // Reset timer if index/playlist/settings changes
  useEffect(() => {
    attemptedUnmuteRef.current = false;
    resetTimer();
    return clearTimer;
  }, [index, playlist, settings, resetTimer, clearTimer]);

  // Simple fade/transition effect on item change
  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, [index]);

  // --- Render ---
  const x = region.data_grid?.x || 0;
  const y = region.data_grid?.y || 0;
  const w = region.data_grid?.w || 1;
  const h = region.data_grid?.h || 1;

  const regionStyle = {
    gridColumn: `${x + 1} / ${x + 1 + w}`,
    gridRow: `${y + 1} / ${y + 1 + h}`,
    overflow: "hidden",
    background: "#000",
    position: "relative", // needed for background blur layer
  };

  const item = playlist[index];
  const [resolvedUrl, setResolvedUrl] = useState(null);
  const objectFit = settings.stretching ? "fill" : "contain";
  const rotationDeg = (item && (item.rotation || 0)) || (region && (region.rotation || 0)) || 0;
  const transitionMs = (item && (item.transitionDuration || 0)) || (region && (region.transitionDuration || 0)) || (settings && (settings.transitionDuration || 0)) || 400;
  const isHls = !!(item && (item.type === "hls" || (/\.m3u8(\?.*)?$/i).test(item.url || "")));
  // Show a blurred background layer when content may not fill the region
  const showBlurBg = !settings.stretching;
  const canUseCssFilter =
    typeof window !== "undefined" &&
    typeof window.CSS !== "undefined" &&
    (CSS.supports("filter", "blur(2px)") || CSS.supports("-webkit-filter", "blur(2px)"));
  const enableBlurBg = showBlurBg && canUseCssFilter;

  const blurBgStyle = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    filter: "blur(24px) brightness(0.8)",
    WebkitFilter: "blur(24px) brightness(0.8)",
    transform: `scale(1.1) rotate(${rotationDeg}deg)`,
    willChange: "filter, transform",
    pointerEvents: "none",
    zIndex: 0,
    opacity: visible ? 1 : 0,
    transition: `opacity ${transitionMs}ms ease-in-out, transform ${transitionMs}ms ease-in-out`,
  };
  const bgStyleNoFilter = {
    ...blurBgStyle,
    filter: "none",
    WebkitFilter: "none",
    transform: "none",
    willChange: "auto",
  };

  const fgStyle = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit,
    backgroundColor: "transparent",
    zIndex: 1,
    transform: `rotate(${rotationDeg}deg)`,
    opacity: visible ? 1 : 0,
    transition: `opacity ${transitionMs}ms ease-in-out, transform ${transitionMs}ms ease-in-out`,
  };

  // Resolve offline URL when on Tizen
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!item || !item.url) {
        setResolvedUrl(null);
        return;
      }
      if (tizenIsAvailable()) {
        const local = await getOrCacheOffline(item.url, { downloadIfMissing: true });
        if (!cancelled) setResolvedUrl(local || item.url);
      } else {
        setResolvedUrl(item.url);
      }
    })();
    return () => { cancelled = true; };
  }, [item]);

  // Setup HLS streaming when needed
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    // Clean up any previous instance
    if (hlsRef.current) {
      try { hlsRef.current.destroy(); } catch (_) {}
      hlsRef.current = null;
    }
    if (!item || !isHls) return;

    const url = resolvedUrl || item.url;
    try {
      if (Hls.isSupported()) {
        const hls = new Hls({ autoStartLoad: true });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(videoEl);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          try {
            videoEl.muted = true;
            const p = videoEl.play();
            if (p && typeof p.then === "function") p.catch(() => {});
          } catch (_) {}
        });
        hls.on(Hls.Events.ERROR, () => {
          // on error, skip to next after short delay
          clearTimer();
          timerRef.current = setTimeout(nextIndex, 500);
        });
      } else if (videoEl.canPlayType && videoEl.canPlayType("application/vnd.apple.mpegurl")) {
        videoEl.src = url;
        try {
          videoEl.muted = true;
          const p = videoEl.play();
          if (p && typeof p.then === "function") p.catch(() => {});
        } catch (_) {}
      }
    } catch (_) {
      // Fallback: try native src
      try { videoEl.src = url; } catch (_) {}
    }

    return () => {
      if (hlsRef.current) {
        try { hlsRef.current.destroy(); } catch (_) {}
        hlsRef.current = null;
      }
    };
  }, [item, isHls, nextIndex, clearTimer, resolvedUrl]);

  // If no items, render empty region after hooks
  if (!playlist.length || !item) {
    return <div style={regionStyle}></div>;
  }

  if (item.type === "image") {
    return (
      <div style={regionStyle} className="region">
        {showBlurBg && (
          <img
            key={String(item.url) + "-imgbg-" + index}
            src={item.url}
            alt=""
            aria-hidden
            style={enableBlurBg ? blurBgStyle : bgStyleNoFilter}
          />
        )}
        <img
          src={resolvedUrl || item.url}
          alt={item.caption || ""}
          style={fgStyle}
          onLoad={handleImageLoaded}
          onError={handleImageError}
        />
      </div>
    );
  } else if (item.type === "video" || item.type === "hls") {
    return (
      <div style={regionStyle} className="region">
        {!disableVideoBg && (
          item.poster ? (
            <img
              key={String(item.poster) + "-vidbg-" + index}
              src={item.poster}
              alt=""
              aria-hidden
              style={enableBlurBg ? blurBgStyle : bgStyleNoFilter}
            />
          ) : (
            <video
              key={String(item.url) + "-vidbg-" + index}
              src={isHls ? undefined : (resolvedUrl || item.url)}
              autoPlay
              loop
              muted
              playsInline
              aria-hidden
              preload="metadata"
              style={enableBlurBg ? blurBgStyle : bgStyleNoFilter}
            />
          )
        )}
        <video
          ref={videoRef}
          key={item.url + index}
          src={isHls ? undefined : (resolvedUrl || item.url)}
          autoPlay
          playsInline
          // Always start muted to satisfy autoplay, unmute in onLoadedData if allowed
          muted
          controls={false}
          onEnded={handleVideoEnded}
          onLoadedData={handleVideoLoaded}
          onLoadedMetadata={handleVideoLoaded}
          onCanPlay={handleVideoLoaded}
          onError={handleVideoError}
          preload="auto"
          poster={item.poster || undefined}
          style={fgStyle}
        />
      </div>
    );
  } else if (item.type === "web" || item.type === "url") {
    // For iframes we can't blur their content. Optionally keep a solid bg.
    return (
      <div style={regionStyle} className="region">
        <iframe
          src={item.url}
          title={item.caption || "web-item"}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, zIndex: 1 }}
        />
      </div>
    );
  } else if (item.type === "html") {
    const doc = item.html || "";
    return (
      <div style={regionStyle} className="region">
        <iframe
          title={item.caption || "html-item"}
          srcDoc={doc}
          sandbox="allow-scripts allow-same-origin"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, zIndex: 1 }}
        />
      </div>
    );
  } else {
    return (
      <div style={regionStyle} className="region">
        <div style={{ color: "#fff", padding: 10 }}>
          Unsupported item type: {item.type}
        </div>
      </div>
    );
  }
}

export default Region;




