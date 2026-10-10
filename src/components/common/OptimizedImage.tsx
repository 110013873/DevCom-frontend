import { ImgHTMLAttributes } from "react";

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  fetchpriority?: "high" | "low" | "auto";
  width?: number;
  height?: number;
}

export function OptimizedImage({
  loading = "lazy",
  decoding = "async",
  fetchpriority,
  width,
  height,
  style,
  ...rest
}: OptimizedImageProps) {
  const computedStyle: React.CSSProperties = {
    ...(width !== undefined && height !== undefined
      ? { aspectRatio: `${width} / ${height}` }
      : {}),
    ...style,
  };

  return (
    <img
      loading={loading}
      decoding={decoding}
      {...(fetchpriority ? { fetchpriority } : {})}
      width={width}
      height={height}
      style={computedStyle}
      {...rest}
    />
  );
}
