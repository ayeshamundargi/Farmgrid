import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Globe, ChevronDown, Check } from 'lucide-react';

export default function LanguageSwitcher({ variant = 'navbar', className = '' }) {
  const { language, setLanguage, languages } = useLanguage();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (variant === 'pills') {
    return (
      <div className={`inline-flex items-center gap-1.5 p-1 bg-black/20 backdrop-blur-md rounded-xl border border-white/10 ${className}`}>
        <span className="text-[11px] font-semibold text-white/70 pl-2 pr-1 flex items-center gap-1">
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <span>ಭಾಷೆ / Lang:</span>
        </span>
        <div className="flex items-center gap-1">
          {languages.map((l) => {
            const isActive = language === l.code;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => setLanguage(l.code)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all transform active:scale-95 ${
                  isActive
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {l.nativeName}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Default: Navbar dropdown / toggle button
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 transition shadow-2xs"
        title="Change language / ಭಾಷೆಯನ್ನು ಬದಲಾಯಿಸಿ"
      >
        <Globe className="w-3.5 h-3.5 text-agri-600" />
        <span className="hidden sm:inline">
          {language === 'kn' ? 'ಕನ್ನಡ' : 'English'}
        </span>
        <span className="sm:hidden uppercase font-bold text-[11px]">
          {language}
        </span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 animate-fadeIn">
          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            🌐 ಭಾಷೆ / Language
          </div>
          {languages.map((l) => {
            const isSelected = language === l.code;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => {
                  setLanguage(l.code);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between font-medium transition ${
                  isSelected
                    ? 'bg-emerald-50 text-emerald-800 font-bold'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{l.flag}</span>
                  <span>{l.nativeName}</span>
                  <span className="text-[10px] text-slate-400">({l.label})</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
