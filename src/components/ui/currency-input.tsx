"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatDecimalInput, formatPhpAmount } from "@/lib/currency";

type CurrencyInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "onChange"
> & {
  value: number | string | null | undefined;
  onValueChange: (value: number | "") => void;
  hideZeroWhenEmpty?: boolean;
};

function formatDisplayValue(
  value: number | string | null | undefined,
  hideZeroWhenEmpty: boolean
) {
  if (value === "" || value == null) return "";

  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) return "";
  if (hideZeroWhenEmpty && numericValue === 0) return "";

  return formatPhpAmount(numericValue);
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      value,
      onValueChange,
      onBlur,
      className,
      hideZeroWhenEmpty = false,
      ...props
    },
    ref
  ) => {
    const [displayValue, setDisplayValue] = React.useState(() =>
      formatDisplayValue(value, hideZeroWhenEmpty)
    );
    const [isFocused, setIsFocused] = React.useState(false);

    React.useEffect(() => {
      if (isFocused) return;
      setDisplayValue(formatDisplayValue(value, hideZeroWhenEmpty));
    }, [hideZeroWhenEmpty, isFocused, value]);

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onFocus={(event) => {
          setIsFocused(true);
          props.onFocus?.(event);
        }}
        onChange={(event) => {
          const nextValue = event.target.value;
          const { display, numericValue } = formatDecimalInput(nextValue);

          setDisplayValue(display);

          if (!display) {
            onValueChange(hideZeroWhenEmpty ? "" : 0);
            return;
          }

          onValueChange(numericValue ?? (hideZeroWhenEmpty ? "" : 0));
        }}
        onBlur={(event) => {
          setIsFocused(false);
          const normalizedNumericValue = formatDecimalInput(displayValue).numericValue;
          const normalizedValue =
            displayValue.trim().length === 0
              ? ""
              : formatDisplayValue(normalizedNumericValue ?? value, hideZeroWhenEmpty);
          setDisplayValue(normalizedValue);
          onBlur?.(event);
        }}
        className={cn(
          "text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          className
        )}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
