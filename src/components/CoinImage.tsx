"use client";

import Image from "next/image";
import { useState } from "react";

interface Props {
  src: string;
  alt: string;
  symbol?: string;
  className?: string;
  size?: number;
}

export function CoinImage({ src, alt, symbol = "", className = "w-6 h-6 rounded-full", size = 24 }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={`${className} bg-emerald-500/20 flex items-center justify-center overflow-hidden`}>
        <Image
          src="/logo.svg"
          alt={alt}
          width={size}
          height={size}
          className="opacity-60"
        />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
