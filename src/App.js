import React, { useEffect, useState } from 'react';
import Player from './components/Player';
import { warmUpFirstAssets } from './lib/preload';
import { primeOfflineCache, tizenIsAvailable } from './lib/tizenFS';

function App() {
  const [deviceJson, setDeviceJson] = useState(null);
  const [deviceId, setDeviceId] = useState(null);

  // Fixed UUID (direct call)
  const FIXED_DEVICE_ID = "e90928ec-b121-4b03-86c3-d0534aedcb98";
  const API_URL = `https://devices.dev.easyboard.co.in/${FIXED_DEVICE_ID}/`;

  useEffect(() => {
    // 1) Try cached JSON first (works offline)
    try {
      const cached = localStorage.getItem('deviceJson');
      if (cached) {
        const parsed = JSON.parse(cached);
        setDeviceJson(parsed);
        setDeviceId(localStorage.getItem('deviceId') || FIXED_DEVICE_ID);
        // Warm up and prime cache when possible
        warmUpFirstAssets(parsed);
        if (tizenIsAvailable()) {
          primeOfflineCache(parsed);
        }
      }
    } catch (_) {}

    // 2) Fetch fresh JSON in background
    fetch(API_URL, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(`HTTP ${res.status} - ${res.statusText} | Body: ${txt.slice(0, 100)}`);
        }

        const text = await res.text();

        if (!text || !text.trim()) throw new Error('Empty response from server');
        if (/^\s*<!DOCTYPE html|^\s*<html/i.test(text)) {
          throw new Error('Server returned HTML, not JSON');
        }

        try {
          return JSON.parse(text);
        } catch (e) {
          throw new Error('Invalid JSON: ' + e.message);
        }
      })
      .then((json) => {
        setDeviceJson(json);
        setDeviceId(FIXED_DEVICE_ID);
        try {
          localStorage.setItem('deviceJson', JSON.stringify(json));
          localStorage.setItem('deviceId', FIXED_DEVICE_ID);
        } catch (_) {}
        warmUpFirstAssets(json); // Preload assets
        // Prime offline cache on Tizen
        if (tizenIsAvailable()) {
          primeOfflineCache(json);
        }
      })
      .catch((err) => {
        console.error(err);
        // If we already have cached data rendered, do not alert
        if (!localStorage.getItem('deviceJson')) {
          alert('Failed to fetch device JSON and no offline cache found. ' + err.message);
        }
      });
  }, [API_URL]); // run when URL changes

  return (
    <div className="app-root">
      {deviceJson ? (
        <Player
          data={deviceJson}
          deviceId={deviceId}
          onExit={() => {
            setDeviceJson(null);
            setDeviceId(null);
          }}
        />
      ) : (
        <div>Loading device data…</div>
      )}
    </div>
  );
}

export default App;



// import React, { useState } from 'react';
// import DeviceInput from './components/DeviceInput';
// import Player from './components/Player';
// import { warmUpFirstAssets } from './lib/preload';

// function App() {
//   const [deviceJson, setDeviceJson] = useState(null);
//   const [deviceId, setDeviceId] = useState(null);

//   const loadFromUUID = (uuid) => {
//     setDeviceJson(null);
//     setDeviceId(null);

//     // basic UUID-ish validation (allow dashes)
//     if (!uuid || !/^[0-9a-fA-F-]{8,}$/i.test(uuid)) {
//       alert('Enter a valid UUID-like id (example: e90928ec-b121-4b03-86c3-d0534aedcb98)');
//       return;
//     }

//     const url = `https://devices.dev.easyboard.co.in/${uuid}/`;

//     fetch(url, { cache: 'no-store' })
//       .then(async (res) => {
//         if (!res.ok) {
//           const txt = await res.text().catch(() => '');
//           throw new Error(
//             `HTTP ${res.status} - ${res.statusText} | Body: ${txt.slice(0, 100)}`
//           );
//         }

//         const text = await res.text();

//         if (!text || !text.trim()) {
//           throw new Error('Empty response from server');
//         }

//         if (/^\s*<!DOCTYPE html|^\s*<html/i.test(text)) {
//           throw new Error('Server returned HTML, not JSON');
//         }

//         try {
//           return JSON.parse(text);
//         } catch (e) {
//           throw new Error('Invalid JSON: ' + e.message);
//         }
//       })
//       .then((json) => {
//         // only set state if it looks like a valid object
//         setDeviceJson(json);
//         setDeviceId(uuid);
//         // Warm up first assets in background to reduce time-to-first-frame
//         warmUpFirstAssets(json);
//       })
//       .catch((err) => {
//         console.error(err);
//         alert('Failed to fetch device JSON: ' + err.message);
//       });
//   };

//   return (
//     <div className="app-root">
//       {!deviceJson ? (
//         <DeviceInput onSubmit={loadFromUUID} />
//       ) : (
//         <Player
//           data={deviceJson}
//           deviceId={deviceId}
//           onExit={() => {
//             setDeviceJson(null);
//             setDeviceId(null);
//           }}
//         />
//       )}
//     </div>
//   );
// }

// export default App;

