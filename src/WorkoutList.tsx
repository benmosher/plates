import { Link, useNavigate } from "react-router";
import { useMassStorage } from "./plate-db";
import { Workout } from "./workout-types";
import { useMemo } from "react";
import ShareDialog from "./ShareDialog";

const btnStyle: React.CSSProperties = { width: "auto", padding: "0.25rem 0.5rem", fontSize: "0.75rem", margin: 0 };

function WorkoutRow({ workout }: { workout: Workout }) {
  return (
    <tr>
      <td>
        <Link to={`/workouts/${workout.id}/view`}>
          {workout.name || "(untitled)"}
        </Link>
      </td>
      <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
        <span style={{ display: "inline-flex", gap: "0.25rem" }}>
          <ShareDialog workout={workout} buttonStyle={btnStyle} />
          <Link to={`/workouts/${workout.id}/edit`} role="button" className="secondary outline" style={btnStyle}>
            Edit
          </Link>
        </span>
      </td>
    </tr>
  );
}

function WorkoutTable({ workouts }: { workouts: readonly Workout[] }) {
  return (
    <table>
      <tbody>
        {workouts.map((w) => <WorkoutRow key={w.id} workout={w} />)}
      </tbody>
    </table>
  );
}

export default function WorkoutList() {
  const { workouts, putWorkout } = useMassStorage();
  const navigate = useNavigate();

  const { unfiled, folders } = useMemo(() => {
    const unfiled: Workout[] = [];
    const folderMap = new Map<string, Workout[]>();
    for (const w of workouts) {
      if (w.folder) {
        let list = folderMap.get(w.folder);
        if (!list) { list = []; folderMap.set(w.folder, list); }
        list.push(w);
      } else {
        unfiled.push(w);
      }
    }
    // sort folder names alphabetically
    const folders = [...folderMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return { unfiled, folders };
  }, [workouts]);

  return (
    <>
      <h3>Workouts</h3>
      {workouts.length === 0 ? (
        <p>No saved workouts yet.</p>
      ) : (
        <>
          {folders.map(([folder, items]) => (
            <details key={folder} open>
              <summary><strong>{folder}</strong></summary>
              <WorkoutTable workouts={items} />
            </details>
          ))}
          {unfiled.length > 0 && (
            <details open>
              <summary><strong>Unfiled</strong></summary>
              <WorkoutTable workouts={unfiled} />
            </details>
          )}
        </>
      )}
      <button
        type="button"
        onClick={async () => {
          const id = await putWorkout({
            name: "",
            groups: [
              {
                movements: [
                  { name: "", maxId: null, sets: [{ reps: 5, count: 1, weight: 0 }] },
                ],
              },
            ],
          });
          navigate(`/workouts/${id}/edit`);
        }}
      >
        New workout
      </button>
    </>
  );
}
