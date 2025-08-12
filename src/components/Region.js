import React from 'react';

class Region extends React.Component {
  constructor(props) {
    super(props);

    const playlist = (props.region.playlist || []).filter(Boolean);

    this.state = {
      index: 0,
      playlist: playlist,
    };

    this.timer = null;
    this.videoRef = React.createRef();
    this.paused = false;

    this.handleTVControl = this.handleTVControl.bind(this);
    this.onGlobalPause = this.onGlobalPause.bind(this);
    this.onGlobalResume = this.onGlobalResume.bind(this);
    this.handleVideoEnded = this.handleVideoEnded.bind(this);
  }

  componentDidMount() {
    window.addEventListener('tv-control', this.handleTVControl);
    window.addEventListener('global-pause', this.onGlobalPause);
    window.addEventListener('global-resume', this.onGlobalResume);

    this.resetTimer();
  }

  componentWillUnmount() {
    window.removeEventListener('tv-control', this.handleTVControl);
    window.removeEventListener('global-pause', this.onGlobalPause);
    window.removeEventListener('global-resume', this.onGlobalResume);
    this.clearTimer();
  }

  componentDidUpdate(prevProps, prevState) {
    // If playlist or index or settings changed, reset timer
    if (
      prevState.index !== this.state.index ||
      prevState.playlist !== this.state.playlist ||
      prevProps.settings !== this.props.settings
    ) {
      this.resetTimer();
    }
  }

  clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  resetTimer() {
    this.clearTimer();

    const { index, playlist } = this.state;
    const { settings } = this.props;

    if (!playlist.length) return;

    const cur = playlist[index];
    if (!cur) return;

    if (cur.type === 'image') {
      const dur = cur.duration || settings.imageDuration || 8000;
      this.timer = setTimeout(() => this.nextIndex(), dur);
    } else if (cur.type === 'video') {
      if (settings.videoDuration && !cur.duration) {
        this.timer = setTimeout(() => this.nextIndex(), settings.videoDuration);
      }
    } else if (cur.type === 'web' || cur.type === 'url') {
      if (settings.webDuration && !cur.duration) {
        this.timer = setTimeout(() => this.nextIndex(), settings.webDuration);
      }
    }
  }

  nextIndex() {
    this.setState((state) => ({
      index: (state.index + 1) % state.playlist.length,
    }));
  }

  prevIndex() {
    this.setState((state) => ({
      index: (state.index - 1 + state.playlist.length) % state.playlist.length,
    }));
  }

  handleTVControl(ev) {
    const action = ev && ev.detail && ev.detail.action;
    if (!action) return;

    const { playlist, index } = this.state;

    if (action === 'next') {
      this.nextIndex();
    } else if (action === 'prev') {
      this.prevIndex();
    } else if (action === 'toggle-play') {
      const cur = playlist[index];
      const videoEl = this.videoRef.current;

      if (cur && cur.type === 'video' && videoEl) {
        if (videoEl.paused) videoEl.play().catch(() => {});
        else videoEl.pause();
      } else {
        // images: toggle rotation pause
        if (this.timer) {
          this.clearTimer();
          this.paused = true;
        } else {
          this.paused = false;
          const dur = cur.duration || (this.props.settings.imageDuration || 8000);
          this.timer = setTimeout(() => this.nextIndex(), dur);
        }
      }
    }
  }

  onGlobalPause() {
    const videoEl = this.videoRef.current;
    if (videoEl && !videoEl.paused) {
      videoEl.pause();
    }
    this.clearTimer();
  }

  onGlobalResume() {
    const { index, playlist } = this.state;
    const videoEl = this.videoRef.current;
    const { settings } = this.props;
    const cur = playlist[index];

    if (cur && cur.type === 'video' && videoEl) {
      videoEl.play().catch(() => {});
    } else {
      const dur = (cur && (cur.duration || settings.imageDuration)) || 8000;
      this.timer = setTimeout(() => this.nextIndex(), dur);
    }
  }

  handleVideoEnded() {
    this.nextIndex();
  }

  render() {
    const { region, settings } = this.props;
    const { playlist, index } = this.state;

    const x = (region.data_grid && region.data_grid.x) || 0;
    const y = (region.data_grid && region.data_grid.y) || 0;
    const w = (region.data_grid && region.data_grid.w) || 1;
    const h = (region.data_grid && region.data_grid.h) || 1;

    const regionStyle = {
      gridColumn: `${x + 1} / ${x + 1 + w}`,
      gridRow: `${y + 1} / ${y + 1 + h}`,
      overflow: 'hidden',
      background: '#000',
    };

    if (!playlist.length) return <div style={regionStyle}></div>;

    const item = playlist[index];
    const objectFit = settings.stretching ? 'fill' : 'contain';
    const allowSound = (region.sound || '').toLowerCase() === 'unmute';

    if (item.type === 'image') {
      return (
        <div style={regionStyle} className="region">
          <img
            src={item.url}
            alt={item.caption || ''}
            style={{ width: '100%', height: '100%', objectFit }}
          />
        </div>
      );
    } else if (item.type === 'video') {
      return (
        <div style={regionStyle} className="region">
          <video
            ref={this.videoRef}
            key={item.url + index}
            src={item.url}
            autoPlay
            playsInline
            muted={!allowSound}
            controls={false}
            onEnded={this.handleVideoEnded}
            style={{ width: '100%', height: '100%', objectFit }}
          />
        </div>
      );
    } else if (item.type === 'web' || item.type === 'url') {
      return (
        <div style={regionStyle} className="region">
          <iframe
            src={item.url}
            title={item.caption || 'web-item'}
            style={{ width: '100%', height: '100%', border: 0 }}
          />
        </div>
      );
    } else {
      return (
        <div style={regionStyle} className="region">
          <div style={{ color: '#fff', padding: 10 }}>
            Unsupported item type: {item.type}
          </div>
        </div>
      );
    }
  }
}

export default Region;
