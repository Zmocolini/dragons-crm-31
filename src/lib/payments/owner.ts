/**
 * Cui aparține o plată nouă (`createdBy` = proprietarul pe server, vezi sync/ownership.ts).
 * Subcontractorul: mereu el. Owner-ul: proprietarul curierului plătit, apoi subcontractorul din
 * scope, apoi el însuși — ca Ahsal să-și vadă plățile introduse de flotă pentru curierii lui.
 */
export function paymentOwner(input: {
  role: string;
  userEmail: string;
  scopeEmail: string | null;
  /** `createdBy` al curierului plătit, dacă e cunoscut. */
  courierOwner: string | null;
}): string {
  const self = input.userEmail.trim().toLowerCase();
  if (input.role !== "global_owner") return self;
  const courier = input.courierOwner?.trim().toLowerCase() ?? "";
  if (courier.includes("@")) return courier;
  const scope = input.scopeEmail?.trim().toLowerCase() ?? "";
  if (scope.includes("@")) return scope;
  return self;
}
