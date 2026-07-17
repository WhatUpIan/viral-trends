"use client";

type Props = {
  iso: string;
  className?: string;
};

/** Full date + time rendered in the viewer's timezone. */
export function LocalTime({ iso, className }: Props) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const formatted = date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {formatted}
    </time>
  );
}
