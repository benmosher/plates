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
  if (maxWeight != null) {
    params.set("pct", String(set.weight));
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
    if (maxWeight == null) return set.weight;
    return Math.round((set.weight / 100) * maxWeight);
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3>{workout.name || "(untitled)"}</h3>
        <Link to={`/workouts/${id}/edit`} role="button" className="secondary outline" style={{ width: "auto" }}>
          Edit
        </Link>
      </div>

      {workout.groups.map((group, gIdx) => {
        const movementInfos = group.movements.map((movement) => {
          const linkedMax = movement.maxId != null
            ? maxes.find((m) => m.id === movement.maxId)
            : null;
          const maxWeight = linkedMax?.weight ?? null;

          const resolved: ResolvedSet[] = [];
          let setNum = 1;
          for (const set of movement.sets) {
            for (let c = 0; c < set.count; c++) {
              const target = resolveWeight(set, maxWeight);
              const weightLabel = movement.maxId != null
                ? `${set.weight}% = ${target}`
                : `${target}`;
              resolved.push({
                label: `Set ${setNum}: ${set.reps} reps @ ${weightLabel}`,
                target,
                hash: buildSetHash(set, maxWeight, target),
              });
              setNum++;
            }
          }

          // group consecutive identical weights
          const weightGroups: { first: ResolvedSet; count: number }[] = [];
          for (const r of resolved) {
            const last = weightGroups[weightGroups.length - 1];
            if (last && last.first.target === r.target) {
              last.count++;
            } else {
              weightGroups.push({ first: r, count: 1 });
            }
          }

          return { movement, linkedMax, weightGroups };
        });

        const summaryName = movementInfos
          .map(({ movement, linkedMax }) => movement.name || linkedMax?.label || "(unnamed)")
          .join(" + ");

        return (
          <article key={gIdx}>
          <details open>
            <summary>
              <strong>{summaryName}</strong>
              {group.restSeconds != null && ` — ${formatRest(group.restSeconds)} rest`}
            </summary>

            {movementInfos.map(({ movement, linkedMax, weightGroups }, mIdx) => (
              <div key={mIdx}>
                {movementInfos.length > 1 && (
                  <small>
                    <strong>{movement.name || linkedMax?.label || "(unnamed)"}</strong>
                    {linkedMax && ` (${linkedMax.weight})`}
                  </small>
                )}
                <fieldset className="grid">
                  {weightGroups.map((wg, wgIdx) => {
                    const label = wg.count > 1
                      ? `${wg.first.label} (\u00d7${wg.count})`
                      : wg.first.label;
                    return (
                      <Link key={wgIdx} to={wg.first.hash} role="button" className="secondary outline">
                        {label}
                      </Link>
                    );
                  })}
                </fieldset>
              </div>
            ))}
          </details>
          </article>
        );
      })}
    </>
  );
}
