"use client";

import { useState } from "react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: string;
};

type FormSelectProps = {
  id: string;
  name: string;
  options: SelectOption[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  size?: "sm" | "default";
  /** Maps a select value to the hidden input submitted with the form. */
  mapValueToForm?: (value: string) => string;
};

export function FormSelect({
  id,
  name,
  options,
  defaultValue,
  value: controlledValue,
  onValueChange,
  placeholder = "Select…",
  required,
  disabled,
  className,
  triggerClassName,
  size = "default",
  mapValueToForm = (value) => value,
}: FormSelectProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? "");
  const value = controlledValue ?? uncontrolledValue;
  const formValue = mapValueToForm(value);

  function handleValueChange(next: string) {
    if (controlledValue === undefined) {
      setUncontrolledValue(next);
    }
    onValueChange?.(next);
  }

  return (
    <div className={className}>
      <input
        type="hidden"
        name={name}
        value={formValue}
        required={required && !formValue}
      />
      <Select
        value={value || undefined}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectTrigger id={id} size={size} className={cn("w-full", triggerClassName)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function FormSelectField({
  label,
  ...props
}: FormSelectProps & { label: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={props.id}>{label}</Label>
      <FormSelect {...props} />
    </div>
  );
}

/** Sentinel for optional selects where empty string is the form value. */
export const UNASSIGNED_SELECT_VALUE = "__unassigned__";
