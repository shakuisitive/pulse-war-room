/** Keep one entry per user when presence sync returns multiple refs (e.g. multiple tabs). */
export function dedupePresenceMembers<T extends { userId: string; onlineAt: string }>(
  members: T[],
): T[] {
  const byUserId = new Map<string, T>();

  for (const member of members) {
    const existing = byUserId.get(member.userId);
    if (!existing || member.onlineAt >= existing.onlineAt) {
      byUserId.set(member.userId, member);
    }
  }

  return Array.from(byUserId.values());
}
