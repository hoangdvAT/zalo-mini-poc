import React, { useCallback } from "react";

export interface SegmentedOption {
  value: string | number;
  label: string;
}

interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string | number;
  onChange: (value: string | number) => void;
  className?: string;
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
  className = "",
}) => {
  const handleClick = useCallback(
    (opt: SegmentedOption) => {
      onChange(opt.value);
    },
    [onChange]
  );

  return (
    <div className={`display-segmented-control ${className}`.trim()}>
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          className={`display-segmented-control__item ${
            value === opt.value ? "display-segmented-control__item--active" : ""
          }`}
          onClick={() => handleClick(opt)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

export default React.memo(SegmentedControl);
