import { useSpring, animated } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";
import { Plate, Bar } from "plate-db";
import { memo } from "react";

export default memo(function BarView(props: {
  determinedPlates: readonly (Plate & { count: number })[];
  bar: Bar | null | undefined;
}) {
  const stack = props.determinedPlates.flatMap((plate) =>
    Array.from({ length: plate.count }, (_, j) => (
      <DisplayPlate key={`${plate.weight}-${j}`} {...plate} />
    ))
  );
  const [{ y }, api] = useSpring(() => ({
    y: 0,
    config: { frequency: 0.4, damping: 0.3 },
  }));
  const bind = useDrag(({ down, movement: [, my] }) => {
    api.start({ y: down ? Math.min(my, 0) : 0 });
  });
  return (
    <>
      <animated.section
        {...bind()}
        style={{
          height: 245,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          y: y.to((v) => -Math.abs(v)),
          touchAction: "none",
        }}
      >
        {NUBBIN}
        {stack.toReversed()}
        <Handle barLength={props.bar?.barLength ?? 500} />
        {stack}
        {NUBBIN}
      </animated.section>
      <section>
        <center>
          <h4>
            {props.determinedPlates.length ? (
              <span>
                {props.determinedPlates
                  .map((p) =>
                    p.count > 1 ? `${p.weight}x${p.count}` : p.weight
                  )
                  .join(", ") || "(empty)"}
              </span>
            ) : (
              "No valid plate combination!"
            )}
          </h4>
        </center>
      </section>
    </>
  );
});

const DisplayPlate = memo(function DisplayPlate({
  thicknessMm,
  diameterMm,
  color,
}: Pick<Plate, "thicknessMm" | "diameterMm" | "color">) {
  return (
    <div
      style={{
        width: thicknessMm,
        height: diameterMm,
        border: "1px solid",
        background: color,
        borderRadius: 8,
        margin: "0 -0.5px",
      }}
    >
      &nbsp;
    </div>
  );
});

const HANDLE_COLOR = "#A4ACBA";
const NUBBIN = (
  <div
    style={{
      width: 8,
      height: 30,
      margin: "0 -4px",
      zIndex: -1,
      overflow: "visible",
      background: HANDLE_COLOR,
      border: "1px solid",
      borderRadius: 2,
      flexShrink: 0,
    }}
  />
);

const Handle = memo(function Handle({ barLength }: { barLength: number }) {
  return (
    <>
      {NUBBIN}
      <div
        style={{
          border: "1px solid",
          borderRadius: 4,
          maxWidth: "95%",
          // flexShrink: 1,
          width: barLength,
          height: 18,
          margin: `0 -100px`,
          background: HANDLE_COLOR,
          zIndex: -2,
        }}
      />
      {NUBBIN}
    </>
  );
});
