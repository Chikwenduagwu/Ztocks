"use client";

interface MiniChartProps {
  data: number[];
  positive: boolean;
  width?: number;
  height?: number;
  className?: string;
}

export default function MiniChart({
  data,
  positive,
  width = 80,
  height = 32,
  className = "",
}: MiniChartProps) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((v - min) / range) * height * 0.85 - height * 0.075,
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Build fill path (close to bottom)
  const fillPath = [
    `M ${points[0].x},${height}`,
    ...points.map((p) => `L ${p.x},${p.y}`),
    `L ${points[points.length - 1].x},${height}`,
    "Z",
  ].join(" ");

  const strokeColor = positive ? "#10b981" : "#ef4444";
  const fillId = `grad-${positive ? "pos" : "neg"}-${Math.random().toString(36).slice(2, 6)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.15" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${fillId})`} />
      <polyline
        points={polyline}
        stroke={strokeColor}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
