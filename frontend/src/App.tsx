/**
 * @file App.tsx
 * @description Root application component demonstrating the MealNutritionBadge.
 * In production, this is replaced with a router (React Router / TanStack Router).
 */

import { useState } from 'react';
import { MealNutritionBadge } from './components/MealNutritionBadge/index.ts';

const DEMO_MEALS = [
  'بيتزا سجق رنش مع قطع مشروم وموزاريلا',
  'كشري كبير بالصلصة والعدس والمكرونة',
  'شاورما دجاج مع خضروات وصلصة طحينة',
  'فطير مشلتيت بالجبن والبيض والعسل',
];

function App(): React.JSX.Element {
  const [selectedMeal, setSelectedMeal] = useState('');
  const [key, setKey] = useState(0);

  const handleDemoSelect = (meal: string) => {
    setSelectedMeal(meal);
    setKey((k) => k + 1); // force remount to reset state
  };

  return (
    <main className="min-h-screen bg-ec-bg flex flex-col items-center justify-center p-6">

      {/* ── Background gradient orbs ─────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full
                        bg-ec-blue/10 blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[400px] h-[400px] rounded-full
                        bg-purple-600/10 blur-[120px]" />
        <div className="absolute top-[40%] left-[55%] w-[300px] h-[300px] rounded-full
                        bg-ec-carbs/5 blur-[100px]" />
      </div>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="relative z-10 text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full
                        bg-white/[0.04] border border-white/10 text-ec-protein text-xs
                        font-medium mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-ec-carbs animate-pulse" />
          AI Engine Active
        </div>
        <h1 className="font-display font-extrabold text-4xl md:text-5xl bg-gradient-to-r
                       from-white via-ec-text to-ec-muted bg-clip-text text-transparent mb-3">
          Egyptian Cal
        </h1>
        <p className="text-ec-muted text-sm md:text-base max-w-sm mx-auto leading-relaxed">
          Real-time AI food nutrition intelligence<br />
          <span className="text-ec-protein">for the Egyptian market</span>
        </p>
      </header>

      {/* ── Demo Meal Selector ────────────────────────────────────────── */}
      <section className="relative z-10 mb-6 flex flex-wrap gap-2 justify-center max-w-lg">
        <p className="w-full text-center text-xs text-ec-muted mb-2">
          Try a demo meal →
        </p>
        {DEMO_MEALS.map((meal) => (
          <button
            key={meal}
            onClick={() => handleDemoSelect(meal)}
            className="text-xs px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10
                       text-ec-muted hover:text-ec-text hover:border-ec-protein/30
                       hover:bg-ec-protein/5 transition-all duration-200 cursor-pointer"
            dir="auto"
          >
            {meal.length > 30 ? meal.slice(0, 30) + '…' : meal}
          </button>
        ))}
      </section>

      {/* ── The Badge ────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full flex justify-center">
        <MealNutritionBadge
          key={key}
          initialRawText={selectedMeal}
          userId="00000000-0000-0000-0000-000000000001"
        />
      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="relative z-10 mt-10 text-center text-xs text-ec-muted/50">
        Built with <span className="text-ec-protein">Egyptian Cal AI Engine</span> · Egypt 🇪🇬
      </footer>
    </main>
  );
}

export default App;
