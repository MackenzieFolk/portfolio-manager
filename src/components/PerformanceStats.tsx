import { calculatePerformanceStats, buildRHistogram } from '../utils/calculations';
import { ClosedTrade } from '../types';
import { RHistogram } from './RHistogram';

type Props = {
  trades: ClosedTrade[];
  initialEquity: number;
};

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <p className="text-gray-400 text-sm font-semibold mb-1">{label}</p>
      <p className={`text-xl font-bold ${color ?? 'text-white'}`}>{value}</p>
    </div>
  );
}

export function PerformanceStats({ trades, initialEquity }: Props) {
  if (trades.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-4 text-center text-gray-400 text-sm">
        Close at least one trade to see performance statistics.
      </div>
    );
  }

  const stats = calculatePerformanceStats(trades, initialEquity);
  const buckets = buildRHistogram(stats.rMultiples);

  const winColor = stats.winRate >= 50 ? 'text-green-400' : 'text-red-400';
  const expectancyColor = stats.expectancy >= 0 ? 'text-green-400' : 'text-red-400';
  const pnlLongColor = stats.pnlLong >= 0 ? 'text-green-400' : 'text-red-400';
  const pnlShortColor = stats.pnlShort >= 0 ? 'text-green-400' : 'text-red-400';

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-4">
      <h2 className="text-lg font-bold text-white mb-4">Performance Analysis</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Trades" value={String(stats.totalTrades)} />
        <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} color={winColor} />
        <StatCard label="Wins" value={String(stats.winCount)} color="text-green-400" />
        <StatCard label="Losses" value={String(stats.lossCount)} color="text-red-400" />

        <StatCard label="Avg Win $" value={`$${stats.avgWinDollar.toFixed(2)}`} color="text-green-400" />
        <StatCard label="Avg Loss $" value={`$${stats.avgLossDollar.toFixed(2)}`} color="text-red-400" />
        <StatCard label="Avg Win R" value={`${stats.avgWinR.toFixed(2)}R`} color="text-green-400" />
        <StatCard label="Avg Loss R" value={`${stats.avgLossR.toFixed(2)}R`} color="text-red-400" />

        <StatCard
          label="Expectancy"
          value={`${stats.expectancy >= 0 ? '+' : ''}${stats.expectancy.toFixed(2)}R`}
          color={expectancyColor}
        />
        <StatCard label="Avg Days (Winners)" value={`${stats.avgDaysHeldWinners.toFixed(0)}d`} color="text-green-400" />
        <StatCard label="Avg Days (Losers)" value={`${stats.avgDaysHeldLosers.toFixed(0)}d`} color="text-red-400" />
        <div />

        <StatCard
          label="P&L Long"
          value={`${stats.pnlLong >= 0 ? '+' : ''}$${stats.pnlLong.toFixed(2)}`}
          color={pnlLongColor}
        />
        <StatCard
          label="P&L Short"
          value={`${stats.pnlShort >= 0 ? '+' : ''}$${stats.pnlShort.toFixed(2)}`}
          color={pnlShortColor}
        />
      </div>

      <div className="border-t border-gray-700 pt-4">
        <RHistogram buckets={buckets} />
      </div>
    </div>
  );
}
