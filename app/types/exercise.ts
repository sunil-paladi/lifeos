export interface Exercise {
  id: number;

  bodyPart: string;

  name: string;

  image: string;

  primaryMuscle: string;

  secondaryMuscles: string[];

  equipment: string;

  difficulty: "Beginner" | "Intermediate" | "Advanced";

  // Exercise type
  type?: "strength" | "cardio";

  // Strength / resistance exercises
  sets?: number;
  reps?: number;

  // Cardio exercises
  duration?: number;

  completed: boolean;

  instructions: string[];
}