import React from "react";

/**
 * Premium Skeleton Loader
 * Styled to match the dark slate/navy theme of the interactive map UI.
 */
function Skeleton({ className = "", ...props }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-[#2e3142] border border-[#3b3e52] ${className}`}
      {...props}
    />
  );
}

export { Skeleton };
