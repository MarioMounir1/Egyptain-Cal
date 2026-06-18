/**
 * @file components/MealNutritionBadge/MacroCell.tsx
 * @description Individual macro stat cell inside the glassmorphic nutrition card.
 */

import type { ReactNode } from 'react';

interface MacroCellProps {
  label:    string;
  value:    string;
  unit?:    string;
  icon:     ReactNode;
  /** Tailwind color class for the value text */
  color:    string;
  /** CSS glow class from index.css */
  glow:     string;
  /** Border accent color class */
  border:   string;
}

export function MacroCell({
  label, value, unit, icon, color, glow, border,
}: MacroCellProps): React.JSX.Element {
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl p-4
        bg-white/[0.03] border ${border}
        transition-all duration-300 ease-out
        hover:bg-white/[0.06] hover:scale-[1.02] ${glow}
        group
      `}
    >
      {/* Background gradient glow orb */}
      <div className={`absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-10 blur-xl ${color.replace('text-', 'bg-')}`} />

      <div className="relative z-10">
        <div className="flex items-center gap-1.5 mb-2">
          <span className={`text-base ${color}`}>{icon}</span>
          <span className="text-xs font-medium text-ec-muted uppercase tracking-widest">{label}</span>
        </div>
        <p className={`font-display font-bold text-lg leading-tight ${color}`}>{value}</p>
        {unit && <p className="text-xs text-ec-muted mt-0.5">{unit}</p>}
      </div>
    </div>
  );
}
