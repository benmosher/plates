import { useParams, Link } from "react-router";
import { useMassStorage } from "./plate-db";
import { WorkoutSet } from "./workout-types";

function formatRest(seconds: number): string {
  if (seconds % 60 === 0) return `${seconds / 60}min`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

function buildSetHash(set: WorkoutSet, maxWeight: number | null): string {
  const params = new URLSearchParams();
  if (maxWeight != null) {
    params.set("pct", String(set.weight));
    params.set("1rm", String(maxWeight));
  } else {
    params.set("weight", String(set.weight));
  }
  return `/#${params.toString()}`;
}

export default function WorkoutViewer() {
  const { id } = useParams<{ id: string }>();
  const { workouts, maxes } = useMassStorage();
  const workout = workouts.find((w) => w.id === Number(id));

  if (!workout) return <p>Workout not found.</p>;

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
          return { movement, linkedMax, maxWeight: linkedMax?.weight ?? null };
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

            {group.notes && <p><small>{group.notes}</small></p>}

            {movementInfos.map(({ movement, linkedMax, maxWeight }, mIdx) => (
              <div key={mIdx}>
                {movementInfos.length > 1 && (
                  <small>
                    <strong>{movement.name || linkedMax?.label || "(unnamed)"}</strong>
                    {linkedMax && ` (${linkedMax.weight})`}
                  </small>
                )}
                <fieldset className="grid">
                  {movement.sets.map((set, sIdx) => {
                    const reps = `${set.reps} reps`;
                    const weight = set.weight
                      ? ` @ ${set.weight}${movement.maxId != null ? "%" : ""}`
                      : "";
                    const count = set.count > 1 ? `${set.count} \u00d7 ` : "";
                    if (!set.weight) {
                      return (
                        <a key={sIdx} role="button" className="secondary outline" aria-disabled="true">
                          {count}{reps}{weight}
                        </a>
                      );
                    }
                    return (
                      <Link key={sIdx} to={buildSetHash(set, maxWeight)} role="button" className="secondary outline">
                        {count}{reps}{weight}
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
