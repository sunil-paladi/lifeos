"use client";

import Image from "next/image";
import {
  useEffect,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import type { Exercise } from "../types/exercise";

type Props = {
  exercise: Exercise;
  onClose: () => void;
};

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-2 text-sm leading-6 text-slate-600">{children}</div>
    </section>
  );
}

function DetailList({
  items,
  fallback,
}: {
  items: string[];
  fallback: string;
}) {
  const availableItems = items.filter((item) => item.trim().length > 0);

  if (availableItems.length === 0) {
    return <p>{fallback}</p>;
  }

  return (
    <ul className="list-disc space-y-1 pl-5">
      {availableItems.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

export default function ExerciseDetails({ exercise, onClose }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageSource = exercise.image.trim();
  const hasImage = imageSource.length > 0 && imageSource !== "...";
  const instructions = exercise.instructions.filter(
    (instruction) => instruction.trim().length > 0
  );

  useEffect(() => {
    setImageFailed(false);
  }, [exercise.id, exercise.image]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    event.stopPropagation();
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  const notProvided = "Not provided in the exercise catalog.";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4"
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-details-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2
            id="exercise-details-title"
            className="text-lg font-bold text-slate-900"
          >
            {exercise.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close exercise details"
            className="rounded-md px-2 py-1 text-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {hasImage && !imageFailed ? (
            <div className="relative mb-5 aspect-video overflow-hidden rounded-lg bg-slate-100">
              <Image
                src={imageSource}
                alt={`${exercise.name} demonstration`}
                fill
                sizes="(max-width: 672px) 100vw, 640px"
                className="object-contain"
                onError={() => setImageFailed(true)}
              />
            </div>
          ) : (
            <div className="mb-5 flex aspect-video items-center justify-center rounded-lg bg-slate-100 px-4 text-center text-sm text-slate-500">
              Demonstration image not available.
            </div>
          )}

          <dl className="grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-slate-700">Primary muscle</dt>
              <dd className="mt-1 text-slate-600">
                {exercise.primaryMuscle || notProvided}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-700">Secondary muscles</dt>
              <dd className="mt-1 text-slate-600">
                {exercise.secondaryMuscles.length > 0
                  ? exercise.secondaryMuscles.join(", ")
                  : notProvided}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-700">Equipment</dt>
              <dd className="mt-1 text-slate-600">
                {exercise.equipment || notProvided}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-700">Difficulty</dt>
              <dd className="mt-1 text-slate-600">
                {exercise.difficulty || notProvided}
              </dd>
            </div>
          </dl>

          <div className="mt-5 space-y-3">
            <DetailSection title="Starting position">
              <p>{exercise.startingPosition?.trim() || notProvided}</p>
            </DetailSection>

            <DetailSection title="Movement steps">
              <DetailList
                items={instructions}
                fallback="Movement steps are not provided in the exercise catalog."
              />
            </DetailSection>

            <DetailSection title="Technique tips">
              <DetailList
                items={exercise.techniqueTips ?? []}
                fallback="Technique tips are not provided in the exercise catalog."
              />
            </DetailSection>

            <DetailSection title="Common mistakes">
              <DetailList
                items={exercise.commonMistakes ?? []}
                fallback="Common mistakes are not provided in the exercise catalog."
              />
            </DetailSection>

            <DetailSection title="Safety notes">
              <DetailList
                items={exercise.safetyNotes ?? []}
                fallback="No exercise-specific safety notes are provided in the catalog."
              />
            </DetailSection>
          </div>
        </div>
      </div>
    </div>
  );
}