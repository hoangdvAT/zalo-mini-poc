import React, { useCallback } from "react";

interface BaseButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
}

const BaseButton: React.FC<BaseButtonProps> = ({
  children,
  variant = "primary",
  fullWidth = false,
  disabled = false,
  className = "",
  onClick,
  type = "button",
}) => {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!disabled && onClick) {
        e.preventDefault();
        onClick();
      }
    },
    [disabled, onClick]
  );

  return (
    <button
      type={type}
      className={`base-button base-button--${variant} ${fullWidth ? "base-button--full" : ""} ${className}`.trim()}
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export const PrimaryButton: React.FC<Omit<BaseButtonProps, "variant">> = (
  props
) => <BaseButton {...props} variant="primary" />;

export const SecondaryButton: React.FC<Omit<BaseButtonProps, "variant">> = (
  props
) => <BaseButton {...props} variant="secondary" />;

export default React.memo(BaseButton);
