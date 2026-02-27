export interface WorkoutSet {
  reps: number;
  count: number;
  weight: number;
}

export interface Movement {
  name: string;
  maxId: number | null;
  /** bar selection: a bar type filter or a specific bar by id */
  bar?: { type: string } | { id: number };
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
