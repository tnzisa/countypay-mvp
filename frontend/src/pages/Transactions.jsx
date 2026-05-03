// src/pages/Transactions.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const STATUS_STYLES = {
  completed: { dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  pending:   { dot: 'bg-amber-500',   pill: 'bg-amber-50 text-amber-700 ring-amber-200' },
  failed:    { dot: 'bg-red-500',     pill: 'bg-red-50 text-red-700 ring-red-200' },
};

const PAGE_SIZE = 10;

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/payments/my-transactions')
      .then(res => {
        const txs = res.data.transactions || res.data || [];
        setTransactions(txs);
        setFiltered(txs);
      })
      .catch(() => setError('Failed to load transactions.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const result = filterStatus === 'all'
      ? transactions
      : transactions.filter(t => t.status === filterStatus);
    setFiltered(result);
    setPage(1);
  }, [filterStatus, transactions]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const getCountyName = (tx) =>
    tx.county?.name || tx.fee?.county?.name || '-';

  const downloadReceipt = (tx) => {
    const content = `
COUNTYPAY RECEIPT
=================
Date:      ${new Date(tx.createdAt).toLocaleString()}
Reference: ${tx.reference || tx.id}
County:    ${getCountyName(tx)}
Fee:       ${tx.fee?.name || '-'}
Amount:    KES ${tx.amount?.toLocaleString() || '-'}
Method:    ${tx.paymentMethod || '-'}
Status:    ${tx.status}
${tx.blockchainTxHash ? `\nBlockchain TX: ${tx.blockchainTxHash}` : ''}
    `.trim();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${tx.reference || tx.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex items-center gap-3 text-slate-500">
        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        Loading transactions…
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

        <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Transactions</h1>
            <p className="text-sm text-slate-500 mt-1">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => navigate('/counties')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New payment
          </button>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {['all', 'completed', 'pending', 'failed'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                filterStatus === s
                  ? 'bg-slate-900 text-white'
                  : 'bg-white ring-1 ring-slate-200 text-slate-600 hover:ring-slate-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}

        {paginated.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center ring-1 ring-slate-200/70">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <p className="text-slate-700 font-medium">No transactions yet</p>
            <p className="text-sm text-slate-500 mt-1">Your payments will show up here.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl ring-1 ring-slate-200/70 divide-y divide-slate-100 overflow-hidden">
            {paginated.map(tx => {
              const styles = STATUS_STYLES[tx.status] || { dot: 'bg-slate-400', pill: 'bg-slate-100 text-slate-600 ring-slate-200' };
              return (
                <div key={tx.id} className="p-5 flex justify-between items-start gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex gap-4 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                      <span className={`w-2.5 h-2.5 rounded-full ${styles.dot}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold text-slate-900 text-sm">{tx.fee?.name || 'Payment'}</p>
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ring-1 ${styles.pill}`}>
                          {tx.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">{getCountyName(tx)}</p>
                      <p className="text-xs text-slate-400 mt-1.5">
                        {new Date(tx.createdAt).toLocaleDateString()} · {tx.paymentMethod} · <span className="font-mono">{tx.reference || tx.id?.slice(0, 8)}</span>
                      </p>
                      {tx.blockchainTxHash && (
                        <p className="text-xs text-emerald-700 mt-1.5 inline-flex items-center gap-1 font-medium">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                          Blockchain verified
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-slate-900">KES {tx.amount?.toLocaleString()}</p>
                    {tx.status === 'completed' && (
                      <button
                        onClick={() => downloadReceipt(tx)}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 mt-1.5 inline-flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Receipt
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3.5 py-2 rounded-lg bg-white ring-1 ring-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">← Prev</button>
            <span className="px-3 py-1 text-sm font-medium text-slate-600">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3.5 py-2 rounded-lg bg-white ring-1 ring-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
