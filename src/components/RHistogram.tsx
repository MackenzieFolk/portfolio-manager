import { HistogramBucket } from '../types';

export function RHistogram({ buckets }: { buckets: HistogramBucket[] }) {
  const maxCount = Math.max(...buckets.map(b => b.count), 1);
  const svgWidth = 560;
  const svgHeight = 200;
  const barAreaHeight = 150;
  const barWidth = 64;
  const gap = 16;
  const offsetX = 20;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">R-Multiple Distribution</h3>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full max-w-2xl" style={{ minWidth: 400 }}>
          {buckets.map((bucket, i) => {
            const barHeight = bucket.count === 0 ? 0 : Math.max(4, (bucket.count / maxCount) * barAreaHeight);
            const x = offsetX + i * (barWidth + gap);
            const y = barAreaHeight - barHeight + 20;
            const isWin = bucket.min >= 0;
            const isLoss = bucket.max <= 0;
            const fill = isWin ? '#22c55e' : isLoss ? '#ef4444' : '#6b7280';

            return (
              <g key={bucket.label}>
                {bucket.count > 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={y - 4}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#e5e7eb"
                  >
                    {bucket.count}
                  </text>
                )}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={fill}
                  rx="3"
                  opacity={bucket.count === 0 ? 0.2 : 0.85}
                >
                  <title>{bucket.label}: {bucket.count} trade{bucket.count !== 1 ? 's' : ''}</title>
                </rect>
                <text
                  x={x + barWidth / 2}
                  y={svgHeight - 4}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#9ca3af"
                >
                  {bucket.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
