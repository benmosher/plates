export interface WorkoutSet {
  reps: number;
  count: number;
  weight:
    | { type: "absolute"; value: number }
    | { type: "percentage"; value: number };
}

export interface Movement {
  name: string;
  maxId: number | null;
  sets: WorkoutSet[];
  restSeconds?: number;
}

export interface Workout {
  id?: number;
  name: string;
  movements: Movement[];
}
