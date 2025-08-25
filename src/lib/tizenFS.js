// Minimal Tizen FileSystem helper for offline caching of media
// Works only on Samsung Tizen TV runtime where `window.tizen` is available

const isTizen = typeof window !== 'undefined' && typeof window.tizen !== 'undefined' && window.tizen.filesystem;

function log(...args) {
  try { console.log('[tizenFS]', ...args); } catch (_) {}
}

export function tizenIsAvailable() {
  return !!isTizen;
}

export function getAppWritableDir() {
  if (!isTizen) return null;
  // wgt-private is writeable per-app
  return 'wgt-private';
}

// Returns a stable filename for a URL (basic hash substitute)
function toSafeName(url) {
  try {
    const u = String(url);
    let hash = 0;
    for (let i = 0; i < u.length; i++) {
      hash = (hash * 31 + u.charCodeAt(i)) >>> 0;
    }
    const ext = u.split('?')[0].split('#')[0].split('.').pop() || 'bin';
    return `${hash}.${ext}`;
  } catch (_) {
    return `file_${Date.now()}.bin`;
  }
}

// Resolve offline path for a URL if file exists, otherwise null
export async function resolveOfflinePath(url) {
  if (!isTizen || !url) return null;
  return new Promise((resolve) => {
    try {
      const fileName = toSafeName(url);
      const fullPath = `wgt-private/${fileName}`;
      window.tizen.filesystem.resolve(fullPath, (file) => {
        try { resolve(file && typeof file.toURI === 'function' ? file.toURI() : null); } catch (_) { resolve(null); }
      }, () => resolve(null), 'r');
    } catch (_) { resolve(null); }
  });
}

// Download and persist a URL to Tizen FS via Download API. Returns local URI on success.
export async function downloadToOffline(url) {
  if (!isTizen || !url) return null;
  return new Promise((resolve) => {
    try {
      if (!window.tizen.download) return resolve(null);
      const fileName = toSafeName(url);
      const destination = 'wgt-private';

      const request = new window.tizen.DownloadRequest(url, destination + '/', fileName);
      const listener = {
        oncompleted: function (id, fullPath) {
          try {
            window.tizen.filesystem.resolve(fullPath, (file) => {
              try { resolve(file && file.toURI ? file.toURI() : null); } catch (_) { resolve(null); }
            }, () => resolve(null), 'r');
          } catch (_) { resolve(null); }
        },
        onfailed: function () { resolve(null); },
        onpaused: function () {},
        oncanceled: function () {},
        onprogress: function () {},
      };
      window.tizen.download.start(request, listener);
    } catch (e) {
      log('resolve error', e);
      resolve(null);
    }
  });
}

// Get a local path for URL: prefer existing offline file, otherwise optionally download
export async function getOrCacheOffline(url, { downloadIfMissing = true } = {}) {
  if (!isTizen || !url) return null;
  try {
    const existing = await resolveOfflinePath(url);
    if (existing) return existing;
    if (!downloadIfMissing) return null;
    return await downloadToOffline(url);
  } catch (_) {
    return null;
  }
}

// Prime cache for a device JSON structure (images/videos and background music)
export async function primeOfflineCache(deviceJson) {
  if (!isTizen || !deviceJson) return;
  try {
    const channel = deviceJson.channel || {};
    const regions = channel.regions || [];
    const urls = [];
    for (const r of regions) {
      const list = (r && r.playlist) || [];
      for (const it of list) {
        if (!it || !it.url) continue;
        const t = (it.type || '').toLowerCase();
        if (t === 'image' || t === 'video') urls.push(it.url);
      }
    }
    const bgm = (deviceJson.settings && (deviceJson.settings.backgroundMusicUrl || (deviceJson.settings.backgroundMusic && deviceJson.settings.backgroundMusic.url))) ||
                (channel && (channel.backgroundMusicUrl || (channel.backgroundMusic && channel.backgroundMusic.url))) || null;
    if (bgm) urls.push(bgm);
    const unique = Array.from(new Set(urls)).slice(0, 20);
    await Promise.all(unique.map((u) => getOrCacheOffline(u, { downloadIfMissing: true })));
  } catch (_) {}
}


