export type Exercise = {
  id: number;
  bodyPart: string;
  name: string;
  image: string;

  completed: boolean;

  primaryMuscle: string;
  secondaryMuscles: string[];

  equipment: string;
  difficulty: string;

  sets: number;
  reps: number;

  instructions: string[];
};