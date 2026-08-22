"use client";

import DayCard from "./DayCard";

interface Props {
  weekIndex: number;
}

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function WeekPlanner({
  weekIndex,
}: Props) {
  return (
    <div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
        {days.map((day) => (
          <DayCard
            key={`${weekIndex}-${day}`}
            day={day}
            weekIndex={weekIndex}
          />
        ))}
      </div>
    </div>
  );
}