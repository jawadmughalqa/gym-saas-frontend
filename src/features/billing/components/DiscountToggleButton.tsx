import { ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePatchDiscountsDiscountId } from "@/api/generated/discounts/discounts";
import type { Discount } from "@/types/billing.types";
import { useQueryClient } from "@tanstack/react-query";
import { getGetDiscountsQueryKey } from "@/api/generated/discounts/discounts";

interface Props {
  discount: Discount;
}

export default function DiscountToggleButton({ discount }: Props) {
  const queryClient = useQueryClient();
  const updateDiscountMutation = usePatchDiscountsDiscountId();

  const handleToggle = async () => {
    try {
      await updateDiscountMutation.mutateAsync({
        discountId: discount?._id,
        data: {
          isActive: !discount.isActive,
        },
      });

      // Invalidate the discounts list to refresh the UI
      await queryClient.invalidateQueries({
        queryKey: getGetDiscountsQueryKey(),
      });
    } catch (error) {
      console.error("Failed to update discount status:", error);
    }
  };

  return (
    <div className="flex justify-end">
      <Button
        variant="ghost"
        size="sm"
        disabled={updateDiscountMutation.isPending}
        onClick={(e) => {
          e.stopPropagation();
          handleToggle();
        }}
      >
        {updateDiscountMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : discount.isActive ? (
          <>
            <ToggleLeft className="mr-1.5 h-4 w-4" />
            Disable
          </>
        ) : (
          <>
            <ToggleRight className="mr-1.5 h-4 w-4" />
            Enable
          </>
        )}
      </Button>
    </div>
  );
}
