// Lightweight asset preloading helpers for TVs

function log(...args) {
  try { console.log('[preload]', ...args); } catch (_) {}
  try {
    const msg = args.map((a) => {
      if (typeof a === 'string') return a;
      try { return JSON.stringify(a); } catch (_) { return String(a); }
    }).join(' ');
    // alert(`[preload] ${msg}`);
  } catch (_) {}
}

export function preloadImage(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(false);
    log('image:start', url);
    const img = new Image();
    img.onload = () => { log('image:ok', url); resolve(true); };
    img.onerror = () => { log('image:fail', url); resolve(false); };
    img.src = url;
  });
}

export function preloadVideoMetadata(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(false);
    try {
      log('video-metadata:start', url);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      const done = () => { log('video-metadata:ok', url); resolve(true); };
      const fail = () => { log('video-metadata:fail', url); resolve(false); };
      video.onloadedmetadata = done;
      video.onerror = fail;
      video.src = url;
    } catch (_e) {
      resolve(false);
    }
  });
}

export async function warmUpFirstAssets(deviceJson) {
  try {
    log('warmup:start');
    const channel = deviceJson?.channel || {};
    const regions = channel.regions || [];
    const tickers = channel.tickers || [];

    const regionFirsts = regions
      .map((r) => (r?.playlist || []).filter(Boolean)?.[0])
      .filter(Boolean);

    const tickerTexts = tickers?.slice(0, 1) || [];

    log('warmup:context', { regions: regions.length, tickers: tickers.length });
    const tasks = [];
    for (const item of regionFirsts) {
      if (!item || !item.url) continue;
      if (item.type === 'image') tasks.push(preloadImage(item.url));
      else if (item.type === 'video') tasks.push(preloadVideoMetadata(item.url));
      // web/iframe: cannot really preload cross-origin content
    }
    // Warm up at least something for ticker (no network needed)
    if (tickerTexts.length > 0) tasks.push(Promise.resolve(true));
    log('warmup:queue', tasks.length);

    await Promise.race([
      Promise.all(tasks),
      new Promise((resolve) => setTimeout(resolve, 1200)),
    ]);
    log('warmup:done');
  } catch (_) {
    log('warmup:error');
  }
}


