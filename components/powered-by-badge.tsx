import { POWERED_BY_URL } from "@/lib/constants";

export function PoweredByBadge({ className }: { className?: string }) {
  return (
    <a
      href={POWERED_BY_URL}
      target="_blank"
      rel="noreferrer"
      className={[
        "inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-fern bg-moss px-3 py-1.5 text-xs font-medium text-lichen transition hover:border-sun hover:text-sun focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun",
        className ?? "",
      ].join(" ")}
    >
      <span className="inline-block h-2 w-2 rounded-full bg-sun" aria-hidden="true" />
      Powered by ipgeolocation.io
    </a>
  );
}
