export interface Exercise {
  id: number;

  bodyPart: string;

  name: string;

  image: string;

  primaryMuscle: string;

  secondaryMuscles: string[];

  equipment: string;

  difficulty: "Beginner" | "Intermediate" | "Advanced";

  sets: number;

  reps: number;

  completed: boolean;

  instructions: string[];
}