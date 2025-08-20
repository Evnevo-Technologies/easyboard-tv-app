import React, { useState, useRef, useEffect } from "react";

function DeviceInput({ onSubmit }) {
  const [id, setId] = useState("e90928ec-b121-4b03-86c3-d0534aedcb98");
  const inputRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    // Focus input initially
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleChange = (e) => {
    setId(e.target.value.trim());
  };

  const handleClick = () => {
    if (onSubmit) {
      onSubmit(id);
    }
  };

  const handleKeyDown = (e) => {
    // Move focus between input and button with arrow keys
    if (e.key === "ArrowDown" || e.keyCode === 40) {
      if (document.activeElement === inputRef.current && buttonRef.current) {
        buttonRef.current.focus();
        e.preventDefault();
      }
    }
    if (e.key === "ArrowUp" || e.keyCode === 38) {
      if (document.activeElement === buttonRef.current && inputRef.current) {
        inputRef.current.focus();
        e.preventDefault();
      }
    }

    // Enter key triggers submit
    if (e.key === "Enter" || e.keyCode === 13) {
      handleClick();
      e.preventDefault();
    }
  };

  return (
    <div
      className="device-input"
      tabIndex="0"
      onKeyDown={handleKeyDown}
      style={{
        padding: 40,
        maxWidth: 800,
        margin: "auto",
        color: "#fff",
        backgroundColor: "#222",
        borderRadius: 12,
        fontFamily: "Arial, sans-serif",
        textAlign: "center",
        userSelect: "none",
        outline: "none",
      }}
    >
      {/* <h1 style={{ fontSize: 48, marginBottom: 20 }}>
        Signage Player — Enter Device UUID
      </h1>
      <p
        className="muted"
        style={{ fontSize: 24, marginBottom: 30, opacity: 0.7 }}
      >
        Paste only the last UUID from the API URL (example above)
      </p> */}
      <input
        ref={inputRef}
        value={id}
        onChange={handleChange}
        placeholder="e.g. e90928ec-b121-4b03-86c3-d0534aedhh98"
        tabIndex="0"
        style={{
          fontSize: 32,
          padding: "15px 20px",
          width: "100%",
          borderRadius: 8,
          border: "2px solid #555",
          outline: "none",
          marginBottom: 40,
          boxSizing: "border-box",
        }}
        onKeyDown={handleKeyDown}
      />
      <div>
        <button
          ref={buttonRef}
          onClick={handleClick}
          tabIndex="0"
          style={{
            fontSize: 32,
            padding: "15px 40px",
            borderRadius: 8,
            border: "none",
            backgroundColor: "#0078D7",
            color: "#fff",
            cursor: "pointer",
            userSelect: "none",
            transition: "background-color 0.3s",
            outline: "none",
          }}
          onFocus={(e) => (e.target.style.backgroundColor = "#005a9e")}
          onBlur={(e) => (e.target.style.backgroundColor = "#0078D7")}
          onKeyDown={handleKeyDown}
        >
          Load &amp; Play
        </button>
      </div>
    </div>
  );
}

export default DeviceInput;



