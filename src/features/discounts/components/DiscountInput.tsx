import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Tag, CheckCircle, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { usePostDiscountsValidate } from '@/api/generated/discounts/discounts';
import { useTenantCurrency } from '@/hooks/use-tenant-currency';

const discountSchema = z.object({
  code: z.string().min(1, 'Enter a discount code'),
});

type DiscountFormValues = z.infer<typeof discountSchema>;

interface DiscountInputProps {
  memberId: string;
  invoiceAmount: number;
  onDiscountApplied: (discount: {
    code: string;
    discountAmount: number;
    discountType: string;
    value: number;
  } | null) => void;
  disabled?: boolean;
}

export function DiscountInput({
  memberId,
  invoiceAmount,
  onDiscountApplied,
  disabled = false,
}: DiscountInputProps) {
  const { currency } = useTenantCurrency();
  const [validatedDiscount, setValidatedDiscount] = useState<{
    code: string;
    discountAmount: number;
    discountType: string;
    value: number;
  } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<DiscountFormValues>({
    resolver: zodResolver(discountSchema),
  });

  const validateMutation = usePostDiscountsValidate({
    mutation: {
      onSuccess: (response) => {
        const data = response as unknown as {
          valid: boolean;
          discountAmount: number;
          discount?: { code: string; discountType: string; value: number };
          error?: string;
        };
        
        if (data.valid && data.discount) {
          setValidatedDiscount({
            code: data.discount.code,
            discountAmount: data.discountAmount,
            discountType: data.discount.discountType,
            value: data.discount.value,
          });
          setValidationError(null);
          onDiscountApplied({
            code: data.discount.code,
            discountAmount: data.discountAmount,
            discountType: data.discount.discountType,
            value: data.discount.value,
          });
        } else {
          setValidationError(data.error || 'Invalid discount code');
          setValidatedDiscount(null);
          onDiscountApplied(null);
        }
      },
      onError: (err: any) => {
        setValidationError(err?.response?.data?.message || 'Failed to validate discount');
        setValidatedDiscount(null);
        onDiscountApplied(null);
      },
    },
  });

  const currentCode = watch('code');

  function onValidate(data: DiscountFormValues) {
    if (!data.code.trim()) return;
    validateMutation.mutate({
      data: {
        code: data.code,
        memberId,
        invoiceAmount,
      },
    });
  }

  function clearDiscount() {
    setValue('code', '');
    setValidatedDiscount(null);
    setValidationError(null);
    onDiscountApplied(null);
  }

  const isPending = validateMutation.isPending;

  return (
    <div className="space-y-2">
      <Label>Discount Code</Label>
      
      {!validatedDiscount ? (
        <div className="flex gap-2">
          <Input
            placeholder="Enter discount code (e.g., SUMMER25)"
            className={validationError ? 'border-destructive' : ''}
            disabled={disabled || isPending}
            {...register('code')}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleSubmit(onValidate)}
            disabled={disabled || isPending || !currentCode?.trim()}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-green-600" />
            <span className="font-mono font-semibold">{validatedDiscount.code}</span>
            <Badge variant="outline" className="text-green-700">
              {validatedDiscount.discountType === 'percentage'
                ? `${validatedDiscount.value}% OFF`
                : `${currency} ${validatedDiscount.discountAmount} OFF`}
            </Badge>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearDiscount}
            disabled={disabled}
          >
            <XCircle className="h-4 w-4" />
            Remove
          </Button>
        </div>
      )}

      {validationError && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          {validationError}
        </p>
      )}

      {validatedDiscount && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Discount applied: {currency} {validatedDiscount.discountAmount.toFixed(2)} off
        </p>
      )}
    </div>
  );
}