import React from "react";
import { Text } from "zmp-ui";

interface SectionHeaderProps {
  title: string;
  icon?: string | React.ReactNode;
  className?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  icon,
  className = "",
}) => (
  <div className={`base-section-header ${className}`.trim()}>
    {icon && (
      <span className="base-section-header__icon">
        {typeof icon === "string" ? icon : icon}
      </span>
    )}
    <Text.Title size="small" className="base-section-header__title">
      {title}
    </Text.Title>
  </div>
);

export default React.memo(SectionHeader);
