import React from "react";

const stroke = (w = 1.75) => ({
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: w,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

/** Empty list — tìm kiếm không có kết quả */
export const IllustrationEmptySearch: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="56" height="56" viewBox="0 0 24 24" aria-hidden>
    <circle cx="11" cy="11" r="8" {...stroke()} />
    <path d="M21 21l-4.35-4.35" {...stroke()} />
  </svg>
);

/** Empty — chưa có hóa đơn / thanh toán */
export const IllustrationEmptyInvoice: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="56" height="56" viewBox="0 0 24 24" aria-hidden>
    <path
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      {...stroke()}
    />
    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" {...stroke()} />
  </svg>
);

/** Không tìm thấy nội dung (chiến dịch, v.v.) */
export const IllustrationEmptyMissing: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="56" height="56" viewBox="0 0 24 24" aria-hidden>
    <circle cx="12" cy="12" r="10" {...stroke()} />
    <path d="M16 16 8 8M8 16l8-8" {...stroke()} />
  </svg>
);

export type FileAttachmentKind = "sheet" | "web" | "pdf" | "image" | "generic";

export function fileAttachmentKindFromUrl(url: string): FileAttachmentKind {
  const name = url.split("/").pop() || url;
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["xlsx", "xls", "csv"].includes(ext)) return "sheet";
  if (["html", "htm"].includes(ext)) return "web";
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
  return "generic";
}

/** Meta file đính kèm + loại icon — dùng khi render danh sách (thay emoji cũ) */
export function getAttachmentMeta(url: string): { kind: FileAttachmentKind; label: string; ext: string } {
  const name = url.split("/").pop() || url;
  const extRaw = name.split(".").pop()?.toLowerCase() || "";
  const kind = fileAttachmentKindFromUrl(url);
  if (["html", "htm"].includes(extRaw)) return { kind, label: "Landing Page", ext: "HTML" };
  if (["xlsx", "xls", "csv"].includes(extRaw)) return { kind, label: name, ext: extRaw.toUpperCase() };
  if (extRaw === "pdf") return { kind, label: name, ext: "PDF" };
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(extRaw))
    return { kind, label: name, ext: extRaw.toUpperCase() };
  return { kind, label: name, ext: extRaw ? extRaw.toUpperCase() : "FILE" };
}

/** Icon nhỏ theo loại file — dùng trong danh sách tài liệu */
export const FileAttachmentGlyph: React.FC<{ kind: FileAttachmentKind; size?: number }> = ({
  kind,
  size = 20,
}) => {
  const s = stroke(2);
  switch (kind) {
    case "sheet":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" {...s} />
          <path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" {...s} />
        </svg>
      );
    case "web":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="12" r="10" {...s} />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" {...s} />
        </svg>
      );
    case "pdf":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" {...s} />
          <path d="M14 2v6h6M10 12h4M10 16h4" {...s} />
        </svg>
      );
    case "image":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" {...s} />
          <circle cx="8.5" cy="8.5" r="1.5" {...s} />
          <path d="m21 15-5-5L5 21" {...s} />
        </svg>
      );
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path
            d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
            {...s}
          />
        </svg>
      );
  }
}
