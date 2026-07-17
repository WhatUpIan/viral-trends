import { setCommentFlag } from "@/app/brands/actions";
import { FlagBar } from "@/components/FlagBar";
import { LocalTime } from "@/components/LocalTime";
import type { MentionComment } from "@/lib/brands";

type Props = {
  brandId: string;
  comments: (MentionComment & { mentionTitle: string | null; mentionUrl: string })[];
};

function sentimentDot(sentiment: MentionComment["sentiment"]) {
  const color =
    sentiment === "positive"
      ? "bg-green-600"
      : sentiment === "negative"
        ? "bg-[var(--heat)]"
        : "bg-[var(--fog)]";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} aria-hidden />;
}

export function FeedbackList({ brandId, comments }: Props) {
  if (comments.length === 0) {
    return (
      <div className="border border-[var(--line)] bg-white px-6 py-14 text-center">
        <p className="mb-2 text-[var(--ink)]">No feedback captured yet</p>
        <p className="text-sm text-[var(--fog)]">
          When mentions are found on social platforms, we pull top comments so you can track what
          people are saying about your brand.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-[var(--line)] border border-[var(--line)] bg-white">
      {comments.map((c) => (
        <li
          key={c.id}
          className={`px-5 py-4 ${c.highlighted ? "mention-highlighted" : ""} ${
            c.viewed && !c.highlighted ? "mention-viewed" : ""
          }`}
        >
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {sentimentDot(c.sentiment)}
            <span className="text-sm font-medium text-[var(--ink)]">
              {c.author ? `@${c.author}` : "Anonymous"}
            </span>
            {c.likeCount != null && c.likeCount > 0 && (
              <span className="text-xs text-[var(--fog)]">{c.likeCount} likes</span>
            )}
            {c.publishedAt && (
              <span className="ml-auto text-xs text-[var(--fog)]">
                <LocalTime iso={c.publishedAt} />
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--ink-soft)]">{c.text}</p>
          <a
            href={c.mentionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-xs text-[var(--fog)] underline-offset-2 hover:underline"
          >
            on: {c.mentionTitle || c.mentionUrl}
          </a>
          <FlagBar
            flags={{ viewed: c.viewed, responded: c.responded, highlighted: c.highlighted }}
            onToggle={setCommentFlag.bind(null, brandId, c.id)}
          />
        </li>
      ))}
    </ul>
  );
}
