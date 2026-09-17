"use client";

import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";

type AuditRow = Database["public"]["Tables"]["audit_log"]["Row"];
type Member = { id: string; display_name: string };

const tableOptions = [
  "all",
  "incidents",
  "post_mortems",
  "action_items",
  "tasks",
  "profiles",
  "webhook_integrations",
];

function defaultStartDate() {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().slice(0, 10);
}

function defaultEndDate() {
  return new Date().toISOString().slice(0, 10);
}

export function AuditLogViewer({ members }: { members: Member[] }) {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [tableName, setTableName] = useState("all");
  const [actorId, setActorId] = useState("all");
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const memberOptions = useMemo(
    () => [{ value: "all", label: "All actors" }, ...members.map((m) => ({ value: m.id, label: m.display_name }))],
    [members],
  );

  function loadAuditLog() {
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("get_audit_log", {
        p_start: new Date(`${startDate}T00:00:00`).toISOString(),
        p_end: new Date(`${endDate}T23:59:59`).toISOString(),
        p_table_name: tableName === "all" ? undefined : tableName,
        p_actor_id: actorId === "all" ? undefined : actorId,
        p_limit: 100,
      });

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      setRows(data ?? []);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="auditStart">Start</Label>
            <Input
              id="auditStart"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auditEnd">End</Label>
            <Input
              id="auditEnd"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Table</Label>
            <Select value={tableName} onValueChange={setTableName}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tableOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === "all" ? "All tables" : option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Actor</Label>
            <Select value={actorId} onValueChange={setActorId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {memberOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-4">
            <Button disabled={isPending} onClick={loadAuditLog}>
              {isPending ? "Loading…" : "Load audit log"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No audit events loaded. Adjust filters and load again.
            </p>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className="rounded-md border border-border p-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs">{row.action}</span>
                  <span className="text-muted-foreground">{row.table_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(row.created_at).toLocaleString()}
                  </span>
                </div>
                {row.record_id ? (
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {row.record_id}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
