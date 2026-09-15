import Link from "next/link";
import { Activity, Bot, Radio, Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    title: "Real-time war rooms",
    description:
      "Live timeline, chat, tasks, and presence — everything updates instantly during an incident.",
    icon: Radio,
  },
  {
    title: "AI post-mortems",
    description:
      "Generate structured retrospectives from timeline, chat, and evidence automatically.",
    icon: Bot,
  },
  {
    title: "Multi-tenant security",
    description:
      "Org isolation and role-based access enforced at the database level with RLS.",
    icon: Shield,
  },
  {
    title: "Incident analytics",
    description:
      "Track MTTR, SLA compliance, and responder workload with server-side RPC analytics.",
    icon: Activity,
  },
];

const steps = [
  "Declare an incident and spin up a live war room",
  "Coordinate responders with tasks, chat, and evidence",
  "Resolve, generate an AI post-mortem, and track action items",
];

export function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-lg font-bold text-foreground">Pulse</p>
            <p className="text-xs text-muted-foreground">
              Incident response platform
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-6 py-16">
        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-6">
            <Badge className="bg-accent text-accent-foreground">
              Real-time incident response
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Coordinate faster when production breaks
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Pulse gives your team a live war room for every incident — from
              declaration through resolution and AI-powered post-mortems.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/signup">Start free</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Command center preview</CardTitle>
              <CardDescription>
                Dark-mode dashboard built for high-stress incident response.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 font-mono text-xs">
              <p className="rounded-md bg-muted px-3 py-2">
                INC-2026-0142 · SEV1 · Investigating
              </p>
              <p className="rounded-md bg-muted px-3 py-2">
                4 responders online · SLA 03:12 remaining
              </p>
              <p className="rounded-md bg-muted px-3 py-2">
                Timeline updated · Task assigned · Evidence uploaded
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Built for incident response</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title}>
                  <CardHeader>
                    <div className="mb-2 flex size-10 items-center justify-center rounded-md bg-accent">
                      <Icon className="size-5 text-accent-foreground" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">How it works</h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <Card key={step}>
                <CardHeader>
                  <CardDescription>Step {index + 1}</CardDescription>
                  <CardTitle className="text-base">{step}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
