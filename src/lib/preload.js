// Lightweight asset preloading helpers for TVs

export function preloadImage(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(false);
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

export function preloadVideoMetadata(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(false);
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      const done = () => resolve(true);
      const fail = () => resolve(false);
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
    const channel = deviceJson?.channel || {};
    const regions = channel.regions || [];
    const tickers = channel.tickers || [];

    const regionFirsts = regions
      .map((r) => (r?.playlist || []).filter(Boolean)?.[0])
      .filter(Boolean);

    const tickerTexts = tickers?.slice(0, 1) || [];

    const tasks = [];
    for (const item of regionFirsts) {
      if (!item || !item.url) continue;
      if (item.type === 'image') tasks.push(preloadImage(item.url));
      else if (item.type === 'video') tasks.push(preloadVideoMetadata(item.url));
      // web/iframe: cannot really preload cross-origin content
    }
    // Warm up at least something for ticker (no network needed)
    if (tickerTexts.length > 0) tasks.push(Promise.resolve(true));

    await Promise.race([
      Promise.all(tasks),
      new Promise((resolve) => setTimeout(resolve, 1200)),
    ]);
  } catch (_) {
    // ignore
  }
}


