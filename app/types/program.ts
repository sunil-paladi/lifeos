export interface Exercise {
  id: number;
  name: string;
  muscle: string;
  equipment: string;
  sets: number;
  reps: number;
}

export interface MuscleGroup {
  id: number;
  name: string;
  exercises: Exercise[];
}

export interface DayPlan {
  day: string;
  muscleGroups: MuscleGroup[];
}

export interface WeekPlan {
  week: number;
  days: DayPlan[];
}

export interface Program {
  id: number;
  name: string;
  duration: number;
  weeks: WeekPlan[];
}