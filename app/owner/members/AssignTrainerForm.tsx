"use client";

import { FormEvent, useState } from "react";
import { UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";

type Trainer = {
  membershipId: string;
  name: string;
  username: string | null;
};

type CurrentTrainer = {
  membershipId: string;
  name: string;
  username: string | null;
};

export default function AssignTrainerForm({
  gymId,
  clientMembershipId,
  trainers,
  currentTrainers,
}: {
  gymId: string;
  clientMembershipId: string;
  trainers: Trainer[];
  currentTrainers: CurrentTrainer[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [trainerMembershipId, setTrainerMembershipId] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [removingTrainerMembershipId, setRemovingTrainerMembershipId] = useState<string | null>(null);

  const assignedTrainerIds = new Set(
    currentTrainers.map((trainer) => trainer.membershipId)
  );
  const availableTrainers = trainers.filter(
    (trainer) => !assignedTrainerIds.has(trainer.membershipId)
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSuccess("");
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

      setSuccess("Trainer assigned successfully.");
      setOpen(false);
      router.refresh();
    } catch {
      setMessage("Unable to assign trainer");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(trainer: CurrentTrainer) {
    setMessage("");
    setSuccess("");
    setRemovingTrainerMembershipId(trainer.membershipId);

    try {
      const response = await fetch(
        `/api/gyms/${encodeURIComponent(gymId)}/trainer-clients/${encodeURIComponent(clientMembershipId)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trainerMembershipId: trainer.membershipId }),
        }
      );
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(data.error ?? "Unable to remove trainer assignment");
        return;
      }

      setSuccess(`Removed ${trainer.name} from this member.`);
      router.refresh();
    } catch {
      setMessage("Unable to remove trainer assignment");
    } finally {
      setRemovingTrainerMembershipId(null);
    }
  }

  return (
    <div className="sm:col-span-4">
      {currentTrainers.length > 0 ? (
        <div className="space-y-2">
          {currentTrainers.map((trainer) => (
            <div key={trainer.membershipId} className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <UserRound size={16} className="shrink-0 text-slate-400" />
              <span>
                {trainer.name}
                {trainer.username ? ` (@${trainer.username})` : ""}
              </span>
              <button
                type="button"
                onClick={() => void handleRemove(trainer)}
                disabled={removingTrainerMembershipId !== null}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X size={14} />
                {removingTrainerMembershipId === trainer.membershipId ? "Removing..." : "Remove"}
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          setMessage("");
          setSuccess("");
        }}
        className="mt-1 inline-flex items-center rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/15"
      >
        {open ? "Close" : currentTrainers.length ? "Assign another trainer" : "Assign Trainer"}
      </button>

      {success ? (
        <p className="mt-2 text-sm text-primary">{success}</p>
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
            className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
          >
            <option value="">Select an active trainer</option>
            {availableTrainers.map((trainer) => (
              <option key={trainer.membershipId} value={trainer.membershipId}>
                {trainer.name}{trainer.username ? ` (@${trainer.username})` : ""}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading || availableTrainers.length === 0}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Assigning..." : "Save"}
          </button>
        </form>
      ) : null}

      {open && availableTrainers.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">
          {trainers.length === 0
            ? "No active trainers are available."
            : "All active trainers are already assigned to this member."}
        </p>
      ) : null}
    </div>
  );
}