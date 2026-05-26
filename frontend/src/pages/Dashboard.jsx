import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout, fetchUser } = useAuthStore();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center shadow-md shadow-emerald-600/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">CountyPay</h1>
              <p className="text-[10px] text-slate-400 -mt-0.5 uppercase tracking-wider">Blockchain payments</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome / account card */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-7 shadow-xl shadow-emerald-600/20 mb-8 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-16 -left-10 w-48 h-48 bg-emerald-400/20 rounded-full blur-2xl" />
          <div className="relative">
            <p className="text-emerald-100 text-sm font-medium">Welcome back</p>
            <h2 className="text-3xl font-bold text-white tracking-tight mt-1">{user?.name}</h2>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-emerald-200 uppercase tracking-wider mb-1">Phone</p>
                <p className="text-sm font-medium text-white">{user?.phone}</p>
              </div>
              {user?.email && (
                <div>
                  <p className="text-xs text-emerald-200 uppercase tracking-wider mb-1">Email</p>
                  <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-emerald-200 uppercase tracking-wider mb-1">Account</p>
                <span className="inline-flex items-center gap-1.5 capitalize px-2.5 py-0.5 bg-white/20 text-white rounded-full text-xs font-semibold backdrop-blur">
                  <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full" />
                  {user?.role}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Quick actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Make Payment */}
            <Link
              to="/counties"
              className="group bg-white rounded-2xl p-6 ring-1 ring-slate-200/70 hover:ring-emerald-500 hover:shadow-lg hover:shadow-emerald-600/5 transition-all"
            >
              <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-600 transition-colors">
                <svg className="w-5 h-5 text-emerald-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h4 className="text-base font-semibold text-slate-900 mb-1">Make a payment</h4>
              <p className="text-sm text-slate-500">Pay county fees quickly and securely</p>
              <p className="mt-4 text-xs font-semibold text-emerald-700 inline-flex items-center gap-1">
                Pay now
                <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </p>
            </Link>

            {/* Transactions */}
            <Link
              to="/transactions"
              className="group bg-white rounded-2xl p-6 ring-1 ring-slate-200/70 hover:ring-slate-900 hover:shadow-lg transition-all"
            >
              <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-slate-900 transition-colors">
                <svg className="w-5 h-5 text-slate-700 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h4 className="text-base font-semibold text-slate-900 mb-1">Transaction history</h4>
              <p className="text-sm text-slate-500">View past payments and download receipts</p>
              <p className="mt-4 text-xs font-semibold text-slate-700 inline-flex items-center gap-1">
                View history
                <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </p>
            </Link>

            {/* Admin */}
            {user?.role === 'admin' && (
              <Link
                to="/admin/counties"
                className="group bg-slate-900 text-white rounded-2xl p-6 ring-1 ring-slate-900 hover:bg-slate-800 hover:shadow-lg transition-all"
              >
                <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h4 className="text-base font-semibold mb-1">Admin panel</h4>
                <p className="text-sm text-slate-400">Manage counties, fees and analytics</p>
                <p className="mt-4 text-xs font-semibold text-emerald-400 inline-flex items-center gap-1">
                  Open admin
                  <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </p>
              </Link>
            )}
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white rounded-2xl p-7 ring-1 ring-slate-200/70">
          <h3 className="text-base font-semibold text-slate-900 mb-5">How it works</h3>
          <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              ['1', 'Select your county', 'Choose from all 47 supported counties'],
              ['2', 'Pick a fee', 'Land rates, parking, permits, licenses'],
              ['3', 'Pay securely', 'Stripe card or bank transfer — your choice'],
              ['4', 'Get verified receipt', 'Instant blockchain-backed confirmation'],
            ].map(([n, title, desc]) => (
              <li key={n} className="flex gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-sm flex items-center justify-center">{n}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </main>
    </div>
  );
}
