import React, { useState } from 'react';
import DeviceInput from './components/DeviceInput';
import Player from './components/Player';

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


// import React, { useState } from 'react';
// import axios from 'axios';
// import DeviceInput from './components/DeviceInput';
// import Player from './components/Player';

// function App() {
//   const [deviceJson, setDeviceJson] = useState(null);
//   const [deviceId, setDeviceId] = useState(null);

//   const loadFromUUID = async (uuid) => {
//     setDeviceJson(null);
//     setDeviceId(null);

//     // basic UUID-ish validation (allow dashes)
//     if (!uuid || !/^[0-9a-fA-F-]{8,}$/i.test(uuid)) {
//       alert('Enter a valid UUID-like id (example: e90928ec-b121-4b03-86c3-d0534aedcb98)');
//       return;
//     }

//     const url = `https://devices.dev.easyboard.co.in/${uuid}/`;

//     try {
//       const response = await axios.get(url, { headers: { 'Cache-Control': 'no-store' } });

//       const data = response.data;

//       if (!data || typeof data !== 'object') {
//         throw new Error('Invalid JSON response');
//       }

//       setDeviceJson(data);
//       setDeviceId(uuid);
//     } catch (err) {
//       console.error(err);
//       alert('Failed to fetch device JSON: ' + (err.response?.data || err.message));
//     }
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




// import React from 'react';
// import DeviceInput from './components/DeviceInput';
// import Player from './components/Player';

// class App extends React.Component {
//   constructor(props) {
//     super(props);
//     this.state = {
//       deviceJson: null,
//       deviceId: null,
//     };
//   }

//   loadFromUUID = (uuid) => {
//     this.setState({ deviceJson: null, deviceId: null });

//     // basic UUID-ish validation (allow dashes)
//     if (!uuid || !/^[0-9a-fA-F-]{8,}$/i.test(uuid)) {
//       alert('Enter a valid UUID-like id (example: e90928ec-b121-4b03-86c3-d0534aedcb98)');
//       return;
//     }

//     const url = `https://devices.dev.easyboard.co.in/${uuid}/`;
//     fetch(url, { cache: 'no-store' })
//       .then(res => {
//         alert("..1" + JSON.stringify(res))
//         if (!res.ok) {
//           throw new Error(`HTTP ${res.status} - ${res.statusText}`);
//         }
//         return res.json();
//       })
//       .then(json => {
//         alert("..2" + JSON.stringify(json))

//         // set only if looks like device JSON
//         this.setState({ deviceJson: json, deviceId: uuid });
//       })
//       .catch(err => {
//         console.error(err);
//         alert(
//           'Failed to fetch device JSON: ' +
//             err.message + JSON.stringify(err)
//         );
//       });
//   };

//   render() {
//     const { deviceJson, deviceId } = this.state;
//     return (
//       <div className="app-root">
//         {!deviceJson ? (
//           <DeviceInput onSubmit={this.loadFromUUID} />
//         ) : (
//           <Player
//             data={deviceJson}
//             deviceId={deviceId}
//             onExit={() => this.setState({ deviceJson: null, deviceId: null })}
//           />
//         )}
//       </div>
//     );
//   }
// }

// export default App;




