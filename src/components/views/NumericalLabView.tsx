import { useState } from 'react';
import { Calculator, Sparkles } from 'lucide-react';
import type { ActiveStudyContext, NavModuleId } from '../../types/studyverse';
import { resolveContextDetails } from '../../utils/curriculumHelpers';
import { ContextBreadcrumbBar } from '../common/ContextBreadcrumbBar';
import { IntegrationBanner } from '../common/IntegrationBanner';

interface NumericalLabViewProps {
  context: ActiveStudyContext;
  onNavigate: (module: NavModuleId) => void;
}

export function NumericalLabView({ context, onNavigate }: NumericalLabViewProps) {
  const { cls, subject, topic } = resolveContextDetails(context);
  const [problemStatement, setProblemStatement] = useState('');
  const [givenValues, setGivenValues] = useState('');
  const [studentAttempt, setStudentAttempt] = useState('');
  const [verifyRequested, setVerifyRequested] = useState(false);

  return (
    <div className="space-y-6">
      <ContextBreadcrumbBar context={context} onNavigate={onNavigate} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-[#1b1430] dark:text-[#f3f0fc]">
                Numerical Solving Laboratory
              </h2>
              <p className="text-xs text-[#5b5276] dark:text-[#b0a6cf]">
                Structured problem-solving workspace for {cls.label} · {subject.name}
              </p>
            </div>
            <Calculator className="w-5 h-5 text-[#6d28d9] dark:text-[#a78bfa]" aria-hidden="true" />
          </div>

          <div>
            <label
              htmlFor="sv-num-problem"
              className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf] mb-1.5"
            >
              Problem Statement
            </label>
            <textarea
              id="sv-num-problem"
              rows={3}
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              placeholder={`Paste or type a textbook numerical from ${topic.title}...`}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc] focus:outline-none focus:ring-2 focus:ring-[#6d28d9]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="sv-num-given"
                className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf] mb-1.5"
              >
                Given Quantities & Units
              </label>
              <textarea
                id="sv-num-given"
                rows={3}
                value={givenValues}
                onChange={(e) => setGivenValues(e.target.value)}
                placeholder="e.g. u = 20 m/s, θ = 30°, g = 9.8 m/s²"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] font-mono-tabular text-xs text-[#1b1430] dark:text-[#f3f0fc] focus:outline-none focus:ring-2 focus:ring-[#6d28d9]"
              />
            </div>

            <div>
              <label
                htmlFor="sv-num-attempt"
                className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf] mb-1.5"
              >
                Your Step-by-Step Working
              </label>
              <textarea
                id="sv-num-attempt"
                rows={3}
                value={studentAttempt}
                onChange={(e) => setStudentAttempt(e.target.value)}
                placeholder="Write your substitution and intermediate steps..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] font-mono-tabular text-xs text-[#1b1430] dark:text-[#f3f0fc] focus:outline-none focus:ring-2 focus:ring-[#6d28d9]"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setVerifyRequested(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>Check Steps with AI Lab</span>
          </button>
        </section>

        <section className="lg:col-span-5 space-y-5">
          <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-3">
            <h3 className="font-display text-base font-bold text-[#1b1430] dark:text-[#f3f0fc]">
              Topic Reference Sheet
            </h3>
            <div className="p-3.5 rounded-xl bg-[#faf8ff] dark:bg-[#221a3a] border border-[#efeaf9] dark:border-[#2e244d]">
              <div className="text-xs font-medium text-[#776d94] dark:text-[#968cb8]">
                Active Topic Formula
              </div>
              <div className="mt-1 font-mono-tabular text-sm font-semibold text-[#5b21b6] dark:text-[#c4b5fd]">
                {topic.keyFormula || 'Select a formula-tagged topic in Explorer'}
              </div>
            </div>
            <ul className="text-xs text-[#5b5276] dark:text-[#b0a6cf] space-y-1.5 list-disc pl-4">
              <li>Convert all measurements into consistent SI units before substituting.</li>
              <li>Check sign conventions (optics, vectors, thermodynamics) prior to calculation.</li>
              <li>Verify dimensional consistency on both sides of the equation.</li>
            </ul>
          </div>

          <IntegrationBanner
            serviceName="Gemini API"
            title={
              verifyRequested
                ? 'Step Verification Queued for Gemini API'
                : 'AI Numerical Step Verifier Ready'
            }
            description="Connect Gemini API to evaluate your working line-by-line, detect unit or sign errors, and guide you to the right final answer without giving fake math solutions."
            onNavigate={onNavigate}
          />
        </section>
      </div>
    </div>
  );
}
