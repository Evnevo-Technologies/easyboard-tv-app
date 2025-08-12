import { useEffect } from 'react'

// key codes: 37=LEFT,38=UP,39=RIGHT,40=DOWN,13=ENTER,10009=RETURN (Tizen)
export default function useTVKeys(handlers = {}) {
  useEffect(() => {
    const handler = (e) => {
      const code = e.keyCode
      switch (code) {
        case 37: handlers.onPrev && handlers.onPrev(); break
        case 39: handlers.onNext && handlers.onNext(); break
        case 38: handlers.onUp && handlers.onUp(); break
        case 40: handlers.onDown && handlers.onDown(); break
        case 13: handlers.onToggle && handlers.onToggle(); break
        case 10009: // Samsung RETURN
        case 8: // Backspace fallback
          handlers.onBack && handlers.onBack()
          // try to exit app if tizen available
          if (window && window.tizen && window.tizen.application) {
            try { window.tizen.application.getCurrentApplication().exit() } catch (_) {}
          }
          break
        default: break
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [handlers])
}
