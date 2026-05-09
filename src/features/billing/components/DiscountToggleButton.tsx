import { ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUpdateDiscount } from '../hooks/use-billing';
import type { Discount } from '@/types/billing.types';

interface Props {
  discount: Discount;
}

export default function DiscountToggleButton({ discount }: Props) {
  const update = useUpdateDiscount(discount._id);

  return (
    <div className="flex justify-end">
      <Button
        variant="ghost"
        size="sm"
        disabled={update.isPending}
        onClick={(e) => {
          e.stopPropagation();
          update.mutate({ isActive: !discount.isActive });
        }}
      >
        {update.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : discount.isActive ? (
          <><ToggleLeft className="mr-1.5 h-4 w-4" />Disable</>
        ) : (
          <><ToggleRight className="mr-1.5 h-4 w-4" />Enable</>
        )}
      </Button>
    </div>
  );
}
