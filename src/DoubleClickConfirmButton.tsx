import { useEffect, useState } from "react";

export default function DoubleClickConfirmButton(props: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const handle = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(handle);
  }, [armed]);
  return (
    <button
      type="button"
      className="secondary"
      disabled={props.disabled}
      onClick={() => {
        if (armed) {
          props.onClick();
          setArmed(false);
        } else {
          setArmed(true);
        }
      }}
      onBlur={() => setArmed(false)}
      title={armed ? "Click again to confirm" : "Click twice to confirm"}
      style={{
        background: armed ? "#C52F21" : undefined,
        color: armed ? "#F1F1F1" : undefined,
        ...props.style,
      }}
    >
      {props.children}
    </button>
  );
}
