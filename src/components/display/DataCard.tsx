import React from "react";
import { Text } from "zmp-ui";
import { formatNumber, formatChange } from "@/utils/format";

interface DataCardProps {
  label: string;
  value: number;
  change?: number;
  format?: "number" | "currency";
  icon: string;
  color: string;
  description?: string;
  variant?: "default" | "balance" | "metric";
}

const DataCard: React.FC<DataCardProps> = ({
  label,
  value,
  change,
  format = "number",
  icon,
  color,
  description,
  variant = "default",
}) => {
  const formattedValue =
    format === "currency" ? `${formatNumber(value)}đ` : formatNumber(value);

  const changeClass =
    change !== undefined
      ? change >= 0
        ? "display-data-card__change--up"
        : "display-data-card__change--down"
      : "";

  return (
    <div
      className={`display-data-card display-data-card--${variant}`}
      style={{ borderLeftColor: color }}
    >
      <div className="display-data-card__header">
        <span
          className="display-data-card__icon"
          style={{ background: color }}
          aria-hidden
        >
          {icon}
        </span>
        <Text size="xSmall" className="display-data-card__label">
          {label}
        </Text>
      </div>
      <Text size="large" bold className="display-data-card__value">
        {formattedValue}
      </Text>
      {description && (
        <Text size="xxSmall" className="display-data-card__description">
          {description}
        </Text>
      )}
      {change !== undefined && (
        <span className={`display-data-card__change ${changeClass}`}>
          {formatChange(change)}
        </span>
      )}
    </div>
  );
};

export default React.memo(DataCard);
