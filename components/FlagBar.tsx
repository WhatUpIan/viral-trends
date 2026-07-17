type Flags = {
  viewed: boolean;
  responded: boolean;
  highlighted: boolean;
};

type Props = {
  flags: Flags;
  /** Server action bound to (flag, nextValue) via the wrapping forms below */
  onToggle: (flag: "viewed" | "responded" | "highlighted", value: boolean) => Promise<void>;
};

const FLAG_META = [
  { id: "viewed" as const, on: "Viewed ✓", off: "Mark viewed" },
  { id: "responded" as const, on: "Responded ✓", off: "Mark responded" },
  { id: "highlighted" as const, on: "★ Highlighted", off: "☆ Highlight" },
];

/** Row of workflow toggle buttons (server-action forms, no client JS needed). */
export function FlagBar({ flags, onToggle }: Props) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {FLAG_META.map(({ id, on, off }) => {
        const active = flags[id];
        return (
          <form key={id} action={onToggle.bind(null, id, !active)} className="inline">
            <button
              type="submit"
              className={`flag-chip ${active ? `flag-chip-active flag-chip-${id}` : ""}`}
            >
              {active ? on : off}
            </button>
          </form>
        );
      })}
    </div>
  );
}
