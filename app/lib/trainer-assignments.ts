export const TRAINER_ASSIGNMENT_MUTATION_ROLES = ["OWNER"] as const;

export type AssignmentMembership = {
  id: string;
  gymId: string;
  role: string;
  status: string;
};

export function isValidActiveTrainerClientPair(
  gymId: string,
  trainer: AssignmentMembership | null,
  client: AssignmentMembership | null,
): boolean {
  return Boolean(
    trainer &&
      client &&
      trainer.gymId === gymId &&
      trainer.role === "TRAINER" &&
      trainer.status === "ACTIVE" &&
      client.gymId === gymId &&
      client.role === "MEMBER" &&
      client.status === "ACTIVE",
  );
}

export function trainerAssignmentKey(
  gymId: string,
  trainerMembershipId: string,
  clientMembershipId: string,
) {
  return {
    gymId_trainerMembershipId_clientMembershipId: {
      gymId,
      trainerMembershipId,
      clientMembershipId,
    },
  };
}

export function trainerAssignmentRemovalScope(assignmentId: string, gymId: string) {
  return { id: assignmentId, gymId };
}

export function trainerAssignmentListScope(gymId: string, trainerMembershipId: string) {
  return { gymId, trainerMembershipId };
}

export type EligibleTrainer = {
  membershipId: string;
  gymId: string;
  status: string;
};

export function getAvailableTrainers<T extends EligibleTrainer>(
  gymId: string,
  trainers: readonly T[],
  assignedTrainerMembershipIds: readonly string[],
): T[] {
  const assignedIds = new Set(assignedTrainerMembershipIds);
  return trainers.filter(
    (trainer) =>
      trainer.gymId === gymId &&
      trainer.status === "ACTIVE" &&
      !assignedIds.has(trainer.membershipId),
  );
}

export function getAssignedTrainersForClient<
  T extends { membershipId: string },
  A extends { clientMembershipId: string; trainerMembershipId: string },
>(
  clientMembershipId: string,
  trainers: readonly T[],
  assignments: readonly A[],
): T[] {
  const assignedIds = new Set(
    assignments
      .filter((assignment) => assignment.clientMembershipId === clientMembershipId)
      .map((assignment) => assignment.trainerMembershipId),
  );
  return trainers.filter((trainer) => assignedIds.has(trainer.membershipId));
}
