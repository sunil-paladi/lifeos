export const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED", "CANCELLED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["CASH", "CARD", "UPI", "BANK_TRANSFER", "OTHER", "ONLINE"] as const;
export const PAYMENT_PROVIDERS = ["MANUAL", "STRIPE", "RAZORPAY", "OTHER"] as const;
export const PAYMENT_TYPES = ["MEMBERSHIP", "PT_SESSION"] as const;
export const MAX_PAYMENT_AMOUNT = 99_999_999.99;

export function hasPrismaErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code === code
  );
}

export function parsePaymentAmount(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) &&
      value > 0 &&
      value <= MAX_PAYMENT_AMOUNT &&
      Number(value.toFixed(2)) === value
      ? value
      : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(trimmed)) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed > 0 && parsed <= MAX_PAYMENT_AMOUNT ? parsed : null;
  }

  return null;
}

export function isValidPaymentCurrency(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z]{3}$/.test(value.trim());
}

export function isOneOf<T extends readonly string[]>(value: unknown, options: T): value is T[number] {
  return typeof value === "string" && options.some((option) => option === value);
}

export function canTransitionPaymentStatus(from: PaymentStatus, to: PaymentStatus): boolean {
  if (from === to) return true;
  if (from === "PENDING") return to === "PAID" || to === "FAILED" || to === "CANCELLED";
  if (from === "FAILED") return to === "PENDING";
  return from === "PAID" && to === "REFUNDED";
}

export function calculatePaidPaymentTotals(
  payments: readonly { amount: string | number; currency: string; status: string }[],
): Array<{ currency: string; amount: string }> {
  const totals = new Map<string, number>();
  for (const payment of payments) {
    if (payment.status !== "PAID") continue;
    const amount = Number(payment.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      throw new RangeError("Paid payment amount must be a finite non-negative number");
    }
    const currency = payment.currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new RangeError("Paid payment currency must be a three-letter code");
    }
    const cents = Math.round((totals.get(currency) ?? 0) * 100) + Math.round(amount * 100);
    totals.set(currency, cents / 100);
  }
  return [...totals.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([currency, amount]) => ({ currency, amount: amount.toFixed(2) }));
}

export function isPTSessionAvailableForPayment(status: string): boolean {
  return status === "SCHEDULED" || status === "COMPLETED";
}

export function getPTSessionPaymentStatus(
  payments: readonly { status: string }[],
): "PAID" | "PENDING" | "UNPAID" {
  if (payments.some(({ status }) => status === "PAID")) return "PAID";
  if (payments.some(({ status }) => status === "PENDING")) return "PENDING";
  return "UNPAID";
}

export function isDuplicatePTSessionPayment(existingPayment: { id: string } | null): boolean {
  return existingPayment !== null;
}

export function ptSessionPaymentQueryScope(gymId: string, ptSessionId: string) {
  return { gymId, ptSessionId, paymentType: "PT_SESSION" as const };
}

export function paymentQueryScope(gymId: string) {
  return {
    gymId,
    memberMembership: { is: { gymId, role: "MEMBER" as const } },
  };
}

export function activeOwnerPaymentScope(userId: string) {
  return { userId, role: "OWNER" as const, status: "ACTIVE" as const };
}

export function activeMemberPaymentMembershipScope(userId: string) {
  return { userId, role: "MEMBER" as const, status: "ACTIVE" as const };
}

export function memberPaymentQueryScope(memberMembershipId: string) {
  return { memberMembershipId };
}
