"use client";

import { format } from "date-fns";
import { useRef, useState, useTransition } from "react";

import { updateChatVisibilityAction } from "@/app/actions/incidents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ChatMessage } from "@/hooks/use-war-room-chat";

export function WarRoomChat({
  incidentId,
  messages,
  isSending,
  typingUsers,
  sendMessage,
  setTyping,
  canPost,
  isCommander,
}: {
  incidentId: string;
  messages: ChatMessage[];
  isSending: boolean;
  typingUsers: string[];
  sendMessage: (
    content: string,
    isStakeholderVisible?: boolean,
  ) => Promise<{ error?: string }>;
  setTyping: (isTyping: boolean) => Promise<void>;
  canPost: boolean;
  isCommander: boolean;
}) {
  const [content, setContent] = useState("");
  const [shareWithStakeholders, setShareWithStakeholders] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const typingTimeoutRef = useRef<number | null>(null);

  function handleTyping() {
    void setTyping(true);

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      void setTyping(false);
    }, 1500);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await sendMessage(content.trim(), shareWithStakeholders);
      if (result.error) {
        setError(result.error);
        return;
      }
      setContent("");
      void setTyping(false);
    });
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex-1 space-y-3 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No messages yet. Coordinate with your team here. Use @Name to mention someone.
            </p>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {message.sender?.display_name ?? "Unknown"}
                  </span>
                  <time className="font-mono">
                    {format(new Date(message.created_at), "HH:mm")}
                  </time>
                  {message.is_stakeholder_visible ? (
                    <span className="rounded bg-accent px-1.5 py-0.5 text-accent-foreground">
                      Stakeholder visible
                    </span>
                  ) : null}
                </div>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                {isCommander ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        await updateChatVisibilityAction(
                          message.id,
                          incidentId,
                          !message.is_stakeholder_visible,
                        );
                      });
                    }}
                  >
                    {message.is_stakeholder_visible
                      ? "Hide from stakeholders"
                      : "Share with stakeholders"}
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </div>

        {typingUsers.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            {typingUsers.join(", ")} typing...
          </p>
        ) : null}

        {canPost ? (
          <form onSubmit={handleSubmit} className="space-y-2">
            <Textarea
              value={content}
              onChange={(event) => {
                setContent(event.target.value);
                handleTyping();
              }}
              placeholder="Message the war room. Mentions look like @Alex Chen"
              rows={3}
            />
            {isCommander ? (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="share-chat"
                  checked={shareWithStakeholders}
                  onCheckedChange={(value) => setShareWithStakeholders(value === true)}
                />
                <Label htmlFor="share-chat" className="font-normal">
                  Visible to stakeholders
                </Label>
              </div>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={isPending || isSending || !content.trim()}>
              Send message
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            Observers can read chat but cannot post messages.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
