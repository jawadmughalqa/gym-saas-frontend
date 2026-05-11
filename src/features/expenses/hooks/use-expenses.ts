import { useQueryClient } from '@tanstack/react-query';
import {
  useGetExpenses,
  useGetExpensesExpenseId,
  useGetExpensesSummary,
  useGetExpensesAnalytics,
  usePostExpenses,
  usePatchExpensesExpenseId,
  useDeleteExpensesExpenseId,
  usePostExpensesExpenseIdReceipts,
  getGetExpensesQueryKey,
  getGetExpensesExpenseIdQueryKey,
  getGetExpensesSummaryQueryKey,
  getGetExpensesAnalyticsQueryKey,
  type GetExpensesParams,
  type CreateExpenseRequest,
  type UpdateExpenseRequest,
  type AddReceiptRequest,
  type ExpenseSummaryParams,
  type ExpenseAnalyticsParams,
} from '@/api/generated/expenses/expenses';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/utils/error';

// ─── Re-export types for convenience ─────────────────────────────────────────

export type { GetExpensesParams, CreateExpenseRequest, UpdateExpenseRequest };

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useExpenses(params?: GetExpensesParams) {
  return useGetExpenses(params, {
    query: { placeholderData: (prev) => prev, staleTime: 1000 * 30 },
  });
}

export function useExpense(expenseId: string) {
  return useGetExpensesExpenseId(expenseId, {
    query: { enabled: !!expenseId },
  });
}

export function useExpenseSummary(params: ExpenseSummaryParams) {
  return useGetExpensesSummary(params, {
    query: { enabled: !!params.year, staleTime: 1000 * 60 },
  });
}

export function useExpenseAnalytics(params?: ExpenseAnalyticsParams) {
  return useGetExpensesAnalytics(params, {
    query: { staleTime: 1000 * 60 },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateExpense(options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return usePostExpenses({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetExpensesQueryKey() });
        qc.invalidateQueries({ queryKey: ['/expenses/summary'] });
        qc.invalidateQueries({ queryKey: ['/expenses/analytics'] });
        toast({ title: 'Expense recorded' });
        options?.onSuccess?.();
      },
      onError: (err) =>
        toast({
          variant: 'destructive',
          title: 'Failed to record expense',
          description: getErrorMessage(err),
        }),
    },
  });
}

export function useUpdateExpense(expenseId: string, options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return usePatchExpensesExpenseId({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetExpensesQueryKey() });
        qc.invalidateQueries({ queryKey: getGetExpensesExpenseIdQueryKey(expenseId) });
        qc.invalidateQueries({ queryKey: ['/expenses/summary'] });
        toast({ title: 'Expense updated' });
        options?.onSuccess?.();
      },
      onError: (err) =>
        toast({
          variant: 'destructive',
          title: 'Failed to update expense',
          description: getErrorMessage(err),
        }),
    },
  });
}

export function useDeleteExpense(options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useDeleteExpensesExpenseId({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetExpensesQueryKey() });
        qc.invalidateQueries({ queryKey: ['/expenses/summary'] });
        qc.invalidateQueries({ queryKey: ['/expenses/analytics'] });
        toast({ title: 'Expense deleted' });
        options?.onSuccess?.();
      },
      onError: (err) =>
        toast({
          variant: 'destructive',
          title: 'Failed to delete expense',
          description: getErrorMessage(err),
        }),
    },
  });
}

export function useAddReceipt(expenseId: string, options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return usePostExpensesExpenseIdReceipts({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetExpensesExpenseIdQueryKey(expenseId) });
        toast({ title: 'Receipt added' });
        options?.onSuccess?.();
      },
      onError: (err) =>
        toast({
          variant: 'destructive',
          title: 'Failed to add receipt',
          description: getErrorMessage(err),
        }),
    },
  });
}
