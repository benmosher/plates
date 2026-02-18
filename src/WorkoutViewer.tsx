import { useParams, Link } from "react-router";
import { useMassStorage, Plate, Bar } from "./plate-db";
import { WorkoutSet } from "./workout-types";
import { chooseBar, determinePlates } from "./plate-math";
import BarView from "./BarView";
import { useMemo } from "react";

interface ResolvedSet {
  label: string;
  target: number;
  bar: Bar | null;
  plates: readonly (Plate & { count: number })[];
}

export default function WorkoutViewer() {
  const { id } = useParams<{ id: string }>();
  const { workouts, plates, bars, maxes } = useMassStorage();
  const workout = workouts.find((w) => w.id === Number(id));

  const validPlates = useMemo<readonly (Plate & { count: number })[]>(() => {
    const filtered = plates.filter((p) => p.count && p.weight) as (Plate & {
      count: number;
    })[];
    filtered.sort((a, b) => a.weight - b.weight);
    return filtered;
  }, [plates]);

  if (!workout) return <p>Workout not found.</p>;

  function resolveWeight(set: WorkoutSet, maxWeight: number | null): number {
    if (set.weight.type === "absolute") return set.weight.value;
    if (maxWeight == null) return 0;
    return Math.round((set.weight.value / 100) * maxWeight);
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3>{workout.name || "(untitled)"}</h3>
        <Link to={`/workouts/${id}/edit`} role="button" className="secondary outline" style={{ width: "auto" }}>
          Edit
        </Link>
      </div>

      {workout.movements.map((movement, mIdx) => {
        const linkedMax = movement.maxId != null
          ? maxes.find((m) => m.id === movement.maxId)
          : null;
        const maxWeight = linkedMax?.weight ?? null;

        // Expand sets by count and resolve weights
        const resolved: ResolvedSet[] = [];
        let setNum = 1;
        for (const set of movement.sets) {
          for (let c = 0; c < set.count; c++) {
            const target = resolveWeight(set, maxWeight);
            const bar = chooseBar(bars, target, "barbell");
            const detPlates = determinePlates(target, bar, validPlates);
            const weightLabel = set.weight.type === "percentage"
              ? `${set.weight.value}% = ${target}`
              : `${target}`;
            resolved.push({
              label: `Set ${setNum}: ${set.reps} reps @ ${weightLabel}`,
              target,
              bar,
              plates: detPlates,
            });
            setNum++;
          }
        }

        // Group consecutive identical weights
        const groups: { sets: ResolvedSet[]; count: number }[] = [];
        for (const r of resolved) {
          const last = groups[groups.length - 1];
          if (last && last.sets[0].target === r.target) {
            last.sets.push(r);
            last.count++;
          } else {
            groups.push({ sets: [r], count: 1 });
          }
        }

        return (
          <details key={mIdx} open>
            <summary>
              <strong>{movement.name || linkedMax?.label || "(unnamed)"}</strong>
              {linkedMax && ` (${linkedMax.weight})`}
            </summary>
            {groups.map((group, gIdx) => {
              const first = group.sets[0];
              const label = group.count > 1
                ? `${first.label} (\u00d7${group.count})`
                : first.label;
              return (
              <section key={gIdx}>
                <small>{label}</small>
                <BarView determinedPlates={first.plates} bar={first.bar} />
              </section>
              );
            })}
          </details>
        );
      })}
    </>
  );
}
