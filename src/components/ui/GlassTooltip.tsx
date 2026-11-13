/**
 * Shared Recharts tooltip with consistent glass styling.
 * Use as: <Tooltip content={<GlassTooltip />} />
 */
export function GlassTooltip({ active, payload, label, formatter }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string; dataKey: string }[];
  label?: string;
  formatter?: (value: number, name: string) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-input px-3 py-2.5 text-xs"
      style={{
        background: 'rgba(20, 20, 35, 0.92)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderTopColor: 'rgba(255,255,255,0.22)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {label && (
        <p className="text-[10px] text-content-muted mb-1.5 font-medium uppercase tracking-wide">
          {label}
        </p>
      )}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-content-secondary">
            {p.name ? `${p.name}: ` : ''}
          </span>
          <span className="text-content-primary font-semibold">
            {formatter ? formatter(p.value, p.name) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}
