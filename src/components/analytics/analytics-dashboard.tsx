"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
import { severityLevels } from "@/schemas/incident";

type SeverityFilter = "all" | (typeof severityLevels)[number];

type AnalyticsData = {
  mttr: { avg_minutes?: number; p50?: number; p90?: number; p95?: number };
  mtta: { avg_minutes?: number; p50?: number; p90?: number };
  volumeBySeverity: Array<{ severity: string; count: number }>;
  volumeOverTime: Array<{ day: string; count: number }>;
  slaCompliance: { acknowledge_pct?: number; resolve_pct?: number };
  responderWorkload: Array<{
    user_id: string;
    display_name: string;
    incidents_commanded: number;
  }>;
  taskWorkload: Array<{
    user_id: string;
    display_name: string;
    tasks_completed: number;
  }>;
  recurringIssues: Array<{
    id: string;
    title: string;
    similar_id: string;
    similar_title: string;
    similarity: number;
  }>;
  actionItemCompletionRate: number;
  totalIncidents: number;
};

const severityOptions = [
  { value: "all", label: "All severities" },
  ...severityLevels.map((level) => ({ value: level, label: level.toUpperCase() })),
];

function defaultStartDate() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().slice(0, 10);
}

function defaultEndDate() {
  return new Date().toISOString().slice(0, 10);
}

export function AnalyticsDashboard() {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const chartData = useMemo(
    () =>
      (data?.volumeBySeverity ?? []).map((item) => ({
        severity: item.severity.toUpperCase(),
        count: item.count,
      })),
    [data],
  );

  function loadAnalytics() {
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { data: analytics, error: rpcError } = await supabase.rpc(
        "get_org_analytics",
        {
          p_start: new Date(`${startDate}T00:00:00`).toISOString(),
          p_end: new Date(`${endDate}T23:59:59`).toISOString(),
          p_severity: severity === "all" ? undefined : severity,
        },
      );

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      setData(analytics as unknown as AnalyticsData);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Org incident health computed server-side via Supabase RPC functions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Severity</Label>
            <Select
              value={severity}
              onValueChange={(value) => setSeverity(value as SeverityFilter)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {severityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button disabled={isPending} onClick={loadAnalytics}>
              {isPending ? "Loading…" : "Load analytics"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {data ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard title="Total incidents" value={String(data.totalIncidents)} />
            <MetricCard
              title="MTTR avg (min)"
              value={String(data.mttr.avg_minutes ?? "—")}
            />
            <MetricCard
              title="MTTA avg (min)"
              value={String(data.mtta.avg_minutes ?? "—")}
            />
            <MetricCard
              title="Action item completion"
              value={`${data.actionItemCompletionRate ?? 0}%`}
            />
            <MetricCard
              title="SLA ack compliance"
              value={`${data.slaCompliance.acknowledge_pct ?? "—"}%`}
            />
            <MetricCard
              title="SLA resolve compliance"
              value={`${data.slaCompliance.resolve_pct ?? "—"}%`}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Incident volume by severity</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="severity" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--primary)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Incident volume over time</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.volumeOverTime ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="var(--primary)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Responder workload</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(data.responderWorkload ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No commander workload data.</p>
              ) : (
                data.responderWorkload.map((row) => (
                  <div
                    key={row.user_id}
                    className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
                  >
                    <span>{row.display_name}</span>
                    <span className="text-muted-foreground">
                      {row.incidents_commanded} incidents commanded
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tasks completed per responder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(data.taskWorkload ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No completed task data.</p>
              ) : (
                data.taskWorkload.map((row) => (
                  <div
                    key={row.user_id}
                    className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
                  >
                    <span>{row.display_name}</span>
                    <span className="text-muted-foreground">
                      {row.tasks_completed} tasks completed
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recurring issues</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(data.recurringIssues ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No high-similarity resolved incidents yet. Embeddings must be processed first.
                </p>
              ) : (
                data.recurringIssues.map((row) => (
                  <div
                    key={`${row.id}-${row.similar_id}`}
                    className="rounded-md border border-border p-3 text-sm"
                  >
                    <p className="font-medium">{row.title}</p>
                    <p className="text-muted-foreground">
                      Similar to {row.similar_title} ({Math.round(row.similarity * 100)}%)
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
