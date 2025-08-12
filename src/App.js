import React from 'react';
import DeviceInput from './components/DeviceInput';
import Player from './components/Player';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      deviceJson: null,
      deviceId: null,
    };
  }

  loadFromUUID = (uuid) => {
    this.setState({ deviceJson: null, deviceId: null });

    // basic UUID-ish validation (allow dashes)
    if (!uuid || !/^[0-9a-fA-F-]{8,}$/i.test(uuid)) {
      alert('Enter a valid UUID-like id (example: e90928ec-b121-4b03-86c3-d0534aedcb98)');
      return;
    }

    const url = `https://devices.dev.easyboard.co.in/${uuid}/`;
    fetch(url, { cache: 'no-store' })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} - ${res.statusText}`);
        }
        return res.json();
      })
      .then(json => {
        // set only if looks like device JSON
        this.setState({ deviceJson: json, deviceId: uuid });
      })
      .catch(err => {
        console.error(err);
        alert(
          'Failed to fetch device JSON.\nPossible reasons:\n- wrong UUID\n- CORS blocked by API server\n- network unreachable\n\nDetails: ' +
            err.message
        );
      });
  };

  render() {
    const { deviceJson, deviceId } = this.state;
    return (
      <div className="app-root">
        {!deviceJson ? (
          <DeviceInput onSubmit={this.loadFromUUID} />
        ) : (
          <Player
            data={deviceJson}
            deviceId={deviceId}
            onExit={() => this.setState({ deviceJson: null, deviceId: null })}
          />
        )}
      </div>
    );
  }
}

export default App;
