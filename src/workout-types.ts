export interface WorkoutSet {
  reps: number;
  count: number;
  weight: number;
}

export interface Movement {
  name: string;
  maxId: number | null;
  /** bar type filter (e.g. "barbell", "dumbbell") */
  barType?: string;
  /** specific bar index (from Bar.idx) */
  barId?: number;
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
  folder?: string;
  groups: MovementGroup[];
}
