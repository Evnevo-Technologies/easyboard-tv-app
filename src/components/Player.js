import React from 'react';
import Region from './Region';
import Ticker from './Ticker';
// Note: useTVKeys is a custom hook, so you need to convert its logic or call its equivalent inside lifecycle

class Player extends React.Component {
  constructor(props) {
    super(props);

    const { data } = props;
    const settings = (data && data.settings) || {};
    const channel = (data && data.channel) || {};

    this.state = {
      globalPaused: false,
      settings: settings,
      channel: channel,
      gridX: channel.gridX || 12,
      gridY: channel.gridY || 12,
      regions: channel.regions || [],
      tickers: channel.tickers || [],
    };

    this.handleGlobalPause = this.handleGlobalPause.bind(this);
    this.handleGlobalResume = this.handleGlobalResume.bind(this);
    this.onNext = this.onNext.bind(this);
    this.onPrev = this.onPrev.bind(this);
    this.onToggle = this.onToggle.bind(this);
    this.onBack = this.onBack.bind(this);
  }

  componentDidMount() {
    window.addEventListener('global-pause', this.handleGlobalPause);
    window.addEventListener('global-resume', this.handleGlobalResume);

    // Simulate useTVKeys behavior with keyboard event listeners
    window.addEventListener('keydown', this.handleKeyDown);
  }

  componentWillUnmount() {
    window.removeEventListener('global-pause', this.handleGlobalPause);
    window.removeEventListener('global-resume', this.handleGlobalResume);
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  handleGlobalPause() {
    this.setState({ globalPaused: true });
  }

  handleGlobalResume() {
    this.setState({ globalPaused: false });
  }

  handleKeyDown = (e) => {
    // Map keys for TV keys control
    switch (e.key) {
      case 'ArrowRight': // next
        this.onNext();
        break;
      case 'ArrowLeft': // prev
        this.onPrev();
        break;
      case 'Enter': // toggle play/pause
        this.onToggle();
        break;
      case 'Backspace': // back/exit
      case 'Escape':
        this.onBack();
        break;
      default:
        break;
    }
  };

  onNext() {
    window.dispatchEvent(new CustomEvent('tv-control', { detail: { action: 'next' } }));
  }

  onPrev() {
    window.dispatchEvent(new CustomEvent('tv-control', { detail: { action: 'prev' } }));
  }

  onToggle() {
    window.dispatchEvent(new CustomEvent('tv-control', { detail: { action: 'toggle-play' } }));
  }

  onBack() {
    if (this.props.onExit) {
      this.props.onExit();
    }
  }

  render() {
    const { settings, gridX, gridY, regions, tickers } = this.state;
    const { deviceId } = this.props;

    const gridStyle = {
      display: 'grid',
      gridTemplateColumns: `repeat(${gridX}, 1fr)`,
      gridTemplateRows: `repeat(${gridY}, 1fr)`,
      width: '100vw',
      height: '100vh',
    };

    return (
      <div className="player-root">
        <div className="player-top">
          <div>{settings.device_name || `Device ${deviceId}`}</div>
          <div className="small">
            Press LEFT / RIGHT to change slides, ENTER to play/pause, RETURN to exit
          </div>
        </div>

        <div className="player-grid" style={gridStyle}>
          {regions.map((r, idx) => (
            <Region key={idx} region={r} settings={settings} />
          ))}
        </div>

        {tickers && tickers.length > 0 && <Ticker items={tickers} />}
      </div>
    );
  }
}

export default Player;
