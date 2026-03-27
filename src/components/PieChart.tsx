import { useState, useRef } from 'react';

export type PieSegment = {
  label: string;
  value: number;
  color: string;
  positionId?: string;
};

type MenuState = {
  positionId: string;
  label: string;
  percent: string;
  clientX: number;
  clientY: number;
};

type TooltipState = {
  label: string;
  percent: string;
  clientX: number;
  clientY: number;
};

type PieChartProps = {
  segments: PieSegment[];
  size?: number;
  onEdit: (positionId: string) => void;
  onClose: (positionId: string) => void;
  onDelete: (positionId: string) => void;
  onAddTranche: (positionId: string) => void;
};

export function PieChart({ segments, size = 160, onEdit, onClose, onDelete, onAddTranche }: PieChartProps) {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = segments.reduce((s, seg) => s + Math.max(0, seg.value), 0);
  if (total === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 8;

  let currentAngle = -Math.PI / 2;

  const slices = segments
    .filter(seg => seg.value > 0)
    .map(seg => {
      const fraction = seg.value / total;
      const angle = fraction * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = angle > Math.PI ? 1 : 0;

      return {
        ...seg,
        d: `M ${cx} ${cy} L ${x1.toFixed(3)} ${y1.toFixed(3)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(3)} ${y2.toFixed(3)} Z`,
        fraction,
      };
    });

  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setMenu(null), 150);
  };

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const openMenu = (e: React.MouseEvent, slice: (typeof slices)[0]) => {
    if (!slice.positionId) return;
    cancelClose();
    setMenu({ positionId: slice.positionId, label: slice.label, percent: (slice.fraction * 100).toFixed(1), clientX: e.clientX, clientY: e.clientY });
  };

  const handleSliceEnter = (e: React.MouseEvent, slice: (typeof slices)[0]) => {
    setHovered(slice.label);
    if (slice.positionId) {
      openMenu(e, slice);
    } else {
      setTooltip({ label: slice.label, percent: (slice.fraction * 100).toFixed(1), clientX: e.clientX, clientY: e.clientY });
    }
  };

  const handleSliceLeave = (slice: (typeof slices)[0]) => {
    setHovered(null);
    setTooltip(null);
    if (slice.positionId) scheduleClose();
  };

  return (
    <>
      <div className="flex gap-4 items-start">
        {/* Pie */}
        <svg width={size} height={size} className="flex-shrink-0">
          {slices.map((slice, i) => (
            <path
              key={i}
              d={slice.d}
              fill={slice.color}
              stroke="#111827"
              strokeWidth={2}
              opacity={hovered && hovered !== slice.label ? 0.55 : 1}
              className={slice.positionId ? 'cursor-pointer transition-opacity' : 'transition-opacity'}
              onMouseEnter={e => handleSliceEnter(e, slice)}
              onMouseLeave={() => handleSliceLeave(slice)}
            />
          ))}
        </svg>

        {/* Legend */}
        <div className="flex flex-col gap-1 justify-center min-w-0" style={{ maxHeight: size, overflowY: 'auto' }}>
          {slices.map((slice, i) => (
            <div
              key={i}
              className={`flex items-center gap-1.5 text-xs min-w-0 ${slice.positionId ? 'cursor-pointer' : ''}`}
              onMouseEnter={e => handleSliceEnter(e, slice)}
              onMouseLeave={() => handleSliceLeave(slice)}
            >
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: slice.color }} />
              <span className="text-gray-300 truncate">{slice.label}</span>
              <span className="text-gray-500 flex-shrink-0">{(slice.fraction * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cash / non-position tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl px-3 py-2 pointer-events-none"
          style={{ left: tooltip.clientX, top: tooltip.clientY, transform: 'translate(-50%, calc(-100% - 8px))' }}
        >
          <p className="text-xs font-semibold text-white">{tooltip.label}</p>
          <p className="text-xs text-gray-400">{tooltip.percent}% of portfolio</p>
        </div>
      )}

      {/* Context menu */}
      {menu && (
        <div
          className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1 min-w-[150px]"
          style={{ left: menu.clientX, top: menu.clientY, transform: 'translate(-50%, calc(-100% - 8px))' }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div className="px-3 py-1.5 border-b border-gray-700">
            <p className="text-xs font-semibold text-white">{menu.label}</p>
            <p className="text-xs text-gray-400">{menu.percent}% of equity</p>
          </div>
          <button
            onClick={() => { onEdit(menu.positionId); setMenu(null); }}
            className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 transition"
          >Edit</button>
          <button
            onClick={() => { onClose(menu.positionId); setMenu(null); }}
            className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 transition"
          >Close Position</button>
          <button
            onClick={() => { onAddTranche(menu.positionId); setMenu(null); }}
            className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 transition"
          >+ Tranche</button>
          <button
            onClick={() => {
              if (window.confirm(`Delete ${menu.label}? This cannot be undone.`)) {
                onDelete(menu.positionId);
              }
              setMenu(null);
            }}
            className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700 transition border-t border-gray-700"
          >Delete</button>
        </div>
      )}
    </>
  );
}
