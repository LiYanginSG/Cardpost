import { initials } from "@/lib/format";

/** Profile picture, or initials when there isn't one. Fixed square; the picture is cropped to fit, never stretched. */
export function Avatar({ name, url, size = 44 }: { name: string; url?: string | null; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.32) }} aria-hidden="true">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" width={size} height={size} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : (
        initials(name)
      )}
    </span>
  );
}
