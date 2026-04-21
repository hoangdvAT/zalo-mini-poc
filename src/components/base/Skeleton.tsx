import React from "react";

interface SkeletonProps {
  variant?: "line" | "card" | "avatar" | "title" | "text";
  className?: string;
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
}

const Skeleton: React.FC<SkeletonProps> = ({
  variant = "line",
  className = "",
  width,
  height,
  style,
}) => {
  const inlineStyle = {
    ...style,
    ...(width && { width: typeof width === "number" ? `${width}px` : width }),
    ...(height && { height: typeof height === "number" ? `${height}px` : height }),
  };

  return (
    <div
      className={`base-skeleton base-skeleton--${variant} shimmer ${className}`.trim()}
      style={inlineStyle}
    />
  );
};

interface GridSkeletonProps {
  count?: number;
  columns?: number;
  variant?: "card" | "line";
}

export const GridSkeleton: React.FC<GridSkeletonProps> = ({
  count = 6,
  columns = 2,
  variant = "card",
}) => (
  <div
    className="base-skeleton-grid"
    style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
  >
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} variant={variant === "card" ? "card" : "line"} />
    ))}
  </div>
);

export const CardSkeleton: React.FC = () => (
  <div className="base-card-skeleton">
    <Skeleton variant="card" className="base-card-skeleton__image" />
    <div className="base-card-skeleton__content">
      <Skeleton variant="title" />
      <Skeleton variant="line" width="60%" />
      <Skeleton variant="line" width="40%" />
    </div>
  </div>
);

export const GridSkeletonGrid: React.FC<{ count?: number }> = ({
  count = 6,
}) => (
  <div
    className="base-skeleton-grid"
    style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
  >
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

export const CampaignCardSkeleton: React.FC = () => (
  <div className="campaign-card" style={{ padding: 0, boxShadow: "var(--shadow-sm)" }}>
    <Skeleton variant="card" className="base-card-skeleton__image" style={{ aspectRatio: "1/1" }} />
    <div className="campaign-card__info" style={{ gap: 12 }}>
      <Skeleton variant="title" width="80%" />
      <Skeleton variant="line" width="60%" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
        <Skeleton variant="line" width="30%" />
        <Skeleton variant="line" width="25%" height={24} />
      </div>
      <Skeleton variant="line" width="100%" height={44} style={{ borderRadius: "9999px", marginTop: 8 }} />
    </div>
  </div>
);

export const CampaignListSkeleton: React.FC<{ count?: number }> = ({
  count = 3,
}) => (
  <div className="campaign-list">
    {Array.from({ length: count }).map((_, i) => (
      <CampaignCardSkeleton key={i} />
    ))}
  </div>
);

export default React.memo(Skeleton);
