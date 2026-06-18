/**
 * @file components/MealNutritionBadge/MealNutritionBadge.tsx
 * @description
 *   Glassmorphic floating card that analyses a raw meal description
 *   via the Egyptian Cal AI backend and displays bracketed macro ranges.
 *
 *   States:
 *     idle    → input form prompting the user to describe a meal
 *     loading → shimmer skeleton animation
 *     success → animated glassmorphic nutrition card
 *     error   → friendly error state with retry action
 */

import { useState, useEffect, useId } from 'react';
import { useMealAnalysis } from '../../hooks/useMealAnalysis.ts';
import { SkeletonLoader } from './SkeletonLoader.tsx';
import { MacroCell } from './MacroCell.tsx';
import type { MealMacroData } from '../../api/meals.ts';

// ─── Icons (inline SVG to avoid bundle deps) ──────────────────────────────

const CalorieIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-4 h-4">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
    <path d="M12 6v6l4 2"/>
  </svg>
);
const ProteinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-4 h-4">
    <path d="M12 3c-1.5 1.5-3 3.5-3 6 0 3 2 5 2 8"/>
    <path d="M12 3c1.5 1.5 3 3.5 3 6 0 3-2 5-2 8"/>
    <path d="M9 21h6"/>
  </svg>
);
const CarbsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-4 h-4">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M3 9h18M9 21V9"/>
  </svg>
);
const FatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-4 h-4">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const AlertIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-4 h-4">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const SparkleIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74z"/>
  </svg>
);

// ─── Sub-components ────────────────────────────────────────────────────────

interface ResultCardProps {
  data: MealMacroData;
  rawText: string;
  analyzedAt: string;
  onReset: () => void;
}

function ResultCard({ data, rawText, analyzedAt, onReset }: ResultCardProps): React.JSX.Element {
  const formattedTime = new Date(analyzedAt).toLocaleTimeString('ar-EG', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="glass-card p-6 w-full max-w-md animate-fadeUp">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ec-blue/30 to-ec-protein/20
                          border border-ec-protein/30 flex items-center justify-center
                          animate-pulseGlow">
            <span className="text-ec-protein">
              <SparkleIcon />
            </span>
          </div>
          <div>
            <h2 className="font-display font-bold text-ec-text text-sm leading-tight">
              تحليل الوجبة
            </h2>
            <p className="text-xs text-ec-muted mt-0.5 max-w-[200px] truncate" title={rawText}>
              {rawText}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full
                           bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live AI
          </span>
          <p className="text-xs text-ec-muted mt-1">{formattedTime}</p>
        </div>
      </div>

      {/* ── Macro Grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <MacroCell
          label="Calories"
          value={data.calorieRange}
          unit="kcal range"
          icon={<CalorieIcon />}
          color="text-ec-fat"
          glow="hover:glow-amber"
          border="border-ec-fat/20"
        />
        <MacroCell
          label="Protein"
          value={data.proteinRange}
          icon={<ProteinIcon />}
          color="text-ec-protein"
          glow="hover:glow-blue"
          border="border-ec-protein/20"
        />
        <MacroCell
          label="Carbs"
          value={data.carbsRange}
          icon={<CarbsIcon />}
          color="text-ec-carbs"
          glow="hover:glow-green"
          border="border-ec-carbs/20"
        />
        <MacroCell
          label="Fat"
          value={data.fatRange}
          icon={<FatIcon />}
          color="text-ec-fat"
          glow="hover:glow-amber"
          border="border-ec-fat/20"
        />
      </div>

      {/* ── Alerts ────────────────────────────────────────────────────── */}
      {data.alerts.length > 0 && (
        <div className="space-y-2 mb-5">
          {data.alerts.map((alert, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 rounded-xl px-3.5 py-2.5
                         bg-ec-alert/8 border border-ec-alert/25 glow-red"
            >
              <span className="text-ec-alert mt-0.5 shrink-0">
                <AlertIcon />
              </span>
              <p className="text-xs text-ec-alert/90 leading-relaxed">{alert}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Divider + Reset ───────────────────────────────────────────── */}
      <div className="border-t border-white/5 pt-4 flex items-center justify-between">
        <p className="text-xs text-ec-muted">
          Powered by{' '}
          <span className="text-ec-protein font-semibold">Egyptian Cal AI Engine</span>
        </p>
        <button
          onClick={onReset}
          className="text-xs text-ec-muted hover:text-ec-text transition-colors
                     px-3 py-1.5 rounded-lg hover:bg-white/5 border border-transparent
                     hover:border-white/10 cursor-pointer"
          aria-label="Analyze another meal"
        >
          ← Analyze Again
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

interface MealNutritionBadgeProps {
  /** Pre-fill the raw text input (optional) */
  initialRawText?: string;
  /** Pre-fill the user ID (in production, inject from auth context) */
  userId?: string;
}

export function MealNutritionBadge({
  initialRawText = '',
  userId = '00000000-0000-0000-0000-000000000001', // placeholder UUID for demo
}: MealNutritionBadgeProps): React.JSX.Element {
  const inputId = useId();
  const [rawText, setRawText] = useState(initialRawText);
  const [inputError, setInputError] = useState('');
  const { state, analyze, reset } = useMealAnalysis();

  // If initialRawText is provided as a prop, auto-trigger analysis
  useEffect(() => {
    if (initialRawText && initialRawText.trim().length >= 3) {
      void analyze(initialRawText.trim(), userId);
    }
    // intentionally run only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInputError('');

    if (rawText.trim().length < 3) {
      setInputError('Please enter at least 3 characters describing your meal.');
      return;
    }
    void analyze(rawText.trim(), userId);
  };

  // ── Loading state ──────────────────────────────────────────────────────
  if (state.status === 'loading') {
    return <SkeletonLoader />;
  }

  // ── Success state ──────────────────────────────────────────────────────
  if (state.status === 'success') {
    return (
      <ResultCard
        data={state.data}
        rawText={rawText || initialRawText}
        analyzedAt={state.analyzedAt}
        onReset={() => { reset(); setRawText(''); }}
      />
    );
  }

  // ── Error state ────────────────────────────────────────────────────────
  if (state.status === 'error') {
    return (
      <div className="glass-card p-6 w-full max-w-md animate-fadeUp text-center">
        <div className="w-12 h-12 rounded-2xl bg-ec-alert/10 border border-ec-alert/25
                        flex items-center justify-center mx-auto mb-4">
          <span className="text-ec-alert text-2xl">⚡</span>
        </div>
        <h3 className="font-display font-bold text-ec-text mb-1">Analysis Failed</h3>
        <p className="text-sm text-ec-muted mb-5">{state.message}</p>
        <button
          onClick={() => { reset(); setRawText(''); }}
          className="px-5 py-2.5 rounded-xl bg-ec-blue/20 border border-ec-blue/30
                     text-ec-protein text-sm font-medium hover:bg-ec-blue/30
                     transition-all duration-200 cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  // ── Idle state: input form ─────────────────────────────────────────────
  return (
    <div className="glass-card p-6 w-full max-w-md animate-fadeUp">
      {/* Card Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ec-blue/40 to-purple-600/30
                        border border-ec-protein/30 flex items-center justify-center">
          <span className="text-2xl">🥗</span>
        </div>
        <div>
          <h2 className="font-display font-bold text-ec-text">Meal Analyzer</h2>
          <p className="text-xs text-ec-muted">AI-powered macro intelligence</p>
        </div>
        <span className="ml-auto text-xs px-2 py-1 rounded-full bg-ec-protein/10
                         border border-ec-protein/20 text-ec-protein font-medium">
          Beta
        </span>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <label
          htmlFor={inputId}
          className="block text-xs font-medium text-ec-muted uppercase tracking-widest mb-2"
        >
          Describe your meal
        </label>
        <textarea
          id={inputId}
          value={rawText}
          onChange={(e) => { setRawText(e.target.value); setInputError(''); }}
          placeholder="e.g. بيتزا سجق رنش مع قطع مشروم وموزاريلا…"
          rows={3}
          dir="auto"
          className="w-full rounded-xl bg-white/[0.04] border border-white/10
                     text-ec-text placeholder-ec-muted/50 text-sm p-3.5 resize-none
                     focus:outline-none focus:ring-2 focus:ring-ec-protein/50
                     focus:border-ec-protein/50 transition-all duration-200"
          aria-describedby={inputError ? `${inputId}-error` : undefined}
          aria-invalid={!!inputError}
        />
        {inputError && (
          <p id={`${inputId}-error`} className="text-xs text-ec-alert mt-1.5">
            {inputError}
          </p>
        )}

        <button
          type="submit"
          className="mt-4 w-full py-3 px-5 rounded-xl font-display font-semibold text-sm
                     bg-gradient-to-r from-ec-blue to-blue-400
                     text-white hover:from-blue-500 hover:to-blue-300
                     shadow-lg shadow-ec-blue/20 hover:shadow-ec-blue/40
                     transition-all duration-300 hover:scale-[1.02]
                     active:scale-[0.98] cursor-pointer"
        >
          ✨ Analyze Macros
        </button>
      </form>

      <p className="text-center text-xs text-ec-muted/60 mt-4">
        Supports Arabic & English meal descriptions
      </p>
    </div>
  );
}
