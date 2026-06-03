"use client";
import * as Lucide from "lucide-react";

export function Icon({
  name,
  size = 18,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Cmp = (Lucide as any)[name] ?? Lucide.Square;
  return <Cmp size={size} className={className} />;
}
