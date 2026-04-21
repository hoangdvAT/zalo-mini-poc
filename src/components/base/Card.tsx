import React, { useCallback } from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  radius?: "sm" | "md" | "lg";
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  children,
  className = "",
  padding = "md",
  radius = "md",
  onClick,
}) => {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (onClick) {
        e.preventDefault();
        onClick();
      }
    },
    [onClick]
  );

  const paddingClass = padding !== "none" ? `base-card--padding-${padding}` : "";
  const radiusClass = `base-card--radius-${radius}`;

  return (
    <div
      className={`base-card ${paddingClass} ${radiusClass} ${className}`.trim()}
      onClick={onClick ? handleClick : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
};

export default React.memo(Card);
