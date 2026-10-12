import assert from "node:assert/strict";
import test from "node:test";
import {
  getAssignedTrainersForClient,
  getAvailableTrainers,
  isValidActiveTrainerClientPair,
  trainerAssignmentKey,
  trainerAssignmentListScope,
  trainerAssignmentRemovalScope,
  TRAINER_ASSIGNMENT_MUTATION_ROLES,
} from "./trainer-assignments";

test("trainer assignment mutations are owner-only", () => {
  assert.deepEqual(TRAINER_ASSIGNMENT_MUTATION_ROLES, ["OWNER"]);
  assert.equal((TRAINER_ASSIGNMENT_MUTATION_ROLES as readonly string[]).includes("TRAINER"), false);
});

test("assignment creation requires active trainer and member memberships in the same gym", () => {
  const trainer = { id: "trainer-1", gymId: "gym-1", role: "TRAINER", status: "ACTIVE" };
  const client = { id: "member-1", gymId: "gym-1", role: "MEMBER", status: "ACTIVE" };

  assert.equal(isValidActiveTrainerClientPair("gym-1", trainer, client), true);
  assert.equal(isValidActiveTrainerClientPair("gym-2", trainer, client), false);
  assert.equal(isValidActiveTrainerClientPair("gym-1", { ...trainer, status: "INACTIVE" }, client), false);
  assert.equal(isValidActiveTrainerClientPair("gym-1", trainer, { ...client, role: "TRAINER" }), false);
});

test("assignment lookups include the authenticated trainer and exact client pair", () => {
  assert.deepEqual(trainerAssignmentListScope("gym-1", "trainer-1"), {
    gymId: "gym-1",
    trainerMembershipId: "trainer-1",
  });
  assert.deepEqual(
    trainerAssignmentKey("gym-1", "trainer-1", "member-1"),
    {
      gymId_trainerMembershipId_clientMembershipId: {
        gymId: "gym-1",
        trainerMembershipId: "trainer-1",
        clientMembershipId: "member-1",
      },
    },
  );
  assert.deepEqual(trainerAssignmentRemovalScope("assignment-1", "gym-1"), {
    id: "assignment-1",
    gymId: "gym-1",
  });
});

test("owner additional-trainer choices include every unassigned active trainer in this gym", () => {
  assert.deepEqual(
    getAvailableTrainers(
      "gym-1",
      [
        { membershipId: "assigned", gymId: "gym-1", status: "ACTIVE" },
        { membershipId: "eligible", gymId: "gym-1", status: "ACTIVE" },
        { membershipId: "inactive", gymId: "gym-1", status: "INACTIVE" },
        { membershipId: "other-gym", gymId: "gym-2", status: "ACTIVE" },
      ],
      ["assigned"],
    ),
    [{ membershipId: "eligible", gymId: "gym-1", status: "ACTIVE" }],
  );
});

test("PT session trainer choices include only the selected client's assigned trainers", () => {
  assert.deepEqual(
    getAssignedTrainersForClient(
      "member-1",
      [
        { membershipId: "trainer-1", name: "One" },
        { membershipId: "trainer-2", name: "Two" },
        { membershipId: "trainer-3", name: "Three" },
      ],
      [
        { clientMembershipId: "member-1", trainerMembershipId: "trainer-1" },
        { clientMembershipId: "member-2", trainerMembershipId: "trainer-2" },
      ],
    ),
    [{ membershipId: "trainer-1", name: "One" }],
  );
});
