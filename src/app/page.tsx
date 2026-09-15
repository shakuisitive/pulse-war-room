import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl space-y-8">
        <div className="space-y-3 text-center">
          <Badge variant="secondary">Incident Response Platform</Badge>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Pulse
          </h1>
          <p className="text-lg text-muted-foreground">
            Real-time war rooms for incident response teams.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Project setup complete</CardTitle>
            <CardDescription>
              Dark mode, typography, and shadcn/ui are configured.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Incident ID preview:{" "}
              <code className="rounded bg-muted px-2 py-1 font-mono text-xs text-foreground">
                INC-2026-0001
              </code>
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-sev1-bg text-sev1">SEV1</Badge>
              <Badge className="bg-sev2-bg text-sev2">SEV2</Badge>
              <Badge className="bg-sev3-bg text-sev3">SEV3</Badge>
              <Badge className="bg-sev4-bg text-sev4">SEV4</Badge>
            </div>
            <Button>Get started</Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
