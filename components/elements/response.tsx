import type { ComponentProps } from "react";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";
import { CitationLink } from "./citation-link";

type ResponseProps = ComponentProps<typeof Streamdown>;

export function Response({
  className,
  children,
  mode = "static",
  components,
  ...props
}: ResponseProps) {
  return (
    <Streamdown
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_code]:whitespace-pre-wrap [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto",
        // Scale down headings for chat context
        "[&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h4]:text-sm [&_h5]:text-sm [&_h6]:text-xs",
        "[&_h1]:mt-3 [&_h2]:mt-3 [&_h3]:mt-2 [&_h4]:mt-2 [&_h5]:mt-2 [&_h6]:mt-2",
        "[&_h1]:mb-1 [&_h2]:mb-1 [&_h3]:mb-1 [&_h4]:mb-1 [&_h5]:mb-1 [&_h6]:mb-1",
        // Tighten spacing for chat context
        "[&_blockquote]:my-2 [&_hr]:my-3",
        "[&_p]:my-1.5 [&_p]:leading-relaxed",
        "[&_ul]:my-1.5 [&_ol]:my-1.5",
        className,
      )}
      mode={mode}
      components={{ a: CitationLink, ...components }}
      {...props}
    >
      {children}
    </Streamdown>
  );
}
