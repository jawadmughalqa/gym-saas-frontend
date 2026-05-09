import { useState, useCallback } from 'react';

interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmLabel?: string;
  variant?: 'default' | 'destructive';
}

/**
 * Drives a <ConfirmDialog> imperatively.
 *
 * Usage:
 *   const { confirmProps, confirm } = useConfirm();
 *
 *   // Trigger it:
 *   confirm({
 *     title: 'Delete member?',
 *     description: 'This cannot be undone.',
 *     variant: 'destructive',
 *     confirmLabel: 'Delete',
 *   }, () => deleteMutation.mutate(id));
 *
 *   // Render it once near the top of your component:
 *   <ConfirmDialog {...confirmProps} />
 */
export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({});
  const [onConfirm, setOnConfirm] = useState<(() => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions, callback: () => void) => {
    setOptions(opts);
    setOnConfirm(() => callback);
    setOpen(true);
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm?.();
    setOpen(false);
  }, [onConfirm]);

  return {
    confirm,
    confirmProps: {
      open,
      onOpenChange: setOpen,
      onConfirm: handleConfirm,
      ...options,
    },
  };
}
