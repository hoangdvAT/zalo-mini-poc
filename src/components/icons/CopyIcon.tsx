import React from "react";

export interface CopyIconProps {
    size?: number;
    className?: string;
    /** Đã sao chép — hiển thị dấu tích */
    copied?: boolean;
}

/**
 * Icon copy / check — stroke currentColor, dùng trong nút sao chép.
 */
export const CopyIcon: React.FC<CopyIconProps> = ({ size = 20, className, copied = false }) => {
    if (copied) {
        return (
            <svg
                className={className}
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
            >
                <path
                    d="M20 6L9 17l-5-5"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        );
    }
    return (
        <svg
            className={className}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
        >
            <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.75" />
            <path
                d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};
