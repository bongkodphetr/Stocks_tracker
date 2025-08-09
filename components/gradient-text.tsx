import React from "react";
import { cn } from "@/lib/utils";

type GradientTextProps = {
  children: React.ReactNode;
  className?: string;
};

export function GradientText({ children, className }: GradientTextProps) {
  return (
    <span
      className={cn(
        "inline-flex animate-text-gradient bg-gradient-to-r from-[#000000] via-[#ffffff] to-[#000000] bg-[200%_auto] text-3xl text-center text-transparent font-medium bg-clip-text",
        className
      )}
    >
      {children}
    </span>
  );
}


