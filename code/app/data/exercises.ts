import { Exercise } from "../types/exercise";

export const exercises: Record<string, Exercise[]> = {
  Chest: [
    {
      id: 1,
      bodyPart: "Chest",
      name: "Bench Press",
      image: "/images/bench-press.png",
      primaryMuscle: "Chest",
      secondaryMuscles: ["Triceps", "Front Deltoids"],
      equipment: "Barbell",
      difficulty: "Intermediate",
      sets: 4,
      reps: 10,
      completed: false,
      instructions: [
        "Lie flat on the bench.",
        "Grip the bar slightly wider than shoulder width.",
        "Lower the bar slowly until it touches your chest.",
        "Press the bar back up until your arms are fully extended."
      ]
    },

    {
      id: 2,
      bodyPart: "Chest",
      name: "Incline Dumbbell Press",
      image: "/images/incline-db.png",
      primaryMuscle: "Upper Chest",
      secondaryMuscles: ["Front Deltoids", "Triceps"],
      equipment: "Dumbbells",
      difficulty: "Intermediate",
      sets: 4,
      reps: 10,
      completed: false,
      instructions: [
        "Set the bench to a 30–45° incline.",
        "Hold the dumbbells at chest level.",
        "Press the dumbbells upward until your arms are extended.",
        "Lower them slowly under control."
      ]
    },

    {
      id: 3,
      bodyPart: "Chest",
      name: "Pec Deck",
      image: "/images/pec-deck.png",
      primaryMuscle: "Chest",
      secondaryMuscles: ["Front Deltoids"],
      equipment: "Pec Deck Machine",
      difficulty: "Beginner",
      sets: 3,
      reps: 15,
      completed: false,
      instructions: [
        "Adjust the seat so the handles are at chest height.",
        "Keep a slight bend in your elbows.",
        "Bring the handles together in front of your chest.",
        "Return slowly to the starting position."
      ]
    },

    {
      id: 4,
      bodyPart: "Chest",
      name: "Chest Dips",
      image: "/images/chest-dips.png",
      primaryMuscle: "Lower Chest",
      secondaryMuscles: ["Triceps", "Front Deltoids"],
      equipment: "Assisted Dip Machine",
      difficulty: "Intermediate",
      sets: 3,
      reps: 12,
      completed: false,
      instructions: [
        "Grip the handles firmly.",
        "Lean your torso slightly forward.",
        "Lower your body until your elbows reach about 90 degrees.",
        "Push yourself back up to the starting position."
      ]
    }
  ],

  Back: [],

  Legs: [],

  Shoulders: []
};