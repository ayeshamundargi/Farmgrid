import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Tractor,
  ShieldCheck,
  Zap,
  CloudRain,
  Clock,
  Compass,
  WifiOff,
  ArrowRight,
  Layers,
  ChevronRight,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function LandingPage() {
  const { user, quickDemoLogin } = useAuth();
  const navigate = useNavigate();

  const handleDemoStart = async (role) => {
    await quickDemoLogin(role);
    if (role === 'farmer') navigate('/farmer/dashboard');
    else if (role === 'owner') navigate('/owner/dashboard');
    else if (role === 'admin') navigate('/admin/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-agri-950 via-agri-900 to-slate-900 text-white pt-24 pb-28 px-4 sm:px-6 lg:px-8">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-agri-800/80 border border-agri-700/60 text-xs font-semibold text-agri-300 backdrop-blur-xs">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Autonomous Agricultural Resource Coordination Under Scarcity</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
            Coordinate Agricultural Resources.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-agri-300 to-amber-300">
              When Every Hour Matters.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
            FarmGrid intelligently allocates scarce agricultural resources using transparent priority scoring, time windows, distance logistics, and dynamic reallocation when equipment breaks or storms approach.
          </p>

          {/* Call to Actions */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register"
              className="px-6 py-3.5 rounded-xl bg-agri-500 hover:bg-agri-600 text-white font-bold text-sm shadow-lg shadow-agri-900/40 transition flex items-center gap-2"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={() => handleDemoStart('admin')}
              className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/20 transition flex items-center gap-2 backdrop-blur-xs"
            >
              Launch Live Demo (Admin)
              <ChevronRight className="w-4 h-4 text-agri-400" />
            </button>
          </div>

          {/* Instant 1-Click Role Login Bar */}
          <div className="pt-8 border-t border-white/10 max-w-xl mx-auto">
            <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-3">
              One-Click Judge & Evaluator Profiles
            </div>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleDemoStart('farmer')}
                className="p-2.5 rounded-lg bg-white/5 hover:bg-emerald-900/40 border border-white/10 text-xs font-medium transition text-left"
              >
                <span className="text-base">👨‍🌾</span> <span className="font-bold">Farmer</span>
                <span className="block text-[10px] text-slate-400">Request & Priority</span>
              </button>
              <button
                onClick={() => handleDemoStart('owner')}
                className="p-2.5 rounded-lg bg-white/5 hover:bg-emerald-900/40 border border-white/10 text-xs font-medium transition text-left"
              >
                <span className="text-base">🚜</span> <span className="font-bold">Owner</span>
                <span className="block text-[10px] text-slate-400">Fleet & Breakdowns</span>
              </button>
              <button
                onClick={() => handleDemoStart('admin')}
                className="p-2.5 rounded-lg bg-white/5 hover:bg-emerald-900/40 border border-white/10 text-xs font-medium transition text-left"
              >
                <span className="text-base">👑</span> <span className="font-bold">Admin</span>
                <span className="block text-[10px] text-slate-400">Timeline & Reallocation</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Core Scarcity Pillars */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-wider text-agri-600 mb-2">
            Beyond Simple Rental Marketplaces
          </h2>
          <h3 className="text-3xl font-extrabold text-slate-900">
            Engineered For Severe Resource Scarcity
          </h3>
          <p className="text-sm text-slate-600 mt-3">
            In peak harvest, five farmers need the same combine harvester at the exact same hour. FarmGrid solves this mathematically.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Transparent 0–100 Priority Engine</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Deterministic, non-black-box weighting across 6 factors: Urgency (25), Weather Risk (25), Crop Stage (20), Wait Time (15), Transit Distance (10), and Constraints (5). Every allocation is fully explained.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Clock className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Logistics Buffer & Conflict Detection</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Calculates Haversine road transit and mandatory buffer margins. Zero double bookings permitted; candidate slots conflicting with existing reservations are immediately diverted to viable alternatives.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold">
              <Zap className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Dynamic Disruption Reallocation</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              When a tractor breaks down or a rain squall hits, the system cascades affected bookings to alternative equipment or prioritizes them in the waitlist, broadcasting instant updates via Socket.IO.
            </p>
          </div>
        </div>
      </section>

      {/* Offline First Section */}
      <section className="py-16 bg-slate-100 border-y border-slate-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
            <WifiOff className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-xl font-bold text-slate-900">
              Offline-First Staging for Remote Fields
            </h4>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Rural farms often have zero cellular connectivity. FarmGrid stages requests directly inside the browser using IndexedDB. The moment connection is restored, the queue auto-synchronizes with the allocation engine.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-white border-t border-slate-200 text-center text-xs text-slate-500">
        FarmGrid — 16-Hour Hackathon Agricultural Resource Coordination System
      </footer>
    </div>
  );
}
