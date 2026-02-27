import { useAutoRepeat } from "./useAutoRepeat";
import { numbdfined } from "./utils";

export function NumberInput({
  value,
  onChange,
  step,
  min,
  max,
  style,
  ...inputProps
}: {
  value: number | null | undefined;
  onChange: (value: number | undefined) => void;
  step?: number;
  min?: number;
  max?: number;
  style?: React.CSSProperties;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type" | "step" | "min" | "max" | "style"
>) {
  const nudgeDown = useAutoRepeat(() => {
    if (step == null) return;
    const prev = Math.ceil((value ?? 0) / step) * step - step;
    if (min != null && prev < min) return;
    onChange(prev);
  });

  const nudgeUp = useAutoRepeat(() => {
    if (step == null) return;
    const next = Math.floor((value ?? 0) / step) * step + step;
    if (max != null && next > max) return;
    onChange(next);
  });

  return (
    <fieldset role="group" style={style}>
      {step != null && (
        <button
          type="button"
          className="secondary"
          style={{ width: "auto", paddingInline: "0.5rem" }}
          {...nudgeDown}
        >
          -{step}
        </button>
      )}
      <input
        type="number"
        value={value ?? ""}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(numbdfined(e.target.value))}
        {...inputProps}
      />
      {step != null && (
        <button
          type="button"
          className="secondary"
          style={{ width: "auto", paddingInline: "0.5rem" }}
          {...nudgeUp}
        >
          {step}+
        </button>
      )}
    </fieldset>
  );
}
