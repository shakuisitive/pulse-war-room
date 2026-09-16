"use client";

import { useActionState, useTransition } from "react";
import { format } from "date-fns";

import {
  createOnCallSlotAction,
  createRotationAction,
  deleteRotationAction,
  setActiveRotationAction,
} from "@/app/actions/on-call";
import type { ActionState } from "@/app/actions/organization";
import { FormMessage } from "@/components/auth/form-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSelectField } from "@/components/ui/form-select-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import { rotationTypes } from "@/schemas/on-call";
import type { Database } from "@/types/supabase";

type Rotation = Database["public"]["Tables"]["on_call_rotations"]["Row"];
type Slot = Database["public"]["Tables"]["on_call_slots"]["Row"] & {
  profile?: { display_name: string | null } | null;
};
type Profile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "display_name"
>;

const initialState: ActionState = {};

const rotationTypeOptions = rotationTypes.map((type) => ({
  value: type,
  label: type.charAt(0).toUpperCase() + type.slice(1),
}));

export function OnCallManagement({
  rotations,
  slots,
  members,
}: {
  rotations: Rotation[];
  slots: Slot[];
  members: Profile[];
}) {
  const [rotationState, rotationAction, isRotationPending] = useActionState(
    createRotationAction,
    initialState,
  );
  const [isUpdating, startTransition] = useTransition();

  const memberOptions = members.map((member) => ({
    value: member.id,
    label: member.display_name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">On-call rotations</h1>
        <p className="text-muted-foreground">
          Configure who is auto-assigned as incident commander when an incident is
          declared.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create rotation</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={rotationAction} className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Rotation name</Label>
              <Input id="name" name="name" required placeholder="Primary on-call" />
            </div>
            <FormSelectField
              id="rotationType"
              name="rotationType"
              label="Type"
              options={rotationTypeOptions}
              defaultValue="weekly"
            />
            <div className="md:col-span-3">
              <FormMessage
                error={rotationState.error}
                success={rotationState.success}
              />
              <Button type="submit" disabled={isRotationPending}>
                Create rotation
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {rotations.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            No rotations configured yet. Create one to enable auto-assignment.
          </CardContent>
        </Card>
      ) : (
        rotations.map((rotation) => (
          <RotationCard
            key={rotation.id}
            rotation={rotation}
            slots={slots.filter((slot) => slot.rotation_id === rotation.id)}
            memberOptions={memberOptions}
            isUpdating={isUpdating}
            onSetActive={() => {
              startTransition(async () => {
                await setActiveRotationAction(rotation.id);
              });
            }}
            onDelete={() => {
              startTransition(async () => {
                await deleteRotationAction(rotation.id);
              });
            }}
          />
        ))
      )}
    </div>
  );
}

function RotationCard({
  rotation,
  slots,
  memberOptions,
  isUpdating,
  onSetActive,
  onDelete,
}: {
  rotation: Rotation;
  slots: Slot[];
  memberOptions: { value: string; label: string }[];
  isUpdating: boolean;
  onSetActive: () => void;
  onDelete: () => void;
}) {
  const [slotState, slotAction, isSlotPending] = useActionState(
    createOnCallSlotAction,
    initialState,
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>{rotation.name}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">
              {rotation.rotation_type}
            </Badge>
            {rotation.is_active ? (
              <Badge>Active</Badge>
            ) : (
              <Badge variant="outline">Inactive</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!rotation.is_active ? (
            <Button size="sm" disabled={isUpdating} onClick={onSetActive}>
              Set active
            </Button>
          ) : null}
          <Button size="sm" variant="outline" disabled={isUpdating} onClick={onDelete}>
            Delete
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No slots in this rotation.</p>
        ) : (
          <div className="space-y-2">
            {slots.map((slot) => (
              <div
                key={slot.id}
                className="rounded-md border border-border p-3 text-sm"
              >
                <p className="font-medium">
                  {slot.profile?.display_name ?? "Unknown member"}
                </p>
                <p className="text-muted-foreground">
                  {format(new Date(slot.start_time), "PPp")} →{" "}
                  {format(new Date(slot.end_time), "PPp")}
                </p>
              </div>
            ))}
          </div>
        )}

        <form action={slotAction} className="grid gap-4 border-t border-border pt-4 md:grid-cols-2">
          <input type="hidden" name="rotationId" value={rotation.id} />
          <FormSelectField
            id={`user-${rotation.id}`}
            name="userId"
            label="Member"
            options={memberOptions}
            placeholder="Select member"
            required
          />
          <div className="space-y-2">
            <Label htmlFor={`start-${rotation.id}`}>Start</Label>
            <Input
              id={`start-${rotation.id}`}
              name="startTime"
              type="datetime-local"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`end-${rotation.id}`}>End</Label>
            <Input
              id={`end-${rotation.id}`}
              name="endTime"
              type="datetime-local"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`day-${rotation.id}`}>Day of week (optional)</Label>
            <NumberInput
              id={`day-${rotation.id}`}
              name="dayOfWeek"
              min={0}
              max={6}
              placeholder="0 = Sunday"
            />
          </div>
          <div className="md:col-span-2">
            <FormMessage error={slotState.error} success={slotState.success} />
            <Button type="submit" size="sm" disabled={isSlotPending}>
              Add slot
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
