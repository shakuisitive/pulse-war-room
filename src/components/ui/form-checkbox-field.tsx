"use client";

import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormCheckboxProps = {
  id: string;
  name: string;
  label: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  className?: string;
};

/** Checkbox synced to a hidden input for Server Action forms (`"on"` when checked). */
export function FormCheckbox({
  id,
  name,
  label,
  defaultChecked,
  disabled,
  className,
}: FormCheckboxProps) {
  const [checked, setChecked] = useState(defaultChecked ?? false);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <input type="hidden" name={name} value={checked ? "on" : ""} />
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => setChecked(value === true)}
      />
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
    </div>
  );
}
