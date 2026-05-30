import { useState, useRef, useEffect, type JSX } from "react";
import { navigateToPage } from "@/lib/pdf-navigation";

const PAGE_HREF_RE = /^#page=(\d+)$/;

export function CitationLink(
  props: JSX.IntrinsicElements["a"] & { node?: unknown },
) {
  const { href, title, children, node: _, ...rest } = props;
  const match = href ? PAGE_HREF_RE.exec(href) : null;

  if (!match) {
    return (
      <a href={href} title={title} {...rest}>
        {children}
      </a>
    );
  }

  const page = Number(match[1]);
  const quote = title ?? null;

  return <CitationPill page={page} quote={quote}>{children}</CitationPill>;
}

function CitationPill({
  page,
  quote,
  children,
}: {
  page: number;
  quote: string | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium leading-none text-primary hover:bg-primary/20 transition-colors cursor-pointer align-baseline"
      >
        {children}
      </button>

      {open && (
        <span className="absolute left-0 top-full z-50 mt-1 w-56 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-md text-xs">
          {quote && (
            <span className="mb-2 block italic text-muted-foreground leading-relaxed">
              &ldquo;{quote}&rdquo;
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              navigateToPage(page);
              setOpen(false);
            }}
            className="text-primary hover:underline cursor-pointer text-xs font-medium"
          >
            Go to page {page}
          </button>
        </span>
      )}
    </span>
  );
}
