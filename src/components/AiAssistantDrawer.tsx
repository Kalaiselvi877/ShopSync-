import { useState, type FormEvent } from 'react';
import { ArrowUpRight, Bot, GitCompare, Loader2, Send, Sparkles, X } from 'lucide-react';
import type { AssistantMessage, ProductItem } from '../types';
import { formatINR } from '../utils/formatters';

interface AiAssistantDrawerProps {
  isOpen: boolean;
  messages: AssistantMessage[];
  isLoading: boolean;
  onClose: () => void;
  onSendQuery: (query: string) => void;
  onOpenProduct: (product: ProductItem) => void;
  onAddToCompare: (productId: string) => void;
}

const PRESET_PROMPTS = [
  'Which store has the cheapest entered price?',
  'Search iPhone 15 across all 4 stores',
  'Find headphones under ₹3000',
  'Compare Nike Running Shoes across Amazon, Flipkart, Meesho, and Myntra',
];

export function AiAssistantDrawer({
  isOpen,
  messages,
  isLoading,
  onClose,
  onSendQuery,
  onOpenProduct,
  onAddToCompare,
}: AiAssistantDrawerProps) {
  const [input, setInput] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput('');
    onSendQuery(trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="ShopSync Smart Price Helper"
    >
      <div className="bg-white w-full max-w-lg h-full flex flex-col border-l border-slate-200 shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-700 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                ShopSync Smart Price Helper
              </h2>
              <p className="text-xs text-slate-500">
                Direct Store Search & Entered Price Analyzer · No External AI Quota Required
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Price Helper"
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/60">
          {messages.length === 0 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white border border-slate-200 text-sm text-slate-700 space-y-2">
                <div className="font-semibold text-slate-900 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-violet-700" />
                  <span>Generate live store links or check your lowest entered prices</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Type any product name or budget question below. ShopSync instantly generates live
                  search links for Amazon India, Flipkart, Meesho, and Myntra and highlights the
                  lowest price from the values you enter directly in your browser.
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-500">Quick actions</div>
                <div className="grid grid-cols-1 gap-2">
                  {PRESET_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => onSendQuery(prompt)}
                      className="text-left px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-violet-500 hover:text-violet-700 text-sm font-medium text-slate-800 transition-colors cursor-pointer"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[92%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-violet-700 text-white'
                    : msg.error
                      ? 'bg-rose-50 border border-rose-200 text-rose-800'
                      : 'bg-white border border-slate-200 text-slate-800'
                }`}
              >
                <p>{msg.error ? msg.error : msg.text}</p>

                {msg.bestPickReason && !msg.error && (
                  <p className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                    <strong className="text-slate-800">Note:</strong> {msg.bestPickReason}
                  </p>
                )}

                {msg.directSearchLinks && msg.directSearchLinks.length > 0 && !msg.error && (
                  <div className="mt-3 pt-2 border-t border-slate-100 space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-600">
                      Open Live Marketplace Search Results:
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {msg.directSearchLinks.map((link) => (
                        <a
                          key={link.marketplace}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-between gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 border border-blue-200 bg-blue-50/70 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <span className="truncate">{link.marketplaceName}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {msg.recommendedProducts && msg.recommendedProducts.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {msg.recommendedProducts.map((item) => {
                      const offer = item.bestOffer;
                      return (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                onOpenProduct(item);
                                onClose();
                              }}
                              className="text-xs font-semibold text-slate-900 hover:text-violet-700 text-left cursor-pointer"
                            >
                              {item.name}
                            </button>
                            <span className="font-mono tabular-nums text-xs font-bold text-emerald-700 shrink-0">
                              {offer && offer.totalLandedPrice !== null
                                ? formatINR(offer.totalLandedPrice)
                                : 'Enter Prices'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600">
                            {offer && offer.totalLandedPrice !== null
                              ? `Lowest entered on ${offer.marketplaceName}`
                              : 'Click store links above & enter prices in Details'}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onAddToCompare(item.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold border border-slate-300 bg-white rounded hover:bg-slate-100 cursor-pointer"
                            >
                              <GitCompare className="w-3 h-3" /> Compare
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onOpenProduct(item);
                                onClose();
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-violet-700 border border-violet-200 bg-white rounded hover:bg-violet-50 cursor-pointer"
                            >
                              <span>Enter / Edit Prices</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {msg.followUpPrompts && msg.followUpPrompts.length > 0 && !msg.error && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {msg.followUpPrompts.map((followUp) => (
                      <button
                        key={followUp}
                        type="button"
                        onClick={() => onSendQuery(followUp)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:border-violet-400 hover:text-violet-700 text-slate-700 cursor-pointer"
                      >
                        {followUp}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-xl px-4 py-3 w-fit">
              <Loader2 className="w-4 h-4 animate-spin text-violet-700" />
              <span>Preparing marketplace search links & price analysis...</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask e.g. Search headphones under ₹3000"
              aria-label="Ask the Smart Price Helper"
              className="flex-1 px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-700"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              aria-label="Send question"
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-violet-700 text-white rounded-lg hover:from-blue-700 hover:to-violet-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer min-h-[42px] flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
