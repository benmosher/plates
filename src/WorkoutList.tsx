import { Link, useNavigate } from "react-router";
import { useMassStorage } from "./plate-db";
import { HiddenDeleteFieldset } from "./HiddenDeleteFieldset";

export default function WorkoutList() {
  const { workouts, putWorkout, deleteWorkout } = useMassStorage();
  const navigate = useNavigate();

  return (
    <>
      <h3>Workouts</h3>
      {workouts.length === 0 && <p>No saved workouts yet.</p>}
      {workouts.map((w) => (
        <HiddenDeleteFieldset
          key={w.id}
          onDelete={() => deleteWorkout(w.id!)}
        >
          <Link to={`/workouts/${w.id}/edit`} style={{ flex: 1 }}>
            {w.name || "(untitled)"}
          </Link>
          <Link to={`/workouts/${w.id}/view`} role="button" className="secondary outline" style={{ width: "auto" }}>
            View
          </Link>
        </HiddenDeleteFieldset>
      ))}
      <button
        type="button"
        onClick={async () => {
          const id = await putWorkout({ name: "", movements: [] });
          navigate(`/workouts/${id}/edit`);
        }}
      >
        New workout
      </button>
    </>
  );
}
