"use client";

import { useCallback, useState, useTransition } from "react";

import { createEvidenceRecordAction } from "@/app/actions/incidents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";

type Evidence = Database["public"]["Tables"]["evidence"]["Row"];

export function WarRoomEvidence({
  incidentId,
  orgId,
  evidence,
  canUpload,
}: {
  incidentId: string;
  orgId: string;
  evidence: Evidence[];
  canUpload: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isUploading, startTransition] = useTransition();

  const handleUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      setError(null);
      startTransition(async () => {
        const supabase = createClient();
        const storagePath = `${orgId}/${incidentId}/${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("evidence")
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          setError(uploadError.message);
          return;
        }

        const formData = new FormData();
        formData.set("incidentId", incidentId);
        formData.set("fileName", file.name);
        formData.set("storagePath", storagePath);
        formData.set("fileType", file.type);
        formData.set("fileSize", String(file.size));

        const result = await createEvidenceRecordAction({}, formData);
        if (result.error) {
          setError(result.error);
        }
      });
    },
    [incidentId, orgId],
  );

  async function openEvidence(storagePath: string) {
    const supabase = createClient();
    const { data, error: signedUrlError } = await supabase.storage
      .from("evidence")
      .createSignedUrl(storagePath, 900);

    if (signedUrlError || !data?.signedUrl) {
      setError(signedUrlError?.message ?? "Could not open file.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Evidence</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canUpload ? (
          <div className="space-y-2">
            <Label htmlFor="evidence-upload">Upload file</Label>
            <Input
              id="evidence-upload"
              type="file"
              accept="image/*,.pdf,.txt,.csv"
              disabled={isUploading}
              onChange={handleUpload}
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            You can view evidence but cannot upload files.
          </p>
        )}

        {evidence.length === 0 ? (
          <p className="text-sm text-muted-foreground">No evidence uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {evidence.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{item.file_name}</p>
                  <p className="text-xs text-muted-foreground">{item.file_type}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEvidence(item.storage_path)}
                >
                  View
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
