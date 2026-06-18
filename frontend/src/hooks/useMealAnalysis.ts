/**
 * @file hooks/useMealAnalysis.ts
 * @description Custom React hook managing the full lifecycle of a meal analysis request.
 *
 * States: idle → loading → success | error
 *
 * Usage:
 *   const { state, analyze, reset } = useMealAnalysis();
 */

import { useState, useCallback } from 'react';
import { analyzeMeal, type MealMacroData } from '../api/meals.ts';

// ── Types ──────────────────────────────────────────────────────────────────

type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

interface IdleState   { status: 'idle' }
interface LoadingState { status: 'loading' }
interface SuccessState { status: 'success'; data: MealMacroData; logId: string; analyzedAt: string }
interface ErrorState  { status: 'error'; message: string }

type AnalysisState = IdleState | LoadingState | SuccessState | ErrorState;

interface UseMealAnalysisReturn {
  state: AnalysisState;
  analyze: (rawText: string, userId: string) => Promise<void>;
  reset: () => void;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useMealAnalysis(): UseMealAnalysisReturn {
  const [state, setState] = useState<AnalysisState>({ status: 'idle' });

  const analyze = useCallback(async (rawText: string, userId: string): Promise<void> => {
    setState({ status: 'loading' });

    try {
      const response = await analyzeMeal(rawText, userId);
      setState({
        status:      'success',
        data:         response.data,
        logId:        response.meta.logId,
        analyzedAt:   response.meta.analyzedAt,
      });
    } catch (err) {
      setState({
        status:  'error',
        message: err instanceof Error ? err.message : 'An unknown error occurred.',
      });
    }
  }, []);

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, analyze, reset };
}

export type { AnalysisState, FetchStatus };
