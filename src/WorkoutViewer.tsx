import { useParams, Link } from "react-router";
import { useMassStorage } from "./plate-db";
import { WorkoutSet } from "./workout-types";

function formatRest(seconds: number): string {
  if (seconds % 60 === 0) return `${seconds / 60}min`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

function buildSetHash(set: WorkoutSet, maxWeight: number | null, target: number): string {
  const params = new URLSearchParams();
  if (set.weight.type === "percentage" && maxWeight != null) {
    params.set("pct", String(set.weight.value));
    params.set("1rm", String(maxWeight));
  } else {
    params.set("weight", String(target));
  }
  return `/#${params.toString()}`;
}

interface ResolvedSet {
  label: string;
  target: number;
  hash: string;
}

export default function WorkoutViewer() {
  const { id } = useParams<{ id: string }>();
  const { workouts, maxes } = useMassStorage();
  const workout = workouts.find((w) => w.id === Number(id));

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
            const weightLabel = set.weight.type === "percentage"
              ? `${set.weight.value}% = ${target}`
              : `${target}`;
            resolved.push({
              label: `Set ${setNum}: ${set.reps} reps @ ${weightLabel}`,
              target,
              hash: buildSetHash(set, maxWeight, target),
            });
            setNum++;
          }
        }

        // Group consecutive identical weights
        const groups: { first: ResolvedSet; count: number }[] = [];
        for (const r of resolved) {
          const last = groups[groups.length - 1];
          if (last && last.first.target === r.target) {
            last.count++;
          } else {
            groups.push({ first: r, count: 1 });
          }
        }

        return (
          <details key={mIdx} open>
            <summary>
              <strong>{movement.name || linkedMax?.label || "(unnamed)"}</strong>
              {linkedMax && ` (${linkedMax.weight})`}
              {movement.restSeconds != null && ` — ${formatRest(movement.restSeconds)} rest`}
            </summary>
            <div className="grid">
            {groups.map((group, gIdx) => {
              const label = group.count > 1
                ? `${group.first.label} (\u00d7${group.count})`
                : group.first.label;
              return (
                <Link key={gIdx} to={group.first.hash} role="button" className="secondary outline">
                  {label}
                </Link>
              );
            })}
            </div>
          </details>
        );
      })}
    </>
  );
}
