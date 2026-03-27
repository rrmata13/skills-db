"use client";

interface ScoreBreakdownProps {
  lexicalScore: number;
  semanticScore: number;
  ruleScore: number;
  popularityScore: number;
}

export function ScoreBreakdown({
  lexicalScore,
  semanticScore,
  ruleScore,
  popularityScore,
}: ScoreBreakdownProps) {
  const bars = [
    { label: "Keyword", value: lexicalScore, color: "bg-blue-500" },
    { label: "Semantic", value: semanticScore, color: "bg-purple-500" },
    { label: "Category", value: ruleScore, color: "bg-emerald-500" },
    { label: "Popularity", value: popularityScore, color: "bg-amber-500" },
  ];

  return (
    <div className="space-y-1.5">
      {bars.map(({ label, value, color }) => (
        <div key={label} className="flex items-center gap-2 text-xs">
          <span className="w-16 text-muted-foreground">{label}</span>
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full ${color} transition-all`}
              style={{ width: `${Math.round(value * 100)}%` }}
            />
          </div>
          <span className="w-8 text-right text-muted-foreground">
            {Math.round(value * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}
