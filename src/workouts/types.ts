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
  /** if defined, complete within this time */
  withinSeconds?: number;
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

const timePattern = /^(\d+)\s?([smh])/;
export function parseSeconds(value: string): number | null {
  // try straight parse of numerals
  const n = Number(value);
  if (!isNaN(n)) {
    return n;
  }

  // try regex parse using first letter as unit
  const match = value.match(timePattern);
  if (match) {
    const num = Number(match[1]);
    const unit = match[2];
    if (!isNaN(num)) {
      switch (unit) {
        case "s":
          return num;
        case "m":
          return num * 60;
        case "h":
          return num * 3600;
      }
    }
  }

  return null;
}
