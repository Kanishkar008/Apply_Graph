import React from 'react';
import { BarChart3, ArrowLeft, TrendingUp, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AnalyticsPlaceholder: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-white">Match & Market Analytics</h2>
          <p className="text-xs text-slate-400">Phase 2 Planned Module</p>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-8 text-center space-y-5">
        <div className="h-14 w-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
          <BarChart3 className="h-7 w-7" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-lg font-bold text-white">Skill Evidence & Pipeline Conversion Insights</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Gain data-driven intelligence on your match rate trends, high-demand skills in your sector, and interview response ratios.
          </p>
        </div>

        <div className="max-w-md mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Evidence Scoring Trends
            </span>
            <p className="text-[11px] text-slate-400">Track alignment scores across varied job categories.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> High-Value Skill Gaps
            </span>
            <p className="text-[11px] text-slate-400">Identify which skills yield the greatest interview bump.</p>
          </div>
        </div>

        <div className="pt-2">
          <button
            disabled
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-500 text-xs font-semibold cursor-not-allowed border border-slate-700/50"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Generate Reports (Unlocks in Phase 2)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
