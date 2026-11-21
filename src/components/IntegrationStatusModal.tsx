import { useState } from 'react';
import { CheckCircle2, Globe, Info, Loader2, RefreshCw, X } from 'lucide-react';
import type { IntegrationTestResult, MarketplaceIntegrationInfo } from '../types';
import { formatRelativeTime } from '../utils/formatters';
import { testLocalConnections } from '../utils/localSearchAndHelper';

interface IntegrationStatusModalProps {
  isOpen: boolean;
  integrations: MarketplaceIntegrationInfo[];
  onClose: () => void;
}

export function IntegrationStatusModal({
  isOpen,
  integrations,
  onClose,
}: IntegrationStatusModalProps) {
  const [testResults, setTestResults] = useState<IntegrationTestResult[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleRunTests = () => {
    setIsTesting(true);
    try {
      const results = testLocalConnections();
      setTestResults(results);
    } finally {
      setIsTesting(false);
    }
  };

  const resultsById = new Map(testResults.map((r) => [r.id, r]));

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="integration-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[88vh] overflow-y-auto shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 id="integration-modal-title" className="font-display text-lg font-bold text-slate-900">
              Marketplace Data Sources & Direct Search
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Works immediately in your browser with zero external APIs or keys via direct live
              search links and user-entered price comparison.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close data sources modal"
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex flex-wrap items-center justify-between gap-3 text-xs text-blue-950">
            <div className="flex items-start gap-2.5 flex-1 min-w-[240px]">
              <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                ShopSync never displays fake prices, stock, or delivery dates. Click any store
                search link to open live results on Amazon India, Flipkart, Meesho, or Myntra and
                enter observed prices directly into ShopSync to compare.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRunTests}
              disabled={isTesting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-700 hover:from-blue-700 hover:to-violet-800 rounded-lg disabled:opacity-60 cursor-pointer shrink-0"
            >
              {isTesting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>{isTesting ? 'Checking Sources...' : 'Verify Data Sources'}</span>
            </button>
          </div>

          <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
            {integrations.map((item) => {
              const tested = resultsById.get(item.id);

              return (
                <div key={item.id} className="p-4 bg-white space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-display text-sm font-bold text-slate-900">{item.name}</div>
                      <div className="text-xs text-slate-500">{item.protocol}</div>
                    </div>
                    {item.mode === 'ACTIVE' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Active (No APIs Needed)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                        <Globe className="w-4 h-4 shrink-0" />
                        <span>Direct Search Links Active</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{item.approvalNote}</p>

                  {tested && (
                    <div
                      className={`mt-2 p-2.5 rounded-lg border text-xs flex flex-wrap items-center justify-between gap-2 ${
                        tested.status === 'CONNECTED'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : tested.status === 'DIRECT_SEARCH_ACTIVE'
                            ? 'bg-blue-50 border-blue-200 text-blue-900'
                            : 'bg-rose-50 border-rose-200 text-rose-900'
                      }`}
                    >
                      <span>{tested.message}</span>
                      <span className="font-mono text-[11px]">
                        {formatRelativeTime(tested.testedAtIso)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
