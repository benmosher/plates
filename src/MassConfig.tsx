import { memo, Suspense, useCallback, useMemo } from "react";

import BarEditor from "./BarEditor";
import type { Bar, BarInput, Plate } from "./plate-db";
import { useMassStorage } from "./plate-db";
import { numbdfined } from "./utils";

const PLATE_COUNT_MAX = 20; // arbitrary max to avoid overloading the plate space computation

export default function Config() {
  return (
    <Suspense fallback={null}>
      <RawConfig />
    </Suspense>
  );
}

const RawConfig = memo(function Config() {
  const { plates, bars, putPlate, putBar, deleteBar } = useMassStorage();
  const barTypes = useMemo(
    () => bars.reduce((set, b) => set.add(b.type), new Set<string>()),
    [bars],
  );
  return (
    <>
      <details open>
        <summary>Plates (pairs)</summary>
        <form>
          {plates.map((plate, index) => (
            <fieldset role="group" key={index}>
              <input type="number" value={plate.weight} readOnly />
              <input
                type="color"
                value={plate.color}
                onChange={(e) => putPlate({ ...plate, color: e.target.value })}
              />
              <input
                type="number"
                step={1}
                min={0}
                max={PLATE_COUNT_MAX}
                value={plate.count}
                onChange={(e) => {
                  putPlate({ ...plate, count: numbdfined(e.target.value) });
                }}
              />
              <button
                type="button"
                disabled={!plate.count}
                onClick={() =>
                  putPlate({ ...plate, count: (plate.count ?? 1) - 1 })
                }
              >
                -
              </button>
              <button
                type="button"
                disabled={plate.count != null && plate.count >= PLATE_COUNT_MAX}
                onClick={() =>
                  putPlate({ ...plate, count: (plate.count ?? 0) + 1 })
                }
              >
                +
              </button>
            </fieldset>
          ))}
        </form>
      </details>
      <details open>
        <summary>Bars</summary>
        <datalist id="bar-type-options">
          {Array.from(barTypes).map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </datalist>
        {bars.map((bar) => (
          <BarEditor
            key={bar.idx}
            bar={bar}
            putBar={putBar}
            deleteBar={deleteBar}
            barTypeDatalistId="bar-type-options"
          />
        ))}
        <BarEditor
          key={Math.max(...bars.map((b) => b.idx ?? 0)) + 1}
          bar={{
            name: "(add new)",
            type: "barbell",
            weight: 0,
            barLength: 500,
            handleWidth: 200,
          }}
          putBar={putBar}
          barTypeDatalistId="bar-type-options"
        />
      </details>
      <PlateLimitsMatrix plates={plates} bars={bars} putBar={putBar} />
      <details open>
        <summary>Ready for more?</summary>
        <ul>
          <li>
            <a href="https://amzn.to/45WSXPC">
              Loadable Olympic dumbbell handles
            </a>
          </li>
          <li>
            <a href="https://amzn.to/3JYYlKC">Fractional plate set (lb)</a>
          </li>
          <li>
            <a href="https://amzn.to/3K0g04B">10lb plates</a>
          </li>
          <li>
            <a href="https://amzn.to/4n4LCEA">5lb plates</a>
          </li>
          <li>
            <a href="https://amzn.to/4g1AaXY">2.5lb plates</a>
          </li>
          <li>
            <a href="https://amzn.to/45Rkthi">Collars</a>
          </li>
        </ul>
        <small>As an Amazon Associate, I earn from qualifying purchases.</small>
      </details>
    </>
  );
});

function PlateLimitsMatrix({
  plates,
  bars,
  putBar,
}: {
  plates: readonly Plate[];
  bars: readonly Bar[];
  putBar: (bar: BarInput) => void;
}) {
  const onChange = useCallback(
    (bar: Bar, plateWeight: number, value: string) => {
      const parsed = value === "" ? undefined : parseInt(value, 10);
      const limits = { ...bar.plateLimits };
      if (parsed == null || isNaN(parsed)) {
        delete limits[plateWeight];
      } else {
        limits[plateWeight] = Math.max(0, parsed);
      }
      const hasLimits = Object.keys(limits).length > 0;
      putBar({ ...bar, plateLimits: hasLimits ? limits : undefined });
    },
    [putBar],
  );

  return (
    <details open>
      <summary>Plate Limits</summary>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th></th>
              {bars.map((bar) => (
                <th key={bar.idx} style={{ textAlign: "center" }}>
                  {bar.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plates
              .filter((p) => p.count && p.count > 0)
              .map((p) => (
                <tr key={p.weight}>
                  <td>{p.weight}</td>
                  {bars.map((bar) => (
                    <td key={bar.idx}>
                      <input
                        type="number"
                        min={0}
                        max={p.count}
                        placeholder="-"
                        value={bar.plateLimits?.[p.weight] ?? ""}
                        onChange={(e) =>
                          onChange(bar, p.weight, e.target.value)
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
