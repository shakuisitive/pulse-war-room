"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { sendChatMessageAction } from "@/app/actions/incidents";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";

export type ChatMessage =
  Database["public"]["Tables"]["chat_messages"]["Row"] & {
    sender?: { display_name: string | null } | null;
  };

type BroadcastPayload = {
  id: string;
  incident_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_display_name: string;
};

async function fetchMessages(incidentId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*, sender:profiles!chat_messages_sender_id_fkey(display_name)")
    .eq("incident_id", incidentId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export function useWarRoomChat(
  incidentId: string,
  initialData: ChatMessage[],
  currentUser: { userId: string; displayName: string },
) {
  const queryClient = useQueryClient();
  const queryKey = ["chat", incidentId];
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchMessages(incidentId),
    initialData,
  });

  useEffect(() => {
    const supabase = createClient();
    const channelName = `war-room:${incidentId}`;

    const channel = supabase
      .channel(channelName, {
        config: { presence: { key: currentUser.userId } },
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `incident_id=eq.${incidentId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey });
        },
      )
      .on("broadcast", { event: "chat_message" }, ({ payload }) => {
        const message = payload as BroadcastPayload;
        queryClient.setQueryData<ChatMessage[]>(queryKey, (current = []) => {
          if (current.some((item) => item.id === message.id)) {
            return current;
          }

          return [
            ...current,
            {
              id: message.id,
              incident_id: message.incident_id,
              org_id: "",
              sender_id: message.sender_id,
              content: message.content,
              is_stakeholder_visible: false,
              created_at: message.created_at,
              sender: { display_name: message.sender_display_name },
            },
          ];
        });
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const { userId, displayName, isTyping } = payload as {
          userId: string;
          displayName: string;
          isTyping: boolean;
        };

        if (userId === currentUser.userId) {
          return;
        }

        setTypingUsers((prev) => {
          if (isTyping) {
            return prev.includes(displayName) ? prev : [...prev, displayName];
          }
          return prev.filter((name) => name !== displayName);
        });
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [incidentId, currentUser.userId, queryClient]);

  const sendMessage = useCallback(
    async (content: string) => {
      setIsSending(true);
      const result = await sendChatMessageAction(incidentId, content);
      setIsSending(false);

      if (result.error) {
        return result;
      }

      const supabase = createClient();
      const { data } = await supabase
        .from("chat_messages")
        .select("id, created_at")
        .eq("incident_id", incidentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && channelRef.current) {
        await channelRef.current.send({
          type: "broadcast",
          event: "chat_message",
          payload: {
            id: data.id,
            incident_id: incidentId,
            sender_id: currentUser.userId,
            content,
            created_at: data.created_at,
            sender_display_name: currentUser.displayName,
          } satisfies BroadcastPayload,
        });
      }

      void queryClient.invalidateQueries({ queryKey });
      return result;
    },
    [incidentId, currentUser.displayName, currentUser.userId, queryClient],
  );

  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!channelRef.current) {
      return;
    }

    await channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: {
        userId: currentUser.userId,
        displayName: currentUser.displayName,
        isTyping,
      },
    });
  }, [currentUser.displayName, currentUser.userId]);

  return {
    messages: query.data ?? [],
    isLoading: query.isLoading,
    isSending,
    typingUsers,
    sendMessage,
    setTyping,
  };
}
