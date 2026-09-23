import { LIFTING_WORKOUT_SLUGS } from "@/lib/lifting";

export const WORKOUT_GENERATORS = {
  "linear-5x5-mwf": {
    label: "Linear 5×5 (Mon / Wed / Fri)",
    description: "12 sessions over 4 weeks: squat & bench emphasis, clean on Wednesday, deload on week 4.",
  },
} as const;

export type WorkoutGeneratorKey = keyof typeof WORKOUT_GENERATORS;

export type GeneratedWorkoutDay = {
  date: Date;
  name: string;
  isDeload: boolean;
  exercises: { activitySlug: string; defaultSets: number; defaultReps: number; notes?: string }[];
};

const MWF = [1, 3, 5];

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function collectWeekdayDates(start: Date, count: number, weekdays: number[]): Date[] {
  const out: Date[] = [];
  let cursor = new Date(`${start.toISOString().slice(0, 10)}T12:00:00`);
  while (out.length < count) {
    if (weekdays.includes(cursor.getDay())) {
      out.push(new Date(cursor));
    }
    cursor = addDays(cursor, 1);
  }
  return out;
}

type DayBlueprint = { label: string; exercises: GeneratedWorkoutDay["exercises"] };

const LINEAR_ROTATION: DayBlueprint[] = [
  {
    label: "Squat + Bench",
    exercises: [
      { activitySlug: "squat", defaultSets: 5, defaultReps: 5 },
      { activitySlug: "bench-press", defaultSets: 5, defaultReps: 5 },
    ],
  },
  {
    label: "Squat + Clean",
    exercises: [
      { activitySlug: "squat", defaultSets: 5, defaultReps: 5 },
      { activitySlug: "hang-clean", defaultSets: 5, defaultReps: 3 },
    ],
  },
  {
    label: "Squat + Bench + Pull-ups",
    exercises: [
      { activitySlug: "squat", defaultSets: 5, defaultReps: 5 },
      { activitySlug: "bench-press", defaultSets: 5, defaultReps: 5 },
      { activitySlug: "pull-ups", defaultSets: 3, defaultReps: 5, notes: "Max reps if able; log actual reps" },
    ],
  },
];

function applyDeload(exercises: GeneratedWorkoutDay["exercises"]): GeneratedWorkoutDay["exercises"] {
  return exercises.map((e) => ({
    ...e,
    defaultSets: Math.min(3, e.defaultSets),
    notes: [e.notes, "Deload — ~90% of last week or RPE 6–7"].filter(Boolean).join(" · "),
  }));
}

export function generateLinear5x5Mwf(input: {
  blockName: string;
  startDate: Date;
  weeks?: number;
}): GeneratedWorkoutDay[] {
  const weeks = input.weeks ?? 4;
  const sessionsPerWeek = 3;
  const totalDays = weeks * sessionsPerWeek;
  const dates = collectWeekdayDates(input.startDate, totalDays, MWF);
  const dateLabel = (d: Date) => d.toISOString().slice(0, 10);

  return dates.map((date, index) => {
    const weekIndex = Math.floor(index / sessionsPerWeek);
    const isDeload = (weekIndex + 1) % 4 === 0;
    const blueprint = LINEAR_ROTATION[index % LINEAR_ROTATION.length]!;
    let exercises = blueprint.exercises.filter((e) =>
      (LIFTING_WORKOUT_SLUGS as readonly string[]).includes(e.activitySlug)
    );
    if (isDeload) exercises = applyDeload(exercises);

    return {
      date,
      name: `${input.blockName} — W${weekIndex + 1} ${blueprint.label} (${dateLabel(date)})`,
      isDeload,
      exercises,
    };
  });
}

export function buildGeneratorPlan(
  key: WorkoutGeneratorKey,
  input: { blockName: string; startDate: Date; weeks?: number }
): GeneratedWorkoutDay[] {
  if (key === "linear-5x5-mwf") return generateLinear5x5Mwf(input);
  return [];
}
