import { useState } from "react";

import type { Bar, BarInput } from "./plate-db";
import { numbdfined } from "./utils";
import DoubleClickConfirmButton from "./DoubleClickConfirmButton";

export default function BarEditor(props: {
  bar: Partial<Bar>;
  putBar?: (bar: BarInput) => void;
  deleteBar?: (idx: number) => void;
  barTypeDatalistId?: string;
}) {
  const [bar, setBar] = useState(props.bar);
  const { deleteBar } = props;
  const { idx } = props.bar;

  const fieldSetter =
    (field: keyof Bar) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value =
        e.target.type === "number"
          ? numbdfined(e.target.value)
          : e.target.value;
      setBar((b) => ({ ...b, [field]: value }));
    };
  const invalidator = (field: keyof Bar, optional?: boolean) => {
    if (bar[field] == props.bar[field]) return undefined;
    if (bar[field] == null) return true; // invalid
    if (!bar[field]) return !optional || bar[field] != null;
    return false; // valid (not invalid)
  };
  return (
    <article>
      <form>
        <input
          type="text"
          value={bar.name}
          onChange={fieldSetter("name")}
          placeholder="Name"
          aria-invalid={invalidator("name")}
        />
        <fieldset role="group">
          <input
            type="number"
            onChange={fieldSetter("weight")}
            value={bar.weight}
            aria-invalid={invalidator("weight")}
          />
          <input
            type="text"
            value={bar.type}
            onChange={fieldSetter("type")}
            list={props.barTypeDatalistId}
            aria-invalid={invalidator("type")}
          />
          <input
            type="number"
            value={bar.plateThreshold}
            onChange={fieldSetter("plateThreshold")}
            placeholder="(no max plate)"
            aria-invalid={invalidator("plateThreshold", true)}
          />
          <input
            type="number"
            value={bar.maxLoad}
            onChange={fieldSetter("maxLoad")}
            placeholder="(no max load)"
            aria-invalid={invalidator("maxLoad", true)}
          />
        </fieldset>
        <small>Weight / Type / Max Plate / Max Load</small>
        <fieldset className="grid">
          <input
            type="submit"
            value="Save"
            className="primary"
            disabled={bar == props.bar || !bar.name || !bar.weight || !bar.type}
            onClick={(e) => {
              e.preventDefault();
              if (props.putBar && bar.name && bar.weight && bar.type) {
                props.putBar(bar as Bar);
              }
            }}
          />

          <DoubleClickConfirmButton
            onClick={() => deleteBar!(idx!)}
            disabled={!deleteBar || idx == null}
          >
            Delete
          </DoubleClickConfirmButton>
        </fieldset>
      </form>
    </article>
  );
}
