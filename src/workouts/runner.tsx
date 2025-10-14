import { Suspense } from "react";
import { useParams } from "react-router";
import { useWorkout } from "./db";

export default function WorkoutRunner() {
  const { workoutId } = useParams<{ workoutId: string }>();
  return (
    <section>
      <h2>Workout Runner</h2>
      <Suspense fallback={<div>Loading...</div>}>
        <RunningWorkout id={+workoutId} />
      </Suspense>
    </section>
  );
}

function RunningWorkout({ id }: { id: number }) {
  console.log("rendering");
  const workout = useWorkout(id);
  console.log("got workout", workout);
  return <div>Running workout {id}</div>;
}
