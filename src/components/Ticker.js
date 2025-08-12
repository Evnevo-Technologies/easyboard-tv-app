import React from 'react';

class Ticker extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentIndex: 0,
      textWidth: 0,
    };
    this.textRef = React.createRef();
    this.timer = null;
  }

  componentDidMount() {
    this.updateTextWidthAndStartTimer();
  }

  componentDidUpdate(prevProps, prevState) {
    if (
      prevState.currentIndex !== this.state.currentIndex ||
      prevProps.items !== this.props.items
    ) {
      this.updateTextWidthAndStartTimer();
    }
  }

  componentWillUnmount() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  updateTextWidthAndStartTimer() {
    const { items } = this.props;
    const { currentIndex } = this.state;

    if (!items || items.length === 0) return;
    if (!this.textRef.current) return;

    // Measure text width AFTER render
    const width = this.textRef.current.scrollWidth;

    this.setState({ textWidth: width });

    const current = items[currentIndex];
    const speed = (current && current.speed) || 50; // px/sec
    const duration = (width + window.innerWidth) / speed; // seconds

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      this.setState({
        currentIndex: (currentIndex + 1) % items.length,
      });
    }, duration * 1000);
  }

  render() {
    const { items = [] } = this.props;
    const { currentIndex, textWidth } = this.state;

    if (!items || items.length === 0) return null;

    const current = items[currentIndex];
    const fontSize = parseInt(current.fontsize, 10) || 20;
    const speed = current.speed || 50;
    const duration = (textWidth + window.innerWidth) / speed;

    const marqueeAnimation = textWidth
      ? `ticker-marquee ${duration}s linear infinite`
      : 'none';

    return (
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1300,
          background: current.background || 'rgba(0,0,0,0.8)',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          height: `${fontSize + 10}px`,
        }}
      >
        <div
          ref={this.textRef}
          style={{
            display: 'inline-block',
            paddingLeft: '100%',
            fontSize: `${fontSize}px`,
            color: current.color || '#fff',
            animation: marqueeAnimation,
          }}
        >
          {current.text}
        </div>

        <style>
          {`
            @keyframes ticker-marquee {
              0% { transform: translateX(0); }
              100% { transform: translateX(-100%); }
            }
          `}
        </style>
      </div>
    );
  }
}

export default Ticker;
