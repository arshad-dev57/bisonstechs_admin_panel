
export interface ChartDatum {
  label: string;
  value: number;
}

/* ------------------------------ Line / Area ------------------------------ */

export function LineChart({
  data,
  height = 240,
  color = "#6366f1",
}: {
  data: ChartDatum[];
  height?: number;
  color?: string;
}) {
  const width = 600;
  const pad = { top: 20, right: 20, bottom: 32, left: 44 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const max = Math.max(...data.map((d) => d.value)) * 1.15;
  const stepX = innerW / (data.length - 1);
  const points = data.map((d, i) => {
    const x = pad.left + i * stepX;
    const y = pad.top + innerH - (d.value / max) * innerH;
    return { x, y };
  });

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${points[points.length - 1].x},${pad.top + innerH} L${points[0].x},${pad.top + innerH} Z`;
  const grid = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Line chart">
      <defs>
        <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {grid.map((g) => {
        const y = pad.top + innerH - g * innerH;
        return (
          <g key={g}>
            <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />
            <text x={pad.left - 8} y={y + 3} textAnchor="end" fontSize="10" fill="currentColor" fillOpacity="0.5">
              {Math.round(max * g)}
            </text>
          </g>
        );
      })}
      <path d={area} fill="url(#lineFill)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="white" stroke={color} strokeWidth="2.5" />
          <text x={p.x} y={height - 8} textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.6">
            {data[i].label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ------------------------------- Bar chart -------------------------------- */

export function BarChart({
  data,
  height = 200,
  color = "#22c55e",
}: {
  data: ChartDatum[];
  height?: number;
  color?: string;
}) {
  const width = 420;
  const pad = { top: 16, right: 12, bottom: 26, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(...data.map((d) => d.value)) * 1.1;
  const barW = innerW / data.length * 0.55;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Bar chart">
      {[0.25, 0.5, 0.75, 1].map((g) => {
        const y = pad.top + innerH - g * innerH;
        return (
          <g key={g}>
            <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />
            <text x={pad.left - 8} y={y + 3} textAnchor="end" fontSize="10" fill="currentColor" fillOpacity="0.5">
              {Math.round(max * g)}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const x = pad.left + (i * innerW) / data.length + (innerW / data.length - barW) / 2;
        const h = (d.value / max) * innerH;
        const y = pad.top + innerH - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} rx="6" fill={color} opacity="0.9" />
            <text x={x + barW / 2} y={height - 8} textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.6">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------- Donut chart ------------------------------- */

export function DonutChart({
  segments,
  size = 180,
  thickness = 26,
  centerValue,
  centerLabel,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerValue?: string;
  centerLabel?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;

  const built = segments.reduce<{ acc: number; items: (typeof segments[number] & { dash: number; offset: number; key: number })[] }>(
    (st, seg, i) => {
      const frac = seg.value / total;
      const dash = frac * c;
      const offset = -st.acc * c;
      return {
        acc: st.acc + frac,
        items: [...st.items, { ...seg, dash, offset, key: i }],
      };
    },
    { acc: 0, items: [] }
  );

  return (
    <div className="flex items-center justify-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90">
          {built.items.map((seg) => (
            <circle
              key={seg.key}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={`${seg.dash} ${c - seg.dash}`}
              strokeDashoffset={seg.offset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">{centerValue ?? total}</span>
          <span className="text-xs text-muted-foreground">{centerLabel ?? "Total"}</span>
        </div>
      </div>
      <ul className="grid gap-2 text-sm">
        {segments.map((seg) => (
          <li key={seg.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: seg.color }} />
            <span className="text-muted-foreground">{seg.label}</span>
            <span className="ml-auto pl-4 font-semibold">{Math.round((seg.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}