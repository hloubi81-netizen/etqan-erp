import { useAuth } from "@/lib/AuthContext";

/**
 * Returns a filter function that restricts data to the current user's branch.
 * Admins see all data. Others see only their branch (or unassigned records).
 *
 * Usage:
 *   const { filterByBranch, userBranchId, isAdmin } = useBranchFilter();
 *   const filtered = filterByBranch(records); // records with branch_id field
 */
export function useBranchFilter() {
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";
  const userBranchId = user?.branch_id || null;

  /**
   * Filters an array of records by the user's branch.
   * - Admin: no filter applied (sees all)
   * - Others with branch_id set: sees records matching their branch OR records with no branch set
   * - Others without branch_id: sees all (no restriction possible)
   */
  function filterByBranch(records = []) {
    if (isAdmin) return records;
    if (!userBranchId) return records;
    return records.filter(
      (r) => !r.branch_id || r.branch_id === userBranchId
    );
  }

  /**
   * Returns default branch values to pre-fill when creating a new record.
   * Admins get empty values; others get their branch pre-filled.
   */
  function getDefaultBranchValues(branches = []) {
    if (isAdmin || !userBranchId) return { branch_id: "", branch_name: "" };
    const branch = branches.find((b) => b.id === userBranchId);
    return {
      branch_id: userBranchId,
      branch_name: branch?.name || user?.branch_name || "",
    };
  }

  return { filterByBranch, getDefaultBranchValues, userBranchId, isAdmin };
}