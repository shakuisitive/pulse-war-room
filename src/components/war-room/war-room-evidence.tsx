"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { UploadIcon } from "lucide-react";

import { createEvidenceRecordAction } from "@/app/actions/incidents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/supabase";

type Evidence = Database["public"]["Tables"]["evidence"]["Row"];

function isImageFile(fileType: string) {
  return fileType.startsWith("image/");
}

function EvidenceThumbnail({ storagePath }: { storagePath: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    void supabase.storage
      .from("evidence")
      .createSignedUrl(storagePath, 900, {
        transform: { width: 96, height: 96, resize: "cover" },
      })
      .then(({ data, error }) => {
        if (!cancelled && !error && data?.signedUrl) {
          setSrc(data.signedUrl);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [storagePath]);

  if (!src) {
    return <div className="size-12 shrink-0 rounded-md bg-muted" aria-hidden />;
  }

  return (
    <img
      src={src}
      alt=""
      className="size-12 shrink-0 rounded-md border border-border object-cover"
    />
  );
}

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
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, startTransition] = useTransition();

  const uploadFile = useCallback(
    (file: File) => {
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

  const handleUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      uploadFile(file);
      event.target.value = "";
    },
    [uploadFile],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);

      const file = event.dataTransfer.files?.[0];
      if (!file) {
        return;
      }
      uploadFile(file);
    },
    [uploadFile],
  );

  async function openEvidence(storagePath: string, fileType: string) {
    const supabase = createClient();
    const transform = isImageFile(fileType)
      ? { transform: { width: 1600, height: 1600, resize: "contain" as const } }
      : undefined;

    const { data, error: signedUrlError } = await supabase.storage
      .from("evidence")
      .createSignedUrl(storagePath, 900, transform);

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
            <div
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                if (event.currentTarget.contains(event.relatedTarget as Node)) {
                  return;
                }
                setIsDragging(false);
              }}
              onDrop={handleDrop}
              className={cn(
                "relative flex min-h-28 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/20 px-4 py-6 text-center transition-colors",
                isDragging && "border-primary bg-accent/40",
                isUploading && "pointer-events-none opacity-60",
              )}
            >
              <UploadIcon className="size-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag and drop a file here, or choose one below
              </p>
              <Input
                id="evidence-upload"
                type="file"
                accept="image/*,.pdf,.txt,.csv"
                disabled={isUploading}
                onChange={handleUpload}
                className="max-w-xs"
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {isUploading ? (
              <p className="text-sm text-muted-foreground">Uploading…</p>
            ) : null}
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
                className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {isImageFile(item.file_type) ? (
                    <EvidenceThumbnail storagePath={item.storage_path} />
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.file_name}</p>
                    <p className="text-xs text-muted-foreground">{item.file_type}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEvidence(item.storage_path, item.file_type)}
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
