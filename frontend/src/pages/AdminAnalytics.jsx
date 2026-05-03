// src/pages/AdminAnalytics.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

export default function AdminAnalytics() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/payments/admin/all')
      .then(res => setTransactions(res.data.transactions || res.data || []))
      .catch(() => setError('Failed to load transactions.'))
      .finally(() => setLoading(false));
  }, []);

  const completed = transactions.filter(t => t.status === 'completed');
  const pending   = transactions.filter(t => t.status === 'pending');
  const failed    = transactions.filter(t => t.status === 'failed');
  const totalRevenue = completed.reduce((sum, t) => sum + (t.amount || 0), 0);
  const successRate = transactions.length
    ? Math.round((completed.length / transactions.length) * 100)
    : 0;

  const byCounty = completed.reduce((acc, t) => {
    const name = t.county?.name || t.fee?.county?.name || 'Unknown';
    acc[name] = (acc[name] || 0) + (t.amount || 0);
    return acc;
  }, {});
  const countyRevenue = Object.entries(byCounty).sort((a, b) => b[1] - a[1]);
  const maxCountyRevenue = countyRevenue[0]?.[1] || 1;

  const byFee = completed.reduce((acc, t) => {
    const name = t.fee?.name || 'Unknown';
    acc[name] = (acc[name] || 0) + (t.amount || 0);
    return acc;
  }, {});
  const feeRevenue = Object.entries(byFee).sort((a, b) => b[1] - a[1]);

  const filtered = filterStatus === 'all'
    ? transactions
    : transactions.filter(t => t.status === filterStatus);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const STATUS_PILL = {
    completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    pending:   'bg-amber-50 text-amber-700 ring-amber-200',
    failed:    'bg-red-50 text-red-700 ring-red-200',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto py-10 px-4">

        {/* Header */}
        <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
          <div>
            <button onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-2 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Dashboard
            </button>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Analytics</h1>
            <p className="text-sm text-slate-500 mt-1">Revenue and transaction overview</p>
          </div>
          <button
            onClick={() => navigate('/admin/counties')}
            className="px-4 py-2.5 bg-white ring-1 ring-slate-200 text-sm font-medium text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Manage counties →
          </button>
        </div>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        {loading ? (
          <p className="text-slate-400 text-center py-20">Loading analytics…</p>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total revenue', value: `KES ${totalRevenue.toLocaleString()}`, accent: 'text-emerald-700', bar: 'bg-emerald-500' },
                { label: 'Transactions',  value: transactions.length, accent: 'text-slate-900', bar: 'bg-slate-700' },
                { label: 'Success rate',  value: `${successRate}%`, accent: 'text-emerald-700', bar: 'bg-emerald-400' },
                { label: 'Pending',       value: pending.length, accent: 'text-amber-600', bar: 'bg-amber-400' },
              ].map(card => (
                <div key={card.label} className="bg-white rounded-2xl ring-1 ring-slate-200/70 p-5 relative overflow-hidden">
                  <div className={`absolute top-0 left-0 right-0 h-1 ${card.bar}`} />
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{card.label}</p>
                  <p className={`text-2xl font-bold tracking-tight ${card.accent}`}>{card.value}</p>
                </div>
              ))}
            </div>

            {/* Status breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Completed', count: completed.length, dot: 'bg-emerald-500' },
                { label: 'Pending',   count: pending.length,   dot: 'bg-amber-500' },
                { label: 'Failed',    count: failed.length,    dot: 'bg-red-500' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl ring-1 ring-slate-200/70 p-5 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl ${s.dot}/10 flex items-center justify-center`} style={{ backgroundColor: 'transparent' }}>
                    <span className={`w-3 h-3 rounded-full ${s.dot}`} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{s.label}</p>
                    <p className="text-xl font-bold text-slate-900">{s.count}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Revenue by County */}
            {countyRevenue.length > 0 && (
              <div className="bg-white rounded-2xl ring-1 ring-slate-200/70 p-6 mb-6">
                <h2 className="text-base font-semibold text-slate-900 mb-5">Revenue by county</h2>
                <div className="space-y-4">
                  {countyRevenue.map(([name, amount]) => (
                    <div key={name}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-slate-700">{name}</span>
                        <span className="font-semibold text-slate-900">KES {amount.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all"
                          style={{ width: `${(amount / maxCountyRevenue) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Revenue by Fee Type */}
            {feeRevenue.length > 0 && (
              <div className="bg-white rounded-2xl ring-1 ring-slate-200/70 p-6 mb-6">
                <h2 className="text-base font-semibold text-slate-900 mb-4">Revenue by fee type</h2>
                <div className="divide-y divide-slate-100">
                  {feeRevenue.map(([name, amount]) => (
                    <div key={name} className="flex justify-between text-sm py-3">
                      <span className="text-slate-700">{name}</span>
                      <span className="font-semibold text-slate-900">KES {amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Transactions */}
            <div className="bg-white rounded-2xl ring-1 ring-slate-200/70 p-6">
              <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
                <h2 className="text-base font-semibold text-slate-900">All transactions</h2>
                <div className="flex gap-2 overflow-x-auto">
                  {['all', 'completed', 'pending', 'failed'].map(s => (
                    <button
                      key={s}
                      onClick={() => { setFilterStatus(s); setPage(1); }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                        filterStatus === s
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {paginated.map(tx => (
                  <div key={tx.id} className="flex justify-between items-center py-3 gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-slate-900">{tx.fee?.name || 'Payment'}</p>
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ring-1 ${STATUS_PILL[tx.status] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
                          {tx.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {tx.county?.name || tx.fee?.county?.name || '-'} · {tx.user?.name || tx.user?.phone || '-'} · {new Date(tx.createdAt).toLocaleDateString()} · {tx.paymentMethod}
                      </p>
                    </div>
                    <span className="font-semibold text-slate-900 text-sm whitespace-nowrap">KES {tx.amount?.toLocaleString()}</span>
                  </div>
                ))}
                {paginated.length === 0 && (
                  <p className="text-slate-400 text-sm text-center py-8">No transactions found.</p>
                )}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-5">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3.5 py-2 rounded-lg ring-1 ring-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-all">← Prev</button>
                  <span className="px-3 py-1 text-sm font-medium text-slate-600">{page} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-3.5 py-2 rounded-lg ring-1 ring-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-all">Next →</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}