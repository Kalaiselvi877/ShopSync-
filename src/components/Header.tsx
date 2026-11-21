import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, Menu, Sparkles, User, X } from 'lucide-react';
import type { AuthUser } from '../types';

interface HeaderProps {
  user: AuthUser;
  compareCount: number;
  savedCount: number;
  triggeredAlertCount: number;
  onNavigateSection: (sectionId: string) => void;
  onOpenSaved: () => void;
  onOpenIntegrations: () => void;
  onOpenAssistant: () => void;
  onLogout: () => void;
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function Header({
  user,
  compareCount,
  savedCount,
  triggeredAlertCount,
  onNavigateSection,
  onOpenSaved,
  onOpenIntegrations,
  onOpenAssistant,
  onLogout,
}: HeaderProps) {
  const totalSavedBadge = savedCount + triggeredAlertCount;
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const firstName = user.fullName.trim().split(/\s+/)[0] || user.fullName;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 lg:gap-8">
        {/* Zone 1: Single-line brand wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onNavigateSection('top');
          }}
          className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700 rounded"
        >
          ShopSync
        </a>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => onNavigateSection('dashboard')}
            className="hover:text-blue-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer"
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('catalog')}
            className="hover:text-blue-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer"
          >
            Catalog
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('compare-matrix')}
            className="hover:text-blue-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer"
          >
            Compare{compareCount > 0 ? ` (${compareCount})` : ''}
          </button>
          <button
            type="button"
            onClick={onOpenSaved}
            className="hover:text-blue-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer"
          >
            Saved{totalSavedBadge > 0 ? ` (${totalSavedBadge})` : ''}
          </button>
          <button
            type="button"
            onClick={onOpenIntegrations}
            className="hover:text-blue-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer"
          >
            Data Sources
          </button>
        </nav>

        {/* Zone 3: Price Helper + User Profile & Logout */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenAssistant}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-700 hover:from-blue-700 hover:to-violet-800 rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[40px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700 focus-visible:ring-offset-2"
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Price Helper</span>
          </button>

          {/* User Profile Section */}
          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => setIsProfileOpen((v) => !v)}
              aria-expanded={isProfileOpen}
              aria-label="User profile and logout menu"
              className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition-colors min-h-[40px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700"
            >
              <span className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-600 to-violet-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {getInitials(user.fullName)}
              </span>
              <span className="hidden lg:inline text-xs font-semibold text-slate-800 max-w-[120px] truncate">
                {firstName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 truncate">
                    <User className="w-3.5 h-3.5 text-violet-700 shrink-0" />
                    <span className="truncate">{user.fullName}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5 pl-5">
                    {user.email}
                  </div>
                </div>
                <div className="p-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((v) => !v)}
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 min-h-[40px] min-w-[40px] cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Responsive Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
          <div className="px-3 py-2 mb-2 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-xs font-bold text-slate-900 truncate">{user.fullName}</div>
            <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsMobileMenuOpen(false);
              onNavigateSection('dashboard');
            }}
            className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => {
              setIsMobileMenuOpen(false);
              onNavigateSection('catalog');
            }}
            className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            Catalog
          </button>
          <button
            type="button"
            onClick={() => {
              setIsMobileMenuOpen(false);
              onNavigateSection('compare-matrix');
            }}
            className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            Compare{compareCount > 0 ? ` (${compareCount})` : ''}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsMobileMenuOpen(false);
              onOpenSaved();
            }}
            className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            Saved{totalSavedBadge > 0 ? ` (${totalSavedBadge})` : ''}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsMobileMenuOpen(false);
              onOpenIntegrations();
            }}
            className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            Data Sources
          </button>
          <button
            type="button"
            onClick={() => {
              setIsMobileMenuOpen(false);
              onLogout();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </header>
  );
}

