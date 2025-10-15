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

export function parseSeconds(value: string): number | null {
  // try straight parse of numerals
  const n = Number(value);
  if (!isNaN(n)) {
    return n;
  }

  // try regex parse using first letter as unit
  const timePattern = /(\d+)\s?([smh])/g;
  let match = timePattern.exec(value);
  let total = 0;
  while (match) {
    const num = Number(match[1]);
    const unit = match[2];
    if (!isNaN(num)) {
      switch (unit) {
        case "s":
          total += num;
          break;
        case "m":
          total += num * 60;
          break;
        case "h":
          total += num * 3600;
      }
    }
    match = timePattern.exec(value);
  }

  if (total > 0) {
    return total;
  } else {
    return null;
  }
}

export function stringifySeconds(seconds: number | undefined): string {
  let string = "";
  if (!seconds) {
    return string;
  }
  let rest = seconds;
  if (rest >= 3600) {
    const hours = Math.floor(rest / 3600);
    rest = rest % 3600;
    string += `${hours}h`;
  }
  if (rest >= 60) {
    const minutes = Math.floor(rest / 60);
    rest = rest % 60;
    string += `${minutes}m`;
  }
  if (rest > 0) {
    string += `${rest}s`;
  }
  return string;
}
