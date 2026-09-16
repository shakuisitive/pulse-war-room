import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

type PostgresChangeBinding = {
  filter: {
    event: "*" | "INSERT" | "UPDATE" | "DELETE";
    schema: "public";
    table: string;
    filter?: string;
  };
  callback: (payload: unknown) => void;
};

export function removeExistingChannel(
  supabase: SupabaseClient,
  channelName: string,
) {
  const topic = `realtime:${channelName}`;

  for (const channel of supabase.getChannels()) {
    if (channel.topic === topic) {
      void supabase.removeChannel(channel);
    }
  }
}

/** Subscribe to postgres changes, replacing any existing channel with the same name. */
export function subscribePostgresChanges(
  supabase: SupabaseClient,
  channelName: string,
  bindings: PostgresChangeBinding[],
): RealtimeChannel {
  removeExistingChannel(supabase, channelName);

  let channel = supabase.channel(channelName);

  for (const binding of bindings) {
    channel = channel.on(
      "postgres_changes",
      binding.filter,
      binding.callback,
    );
  }

  void channel.subscribe();

  return channel;
}
