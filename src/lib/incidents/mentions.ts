export function findMentionedUserIds(
  content: string,
  members: Array<{ id: string; display_name: string }>,
) {
  return members
    .filter((member) => {
      const escaped = member.display_name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`@${escaped}\\b`, "i").test(content);
    })
    .map((member) => member.id);
}