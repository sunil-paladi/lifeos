import assert from "node:assert/strict";
import test from "node:test";
import {
  calculatePaidPaymentTotals,
  canTransitionPaymentStatus,
  activeMemberPaymentMembershipScope,
  activeOwnerPaymentScope,
  getPTSessionPaymentStatus,
  hasPrismaErrorCode,
  isDuplicatePTSessionPayment,
  isPTSessionAvailableForPayment,
  isValidPaymentCurrency,
  memberPaymentQueryScope,
  parsePaymentAmount,
  paymentQueryScope,
  ptSessionPaymentQueryScope,
} from "./payments";

test("recognizes only Prisma errors with the requested code", () => {
  assert.equal(hasPrismaErrorCode({ code: "P2002" }, "P2002"), true);
  assert.equal(hasPrismaErrorCode({ code: "P2025" }, "P2002"), false);
  assert.equal(hasPrismaErrorCode(new Error("database unavailable"), "P2002"), false);
  assert.equal(hasPrismaErrorCode({ code: 2002 }, "P2002"), false);
});

test("calculates paid totals by currency and excludes unpaid statuses", () => {
  assert.deepEqual(
    calculatePaidPaymentTotals([
      { amount: "12.35", currency: "inr", status: "PAID" },
      { amount: 7.65, currency: "INR", status: "PAID" },
      { amount: "90.00", currency: "USD", status: "PENDING" },
      { amount: "5.00", currency: "USD", status: "PAID" },
    ]),
    [
      { currency: "INR", amount: "20.00" },
      { currency: "USD", amount: "5.00" },
    ],
  );
});

test("allows only valid payment status transitions", () => {
  assert.equal(canTransitionPaymentStatus("PENDING", "PAID"), true);
  assert.equal(canTransitionPaymentStatus("PENDING", "FAILED"), true);
  assert.equal(canTransitionPaymentStatus("FAILED", "PENDING"), true);
  assert.equal(canTransitionPaymentStatus("PAID", "REFUNDED"), true);
  assert.equal(canTransitionPaymentStatus("FAILED", "PAID"), false);
  assert.equal(canTransitionPaymentStatus("REFUNDED", "PAID"), false);
  assert.equal(canTransitionPaymentStatus("PAID", "CANCELLED"), false);
});

test("validates positive payment amounts and payable PT session states", () => {
  assert.equal(parsePaymentAmount("12.50"), 12.5);
  assert.equal(parsePaymentAmount("12.501"), null);
  assert.equal(parsePaymentAmount(12.501), null);
  assert.equal(isValidPaymentCurrency("INR"), true);
  assert.equal(isValidPaymentCurrency("US"), false);
  assert.equal(parsePaymentAmount(0), null);
  assert.equal(parsePaymentAmount("NaN"), null);
  assert.equal(parsePaymentAmount(100_000_000), null);
  assert.equal(parsePaymentAmount("1e999"), null);
  assert.equal(isPTSessionAvailableForPayment("SCHEDULED"), true);
  assert.equal(isPTSessionAvailableForPayment("COMPLETED"), true);
  assert.equal(isPTSessionAvailableForPayment("CANCELLED"), false);
  assert.equal(isPTSessionAvailableForPayment("NO_SHOW"), false);
});

test("derives PT session payment state from persisted records only", () => {
  assert.equal(getPTSessionPaymentStatus([]), "UNPAID");
  assert.equal(getPTSessionPaymentStatus([{ status: "FAILED" }]), "UNPAID");
  assert.equal(getPTSessionPaymentStatus([{ status: "PENDING" }]), "PENDING");
  assert.equal(getPTSessionPaymentStatus([{ status: "REFUNDED" }, { status: "PAID" }]), "PAID");
});

test("detects a prior PT session payment within the current gym", () => {
  assert.deepEqual(ptSessionPaymentQueryScope("gym-1", "session-1"), {
    gymId: "gym-1",
    ptSessionId: "session-1",
    paymentType: "PT_SESSION",
  });
  assert.equal(isDuplicatePTSessionPayment({ id: "payment-1" }), true);
  assert.equal(isDuplicatePTSessionPayment(null), false);
});

test("payment query scopes use only active authorized owner or member memberships", () => {
  assert.deepEqual(activeOwnerPaymentScope("owner-user"), {
    userId: "owner-user",
    role: "OWNER",
    status: "ACTIVE",
  });
  assert.deepEqual(activeMemberPaymentMembershipScope("member-user"), {
    userId: "member-user",
    role: "MEMBER",
    status: "ACTIVE",
  });
  assert.deepEqual(paymentQueryScope("gym-1"), {
    gymId: "gym-1",
    memberMembership: { is: { gymId: "gym-1", role: "MEMBER" } },
  });
  assert.deepEqual(memberPaymentQueryScope("member-1"), { memberMembershipId: "member-1" });
});
