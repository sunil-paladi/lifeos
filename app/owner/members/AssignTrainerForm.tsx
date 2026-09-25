"use client";

import { FormEvent, useState } from "react";
import { UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

type Trainer = {
  membershipId: string;
  name: string;
  username: string | null;
};

type CurrentTrainer = {
  name: string;
  username: string | null;
};

export default function AssignTrainerForm({
  gymId,
  clientMembershipId,
  trainers,
  currentTrainer,
}: {
  gymId: string;
  clientMembershipId: string;
  trainers: Trainer[];
  currentTrainer?: CurrentTrainer;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [trainerMembershipId, setTrainerMembershipId] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (currentTrainer) {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm text-slate-600 sm:col-span-4">
        <UserRound size={16} className="shrink-0 text-slate-400" />
        <span>
          Assigned to {currentTrainer.name}
          {currentTrainer.username ? ` (@${currentTrainer.username})` : ""}
        </span>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch(
        `/api/gyms/${encodeURIComponent(gymId)}/trainer-clients`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            trainerMembershipId,
            clientMembershipId,
          }),
        }
      );

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(data.error ?? "Unable to assign trainer");
        return;
      }

      setSuccess(true);
      setOpen(false);
      router.refresh();
    } catch {
      setMessage("Unable to assign trainer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sm:col-span-4">
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          setMessage("");
          setSuccess(false);
        }}
        className="mt-1 inline-flex items-center rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-100"
      >
        {open ? "Close" : "Assign Trainer"}
      </button>

      {success ? (
        <p className="mt-2 text-sm text-green-700">Trainer assigned successfully.</p>
      ) : null}

      {message ? (
        <p className="mt-2 text-sm text-red-700">{message}</p>
      ) : null}

      {open ? (
        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor={`trainer-${clientMembershipId}`} className="sr-only">
            Select trainer
          </label>
          <select
            id={`trainer-${clientMembershipId}`}
            value={trainerMembershipId}
            onChange={(event) => setTrainerMembershipId(event.target.value)}
            required
            className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
          >
            <option value="">Select an active trainer</option>
            {trainers.map((trainer) => (
              <option key={trainer.membershipId} value={trainer.membershipId}>
                {trainer.name}{trainer.username ? ` (@${trainer.username})` : ""}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading || trainers.length === 0}
            className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Assigning..." : "Save"}
          </button>
        </form>
      ) : null}

      {!currentTrainer && trainers.length === 0 && open ? (
        <p className="mt-2 text-sm text-slate-500">No active trainers are available.</p>
      ) : null}
    </div>
  );
}