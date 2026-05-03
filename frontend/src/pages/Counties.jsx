// src/pages/Counties.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

export default function Counties() {
  const [counties, setCounties] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/counties')
      .then(res => setCounties(res.data.counties))
      .catch(() => setError('Failed to load counties.'))
      .finally(() => setLoading(false));
  }, []);

  const handleCountySelect = (county) => {
    setSelected(county.id);
    const seen = new Set();
    const uniqueFees = county.fees.filter(f => {
      if (seen.has(f.name)) return false;
      seen.add(f.name);
      return true;
    });
    sessionStorage.setItem('selectedCounty', JSON.stringify({ ...county, fees: uniqueFees }));
    navigate('/payment');
  };

  const filtered = counties.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex items-center gap-3 text-slate-500">
        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        Loading counties…
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto py-10 px-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Dashboard
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Select your county</h1>
          <p className="text-slate-500 mt-1.5">Choose the county you want to pay fees to.</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search counties…"
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
          />
        </div>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map(county => {
            const feeCount = new Set(county.fees.map(f => f.name)).size;
            return (
              <button
                key={county.id}
                onClick={() => handleCountySelect(county)}
                className={`group text-left p-5 rounded-2xl bg-white ring-1 transition-all hover:shadow-lg hover:shadow-slate-200/60 hover:-translate-y-0.5 ${
                  selected === county.id ? 'ring-2 ring-emerald-500' : 'ring-slate-200/70 hover:ring-emerald-300'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-sm flex items-center justify-center">
                    {county.code}
                  </div>
                  <svg className="w-5 h-5 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <p className="font-semibold text-slate-900 text-base">{county.name}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {feeCount} fee {feeCount === 1 ? 'type' : 'types'} available
                </p>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 && !loading && (
          <div className="text-center py-16 text-slate-400 text-sm">No counties match "{search}".</div>
        )}
      </div>
    </div>
  );
}
