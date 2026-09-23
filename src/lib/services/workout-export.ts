import { serializeCsv } from "@/lib/csv";

export type WorkoutLogExportRow = {
  workoutDate: string;
  className: string;
  programName: string;
  studentNumber: string;
  studentFirstName: string;
  studentLastName: string;
  liftSlug: string;
  liftName: string;
  setNumber: number;
  weightLb: string;
  reps: string;
  rpe: string;
  skipped: string;
  sessionStatus: string;
  submittedAt: string;
};

const HEADERS: (keyof WorkoutLogExportRow)[] = [
  "workoutDate",
  "className",
  "programName",
  "studentNumber",
  "studentFirstName",
  "studentLastName",
  "liftSlug",
  "liftName",
  "setNumber",
  "weightLb",
  "reps",
  "rpe",
  "skipped",
  "sessionStatus",
  "submittedAt",
];

export function workoutLogsToCsv(rows: WorkoutLogExportRow[]): string {
  const data = [
    HEADERS,
    ...rows.map((r) => HEADERS.map((h) => String(r[h]))),
  ];
  return serializeCsv(data);
}
