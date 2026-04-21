import React, { useCallback } from "react";
import { Icon } from "zmp-ui";

interface IconButtonProps {
  icon: string;
  ariaLabel: string;
  onClick?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const IconButton: React.FC<IconButtonProps> = ({
  icon,
  ariaLabel,
  onClick,
  className = "",
  size = "md",
}) => {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onClick?.();
    },
    [onClick]
  );

  return (
    <button
      type="button"
      className={`base-icon-button base-icon-button--${size} ${className}`.trim()}
      onClick={handleClick}
      aria-label={ariaLabel}
    >
      <Icon icon={icon} />
    </button>
  );
};

export default React.memo(IconButton);
