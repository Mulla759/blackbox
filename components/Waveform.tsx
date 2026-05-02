export function Waveform({
  amplitude,
  className = "",
}: {
  amplitude: number[];
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`flex items-center gap-0.5 h-6 ${className}`}
    >
      {amplitude.map((a, i) => (
        <span
          key={i}
          className="w-0.5 bg-current opacity-70"
          style={{ height: `${Math.max(8, a * 100)}%` }}
        />
      ))}
    </div>
  );
}
