import React, { useState } from 'react';
import DeviceInput from './components/DeviceInput';
import Player from './components/Player';
import { warmUpFirstAssets } from './lib/preload';

function App() {
  const [deviceJson, setDeviceJson] = useState(null);
  const [deviceId, setDeviceId] = useState(null);

  const loadFromUUID = (uuid) => {
    setDeviceJson(null);
    setDeviceId(null);

    // basic UUID-ish validation (allow dashes)
    if (!uuid || !/^[0-9a-fA-F-]{8,}$/i.test(uuid)) {
      alert('Enter a valid UUID-like id (example: e90928ec-b121-4b03-86c3-d0534aedcb98)');
      return;
    }

    const url = `https://devices.dev.easyboard.co.in/${uuid}/`;

    fetch(url, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(
            `HTTP ${res.status} - ${res.statusText} | Body: ${txt.slice(0, 100)}`
          );
        }

        const text = await res.text();

        if (!text || !text.trim()) {
          throw new Error('Empty response from server');
        }

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
        // only set state if it looks like a valid object
        setDeviceJson(json);
        setDeviceId(uuid);
        // Warm up first assets in background to reduce time-to-first-frame
        warmUpFirstAssets(json);
      })
      .catch((err) => {
        console.error(err);
        alert('Failed to fetch device JSON: ' + err.message);
      });
  };

  return (
    <div className="app-root">
      {!deviceJson ? (
        <DeviceInput onSubmit={loadFromUUID} />
      ) : (
        <Player
          data={deviceJson}
          deviceId={deviceId}
          onExit={() => {
            setDeviceJson(null);
            setDeviceId(null);
          }}
        />
      )}
    </div>
  );
}

export default App;

