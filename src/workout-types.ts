export interface WorkoutSet {
  reps: number;
  count: number;
  weight: number;
}

export interface Movement {
  name: string;
  maxId: number | null;
  sets: WorkoutSet[];
}

export interface MovementGroup {
  movements: Movement[];
  restSeconds?: number;
  notes?: string | null;
}

export interface Workout {
  id?: number;
  name: string;
  groups: MovementGroup[];
}
