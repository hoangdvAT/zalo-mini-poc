import React from "react";

interface ScreenContainerProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  className = "",
  padding = true,
}) => (
  <div
    className={`layout-screen-container ${padding ? "layout-screen-container--padding" : ""} ${className}`.trim()}
  >
    {children}
  </div>
);

export default React.memo(ScreenContainer);
