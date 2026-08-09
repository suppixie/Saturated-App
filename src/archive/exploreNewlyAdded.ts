/**
 * Archived Explore rail.
 *
 * The "Newly Added" section was removed from the consumer Explore screen on
 * 2026-08-09. Keep this selector here so the section can be restored later
 * without rebuilding its catalogue ordering rules.
 */
export function getArchivedNewlyAdded<T extends { createdAt?: string }>(
  items: T[],
  limit = 8,
) {
  return [...items]
    .sort((first, second) => {
      const firstTime = first.createdAt
        ? new Date(first.createdAt).getTime()
        : 0;
      const secondTime = second.createdAt
        ? new Date(second.createdAt).getTime()
        : 0;
      if (firstTime !== secondTime) return secondTime - firstTime;
      return items.indexOf(second) - items.indexOf(first);
    })
    .slice(0, limit);
}
