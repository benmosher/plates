export type Workout = {
  name: string;
  description?: string;
  movements: readonly Movement[];
};

export type Movement = {
  name: string;
  sets: readonly Set[];
  restSeconds?: number;
};

export type Set = {
  reps: number;
  /** if absent, dealer's choice */
  prescribed?: Prescription;
  /** if absent, assume 1 */
  count?: number;
};

export type Prescription = Percentage | Weight;

export type Percentage = {
  type: "percentage";
  percentage: number;
  base?: string; // e.g. Squat 1RM
};

export type Weight = {
  type: "weight";
  weight: number;
};
