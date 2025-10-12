import { animated, useSpring } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";
import DoubleClickConfirmButton from "./DoubleClickConfirmButton";

export function HiddenDeleteFieldset({
  children,
  onDelete,
}: {
  children: React.ReactNode;
  onDelete: () => void;
}) {
  // swipe to delete
  const [{ x, y }, api] = useSpring(() => ({ x: 0, y: 0 }));
  const bind = useDrag(({ down, movement: [mx] }) => {
    const xStop = mx < -95 ? -95 : 0;
    const clamped = clamp(mx, -120, 20);
    if (down && (mx > 20 || mx < -120)) return; // don't drag too far
    api.start({ x: down ? clamped : xStop, y: 0 });
  });
  return (
    <div style={{ position: "relative" }}>
      <DoubleClickConfirmButton
        style={{
          position: "absolute",
          right: 0,
        }}
        onClick={onDelete}
      >
        Delete
      </DoubleClickConfirmButton>
      <animated.fieldset
        role="group"
        {...bind()}
        style={{ x, y, touchAction: "none" }}
      >
        {children}
      </animated.fieldset>
    </div>
  );
}

function clamp(x: number, min: number, max: number) {
  return x < min ? min : x > max ? max : x;
}
