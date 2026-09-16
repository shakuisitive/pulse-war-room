"use client";

import * as React from "react";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const numberInputClassName =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]";

type NumberInputProps = Omit<
  React.ComponentProps<"input">,
  "type" | "defaultValue"
> & {
  defaultValue?: number | string;
};

export function NumberInput({
  className,
  defaultValue,
  min,
  max,
  step = 1,
  disabled,
  onChange,
  ...props
}: NumberInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const adjustValue = (delta: number) => {
    const input = inputRef.current;
    if (!input || disabled) {
      return;
    }

    const parsedStep = typeof step === "number" ? step : Number(step) || 1;
    const current = Number(input.value);
    const base = Number.isFinite(current) ? current : 0;
    let next = base + delta * parsedStep;

    if (min !== undefined) {
      next = Math.max(Number(min), next);
    }
    if (max !== undefined) {
      next = Math.min(Number(max), next);
    }

    input.value = String(next);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="number"
        data-slot="number-input"
        defaultValue={defaultValue}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={onChange}
        className={cn(
          "h-9 w-full min-w-0 rounded-md border border-input bg-input px-3 py-1 pr-9 text-base shadow-xs outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          numberInputClassName,
          className,
        )}
        {...props}
      />
      <div className="absolute inset-y-0 right-0 flex w-8 flex-col border-l border-border">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={disabled}
          className="h-1/2 w-full rounded-none rounded-tr-md border-b border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label="Increase value"
          onClick={() => adjustValue(1)}
          tabIndex={-1}
        >
          <ChevronUpIcon className="size-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={disabled}
          className="h-1/2 w-full rounded-none rounded-br-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label="Decrease value"
          onClick={() => adjustValue(-1)}
          tabIndex={-1}
        >
          <ChevronDownIcon className="size-3" />
        </Button>
      </div>
    </div>
  );
}
