/**
 * @file components/MealNutritionBadge/SkeletonLoader.tsx
 * @description Animated shimmer skeleton shown while the AI analyzes the meal.
 */

export function SkeletonLoader(): React.JSX.Element {
  return (
    <div className="glass-card p-6 w-full max-w-md animate-fadeUp" role="status" aria-label="Analyzing meal…">

      {/* Header skeleton */}
      <div className="flex items-center gap-3 mb-5">
        <div className="skeleton w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 rounded-lg w-3/4" />
          <div className="skeleton h-3 rounded-lg w-1/2" />
        </div>
      </div>

      {/* Macro grid skeleton – 4 cells */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/5 p-4 space-y-2">
            <div className="skeleton h-3 rounded w-1/2" />
            <div className="skeleton h-6 rounded w-4/5" />
            <div className="skeleton h-3 rounded w-1/3" />
          </div>
        ))}
      </div>

      {/* Alert skeleton */}
      <div className="skeleton h-12 rounded-xl w-full" />

      <span className="sr-only">Loading nutrition data…</span>
    </div>
  );
}
