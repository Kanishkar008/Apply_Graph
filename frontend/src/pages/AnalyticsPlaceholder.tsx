import React from 'react';
import { BarChart3, ArrowLeft, TrendingUp, CheckCircle2, Clock, Sparkles, LineChart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Badge } from '../components/ui';

export const AnalyticsPlaceholder: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-[#21262d]">
        <Link to="/">
          <Button variant="ghost" size="xs" icon={<ArrowLeft className="h-4 w-4" />}>
            Overview
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-100">Match & Market Demand Analytics</h1>
            <Badge variant="muted" icon={<Clock className="h-3 w-3" />}>
              Roadmap Feature
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Phase 5 Roadmap Module: Aggregate skill frequency heatmaps and qualification trends.
          </p>
        </div>
      </div>

      {/* Hero Card */}
      <div className="rounded-xl bg-[#161b22] border border-[#30363d] p-8 text-center space-y-6">
        <div className="h-14 w-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 mx-auto flex items-center justify-center">
          <BarChart3 className="h-7 w-7" />
        </div>

        <div className="max-w-lg mx-auto space-y-2">
          <h2 className="text-lg font-bold text-slate-100">Skill Evidence & Pipeline Conversion Insights</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            ApplyGraph is designing quantitative skill demand metrics. Rather than fabricating mock analytics, this module will activate once cross-application telemetry is available in the database.
          </p>
        </div>

        {/* Blueprint preview */}
        <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <TrendingUp className="h-4 w-4 text-teal-400" />
              <span>Evidence Trends</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Track Qualification Index trends across multiple job targets to see which resume variants score highest.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <LineChart className="h-4 w-4 text-brand-400" />
              <span>High-Value Skill Gaps</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Identify recurring missing requirements that frequently lower Qualification Index scores across your target roles.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Market Alignment</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Compare your catalogued skills against real-time industry requirement taxonomies and compensation brackets.
            </p>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-center gap-3">
          <Link to="/match">
            <Button variant="primary" size="sm" icon={<Sparkles className="h-3.5 w-3.5" />}>
              Explore Working Match Engine
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
