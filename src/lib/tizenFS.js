// Minimal Tizen FileSystem helper for offline caching of media
// Works only on Samsung Tizen TV runtime where `window.tizen` is available

const isTizen = typeof window !== 'undefined' && typeof window.tizen !== 'undefined' && window.tizen.filesystem;

function log(...args) {
  try { console.log('[tizenFS]', ...args); } catch (_) {}
  try {
    const msg = args.map((a) => {
      if (typeof a === 'string') return a;
      try { return JSON.stringify(a); } catch (_) { return String(a); }
    }).join(' ');
    // alert(`[tizenFS] ${msg}`);
  } catch (_) {}
}

// Debug logger (toggle with window.__TIZENFS_DEBUG = true or localStorage 'tizenFS_debug' = '1')
function dlog(...args) {
  try {
    const enabled = (typeof window !== 'undefined') && (
      (window.__TIZENFS_DEBUG === true) ||
      (function(){ try { return localStorage.getItem('tizenFS_debug') === '1'; } catch (_) { return false; } })()
    );
    if (enabled) {
      console.log('[tizenFS]', ...args);
      try {
        const msg = args.map((a) => {
          if (typeof a === 'string') return a;
          try { return JSON.stringify(a); } catch (_) { return String(a); }
        }).join(' ');
        // alert(`[tizenFS] ${msg}`);
      } catch (_) {}
    }
  } catch (_) {}
}

export function tizenIsAvailable() {
  const available = !!isTizen;
  dlog('tizenIsAvailable ->', available);
  return available;
}

export function getAppWritableDir() {
  if (!isTizen) return null;
  // wgt-private is writeable per-app
  const dir = 'wgt-private';
  dlog('getAppWritableDir ->', dir);
  return dir;
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
    const name = `${hash}.${ext}`;
    dlog('toSafeName', { url: u, name });
    return name;
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
      dlog('resolveOfflinePath:start', { url, fullPath });
      window.tizen.filesystem.resolve(fullPath, (file) => {
        try {
          const uri = file && typeof file.toURI === 'function' ? file.toURI() : null;
          dlog('resolveOfflinePath:success', { url, uri });
          resolve(uri);
        } catch (_) { resolve(null); }
      }, () => { dlog('resolveOfflinePath:not_found', { url }); resolve(null); }, 'r');
    } catch (_) { resolve(null); }
  });
}

// Download and persist a URL to Tizen FS via Download API. Returns local URI on success.
export async function downloadToOffline(url) {
  if (!isTizen || !url) return null;
  return new Promise((resolve) => {
    try {
      if (!window.tizen.download) { dlog('download:api_unavailable'); return resolve(null); }
      const fileName = toSafeName(url);
      const destination = 'wgt-private';
      dlog('download:start', { url, destination, fileName });
      const request = new window.tizen.DownloadRequest(url, destination + '/', fileName);
      const listener = {
        oncompleted: function (id, fullPath) {
          try {
            window.tizen.filesystem.resolve(fullPath, (file) => {
              try {
                const uri = file && file.toURI ? file.toURI() : null;
                dlog('download:completed', { id, fullPath, uri });
                resolve(uri);
              } catch (_) { resolve(null); }
            }, () => resolve(null), 'r');
          } catch (_) { resolve(null); }
        },
        onfailed: function (id, error) { dlog('download:failed', { id, error }); resolve(null); },
        onpaused: function (id) { dlog('download:paused', { id }); },
        oncanceled: function (id) { dlog('download:canceled', { id }); },
        onprogress: function (id, receivedSize, totalSize) { dlog('download:progress', { id, receivedSize, totalSize }); },
      };
      window.tizen.download.start(request, listener);
    } catch (e) {
      log('download:error', e);
      resolve(null);
    }
  });
}

// Get a local path for URL: prefer existing offline file, otherwise optionally download
export async function getOrCacheOffline(url, { downloadIfMissing = true } = {}) {
  if (!isTizen || !url) return null;
  try {
    dlog('getOrCacheOffline:start', { url, downloadIfMissing });
    const existing = await resolveOfflinePath(url);
    if (existing) { dlog('getOrCacheOffline:hit', { url, uri: existing }); return existing; }
    if (!downloadIfMissing) { dlog('getOrCacheOffline:miss_no_download', { url }); return null; }
    const downloaded = await downloadToOffline(url);
    dlog('getOrCacheOffline:downloaded', { url, uri: downloaded });
    return downloaded;
  } catch (_) {
    dlog('getOrCacheOffline:error', { url });
    return null;
  }
}

// Prime cache for a device JSON structure (images/videos and background music)
export async function primeOfflineCache(deviceJson) {
  if (!isTizen || !deviceJson) return;
  try {
    dlog('prime:start');
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
    dlog('prime:queue', { total: urls.length, unique: unique.length });
    await Promise.all(unique.map((u) => getOrCacheOffline(u, { downloadIfMissing: true })));
    dlog('prime:done');
  } catch (_) {}
}


