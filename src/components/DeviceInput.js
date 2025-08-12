import React from 'react';

class DeviceInput extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      id: 'e90928ec-b121-4b03-86c3-d0534aedcb98',
    };
    this.inputRef = React.createRef();
    this.buttonRef = React.createRef();
  }

  componentDidMount() {
    // Focus input initially
    if (this.inputRef.current) {
      this.inputRef.current.focus();
    }
  }

  handleChange = (e) => {
    this.setState({ id: e.target.value.trim() });
  };

  handleClick = () => {
    const { onSubmit } = this.props;
    onSubmit(this.state.id);
  };

  handleKeyDown = (e) => {
    // Move focus between input and button with arrow keys
    if (e.key === 'ArrowDown' || e.keyCode === 40) {
      if (document.activeElement === this.inputRef.current && this.buttonRef.current) {
        this.buttonRef.current.focus();
        e.preventDefault();
      }
    }
    if (e.key === 'ArrowUp' || e.keyCode === 38) {
      if (document.activeElement === this.buttonRef.current && this.inputRef.current) {
        this.inputRef.current.focus();
        e.preventDefault();
      }
    }

    // Enter key triggers submit
    if (e.key === 'Enter' || e.keyCode === 13) {
      this.handleClick();
      e.preventDefault();
    }
  };

  render() {
    return (
      <div
        className="device-input"
        tabIndex="0" // make container focusable for keyboard events
        onKeyDown={this.handleKeyDown}
        style={{
          padding: 40,
          maxWidth: 800,
          margin: 'auto',
          color: '#fff',
          backgroundColor: '#222',
          borderRadius: 12,
          fontFamily: 'Arial, sans-serif',
          textAlign: 'center',
          userSelect: 'none',
          outline: 'none',
        }}
      >
        <h1 style={{ fontSize: 48, marginBottom: 20 }}>
          Signage Player — Enter Device UUID
        </h1>
        <p
          className="muted"
          style={{ fontSize: 24, marginBottom: 30, opacity: 0.7 }}
        >
          Paste only the last UUID from the API URL (example above)
        </p>
        <input
          ref={this.inputRef}
          value={this.state.id}
          onChange={this.handleChange}
          placeholder="e.g. e90928ec-b121-4b03-86c3-d0534aedhh98"
          tabIndex="0"
          style={{
            fontSize: 32,
            padding: '15px 20px',
            width: '100%',
            borderRadius: 8,
            border: '2px solid #555',
            outline: 'none',
            marginBottom: 40,
            boxSizing: 'border-box',
          }}
          onKeyDown={this.handleKeyDown} // handle Enter key on input
        />
        <div>
          <button
            ref={this.buttonRef}
            onClick={this.handleClick}
            tabIndex="0"
            style={{
              fontSize: 32,
              padding: '15px 40px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: '#0078D7',
              color: '#fff',
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'background-color 0.3s',
              outline: 'none',
            }}
            onFocus={(e) => (e.target.style.backgroundColor = '#005a9e')}
            onBlur={(e) => (e.target.style.backgroundColor = '#0078D7')}
            onKeyDown={this.handleKeyDown} // handle Enter key on button
          >
            Load &amp; Play
          </button>
        </div>
      </div>
    );
  }
}

export default DeviceInput;
