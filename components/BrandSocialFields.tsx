import { SOCIAL_PLATFORMS, type BrandSocialAccount } from "@/lib/mentions/own-account";

type Props = {
  accounts?: BrandSocialAccount[];
};

/** Shared social handle fields for create + edit forms */
export function BrandSocialFields({ accounts = [] }: Props) {
  const byPlatform = new Map(accounts.map((a) => [a.platform, a.handle]));

  return (
    <fieldset className="space-y-3 border border-[var(--line)] bg-white p-4">
      <legend className="px-1 text-xs font-medium uppercase tracking-wide text-[var(--fog)]">
        Your official social accounts
      </legend>
      <p className="text-sm text-[var(--ink-soft)]">
        We skip posts from these accounts so you only see what others are saying about your brand.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {SOCIAL_PLATFORMS.map(({ id, label, placeholder }) => (
          <div key={id}>
            <label
              htmlFor={`${id}_handle`}
              className="mb-1 block text-xs font-medium text-[var(--fog)]"
            >
              {label}
            </label>
            <input
              id={`${id}_handle`}
              name={`${id}_handle`}
              defaultValue={byPlatform.get(id) ?? ""}
              className="auth-input"
              placeholder={placeholder}
              autoComplete="off"
            />
          </div>
        ))}
      </div>
    </fieldset>
  );
}
