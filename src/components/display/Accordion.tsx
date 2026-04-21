import React, { useState, useRef, useEffect } from "react";
import { Icon } from "zmp-ui";

export interface AccordionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const Accordion: React.FC<AccordionProps> = ({
  title,
  defaultOpen = false,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(
    defaultOpen ? undefined : 0
  );

  const toggle = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (isOpen) {
      setHeight(contentRef.current?.scrollHeight);
    } else {
      setHeight(0);
    }
  }, [isOpen]);

  return (
    <div className="accordion">
      <div className="accordion__header" onClick={toggle}>
        <span className="accordion__title">{title}</span>
        <Icon
          icon="zi-chevron-down"
          className={`accordion__icon ${isOpen ? "accordion__icon--open" : ""}`}
        />
      </div>
      <div
        className="accordion__content-wrapper"
        style={{ height }}
        ref={contentRef}
      >
        <div className="accordion__content">{children}</div>
      </div>
    </div>
  );
};

export default Accordion;
