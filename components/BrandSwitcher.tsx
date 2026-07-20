"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

type BrandOption = {
  id: string;
  name: string;
};

type Props = {
  brands: BrandOption[];
  activeBrandId?: string | null;
  pathname?: string;
};

function brandHref(brandId: string, pathname?: string): string {
  if (pathname?.startsWith("/feedback")) return `/brands/${brandId}?tab=feedback`;
  if (pathname?.startsWith("/mentions")) return `/brands/${brandId}?tab=mentions`;
  return `/brands/${brandId}`;
}

export function BrandSwitcher({ brands, activeBrandId, pathname }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const active = brands.find((b) => b.id === activeBrandId) ?? null;
  const label = active?.name ?? (brands.length === 0 ? "Add a brand" : "Switch brand");

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-[10rem] items-center gap-1.5 rounded-md border border-[var(--line)] bg-white px-2.5 py-1.5 text-sm text-[var(--ink)] transition hover:border-[var(--ink)] sm:max-w-[14rem]"
      >
        <span className="truncate font-medium">{label}</span>
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          className={`h-3 w-3 shrink-0 text-[var(--fog)] transition ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M2.5 4.5 6 8l3.5-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          className="absolute right-0 z-50 mt-1.5 w-56 overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-lg shadow-slate-900/8"
        >
          {brands.length > 0 ? (
            <ul className="max-h-64 overflow-y-auto py-1">
              {brands.map((brand) => {
                const selected = brand.id === activeBrandId;
                return (
                  <li key={brand.id} role="option" aria-selected={selected}>
                    <Link
                      href={brandHref(brand.id, pathname)}
                      onClick={() => setOpen(false)}
                      className={`block truncate px-3 py-2 text-sm transition hover:bg-[var(--canvas)] ${
                        selected
                          ? "bg-[var(--canvas)] font-medium text-[var(--ink)]"
                          : "text-[var(--ink-soft)]"
                      }`}
                    >
                      {brand.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-3 py-3 text-sm text-[var(--fog)]">No brands yet</p>
          )}

          <div className="border-t border-[var(--line)] p-1">
            {brands.length > 0 && (
              <Link
                href="/brands"
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2 text-sm text-[var(--fog)] transition hover:bg-[var(--canvas)] hover:text-[var(--ink)]"
              >
                All brands
              </Link>
            )}
            <Link
              href="/brands/new"
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 text-sm font-medium text-[var(--accent)] transition hover:bg-[var(--accent-soft)]"
            >
              + Add brand
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
