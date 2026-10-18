import React from 'react';
import { Kanban, ArrowLeft, Layers, CheckCircle2, Clock, Calendar, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Badge } from '../components/ui';

export const ApplicationsPlaceholder: React.FC = () => {
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
            <h1 className="text-xl font-bold text-slate-100">Application Pipeline & Tracking</h1>
            <Badge variant="muted" icon={<Clock className="h-3 w-3" />}>
              Roadmap Feature
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Phase 4 Roadmap Module: Provenance tracking from initial match to final offer.
          </p>
        </div>
      </div>

      {/* Hero Card */}
      <div className="rounded-xl bg-[#161b22] border border-[#30363d] p-8 text-center space-y-6">
        <div className="h-14 w-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 mx-auto flex items-center justify-center">
          <Kanban className="h-7 w-7" />
        </div>

        <div className="max-w-lg mx-auto space-y-2">
          <h2 className="text-lg font-bold text-slate-100">End-to-End Application Lifecycle</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            ApplyGraph is actively developing structured lifecycle tracking. This will connect evaluated match reports directly to job submission records, interview stages, and custom resume snapshot versions.
          </p>
        </div>

        {/* Blueprint preview */}
        <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <Layers className="h-4 w-4 text-brand-400" />
              <span>Multi-Stage Kanban</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Track stages: Draft, Submitted, Recruiter Screen, Technical Interview, Executive Loop, and Offer.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <CheckCircle2 className="h-4 w-4 text-teal-400" />
              <span>Versioned Snapshots</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Link exact resume text versions and match qualification index snapshots to each submission.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <Calendar className="h-4 w-4 text-amber-400" />
              <span>Interview Timeline</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Log interviewer feedback against verified skills and mandatory requirements.
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
