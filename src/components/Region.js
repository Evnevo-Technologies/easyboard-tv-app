import React, { useState, useEffect, useRef, useCallback } from "react";

function Region({ region, settings, disableVideoBg = false }) {
  const playlistInit = (region.playlist || []).filter(Boolean);
  const [playlist] = useState(playlistInit); // removed unused setPlaylist
  const [index, setIndex] = useState(0);

  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const pausedRef = useRef(false);
  const attemptedUnmuteRef = useRef(false);

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
    } else if (cur.type === "web" || cur.type === "url") {
      const dur = cur.duration || settings.webDuration || settings.imageDuration || 8000;
      timerRef.current = setTimeout(nextIndex, dur);
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

  if (!playlist.length) return <div style={regionStyle}></div>;

  const item = playlist[index];
  const objectFit = settings.stretching ? "fill" : "contain";
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
    transform: "scale(1.1)",
    willChange: "filter, transform",
    pointerEvents: "none",
    zIndex: 0,
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
  };

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
          src={item.url}
          alt={item.caption || ""}
          style={fgStyle}
          onLoad={handleImageLoaded}
          onError={handleImageError}
        />
      </div>
    );
  } else if (item.type === "video") {
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
              src={item.url}
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
          src={item.url}
          autoPlay
          playsInline
          // Always start muted to satisfy autoplay, unmute in onLoadedData if allowed
          muted
          controls={false}
          onEnded={handleVideoEnded}
          onLoadedData={handleVideoLoaded}
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




