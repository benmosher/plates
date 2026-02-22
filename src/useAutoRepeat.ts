import { useCallback, useEffect, useRef } from "react";

export function useAutoRepeat(
  callback: () => void,
  delay = 300,
  interval = 100,
) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const onPointerDown = useCallback(() => {
    callbackRef.current();
    timer.current = setTimeout(function repeat() {
      callbackRef.current();
      timer.current = setTimeout(repeat, interval);
    }, delay);
  }, [delay, interval]);
  const onPointerUp = useCallback(() => {
    clearTimeout(timer.current);
  }, []);
  useEffect(() => onPointerUp, [onPointerUp]);
  return { onPointerDown, onPointerUp, onPointerLeave: onPointerUp };
}
