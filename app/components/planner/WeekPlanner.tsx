"use client";

import DayCard from "./DayCard";

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function WeekPlanner() {
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {days.map((day) => (
          <DayCard
            key={day}
            day={day}
          />
        ))}
      </div>
    </div>
  );
}