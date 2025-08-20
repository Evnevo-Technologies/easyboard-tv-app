import { useEffect } from "react";

// Key codes: 37=LEFT, 38=UP, 39=RIGHT, 40=DOWN, 13=ENTER, 10009=RETURN (Tizen)
export default function useTVKeys(handlers) {
  useEffect(() => {
    const handler = (e) => {
      const code = e.keyCode;

      switch (code) {
        case 37: // LEFT
          if (handlers && handlers.onPrev) handlers.onPrev();
          break;
        case 39: // RIGHT
          if (handlers && handlers.onNext) handlers.onNext();
          break;
        case 38: // UP
          if (handlers && handlers.onUp) handlers.onUp();
          break;
        case 40: // DOWN
          if (handlers && handlers.onDown) handlers.onDown();
          break;
        case 13: // ENTER
          if (handlers && handlers.onToggle) handlers.onToggle();
          break;
        case 10009: // Samsung RETURN
        case 8: // Backspace fallback
          if (handlers && handlers.onBack) handlers.onBack();
          // Exit app if running on Tizen
          if (typeof window !== "undefined" && window.tizen?.application) {
            try {
              window.tizen.application.getCurrentApplication().exit();
            } catch (_) {
              // ignore errors
            }
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", handler);

    return () => {
      document.removeEventListener("keydown", handler);
    };
  }, [handlers]);
}



