"use client";

import { useActionState } from "react";

import {
  inviteMemberAction,
  removeMemberFormAction,
  updateMemberRoleAction,
  type ActionState,
} from "@/app/actions/organization";
import { FormMessage } from "@/components/auth/form-message";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSelect, FormSelectField } from "@/components/ui/form-select-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Database } from "@/types/supabase";

type Member = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "display_name" | "org_role" | "avatar_url" | "is_active" | "created_at"
>;

const initialState: ActionState = {};

const orgRoleOptions = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
];

export function TeamManagement({
  members,
  canManage,
  currentUserId,
}: {
  members: Member[];
  canManage: boolean;
  currentUserId: string;
}) {
  const [inviteState, inviteAction, isInvitePending] = useActionState(
    inviteMemberAction,
    initialState,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team</h1>
        <p className="text-muted-foreground">
          Manage members and see who belongs to your organization.
        </p>
      </div>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Invite member</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={inviteAction} className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <FormSelectField
                id="orgRole"
                name="orgRole"
                label="Role"
                options={orgRoleOptions}
                defaultValue="member"
              />
              <div className="md:col-span-3">
                <FormMessage
                  error={inviteState.error}
                  success={inviteState.success}
                />
                <Button disabled={isInvitePending}>
                  {isInvitePending ? "Sending…" : "Send invitation"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              canManage={canManage && member.id !== currentUserId}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function MemberRow({
  member,
  canManage,
}: {
  member: Member;
  canManage: boolean;
}) {
  const [roleState, roleAction] = useActionState(
    updateMemberRoleAction,
    initialState,
  );
  const [removeState, removeAction] = useActionState(
    removeMemberFormAction,
    initialState,
  );

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>
            {member.display_name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{member.display_name}</p>
          <Badge variant="secondary" className="mt-1 capitalize">
            {member.org_role}
          </Badge>
        </div>
      </div>

      {canManage && member.org_role !== "owner" ? (
        <div className="flex flex-wrap items-center gap-2">
          <form action={roleAction} className="flex items-center gap-2">
            <input type="hidden" name="userId" value={member.id} />
            <FormSelect
              id={`orgRole-${member.id}`}
              name="orgRole"
              options={orgRoleOptions}
              defaultValue={member.org_role}
              triggerClassName="w-[140px]"
              size="sm"
            />
            <Button type="submit" variant="outline" size="sm">
              Update
            </Button>
          </form>
          <form action={removeAction}>
            <input type="hidden" name="userId" value={member.id} />
            <Button type="submit" variant="destructive" size="sm">
              Remove
            </Button>
          </form>
          <FormMessage error={roleState.error ?? removeState.error} />
        </div>
      ) : null}
    </div>
  );
}
