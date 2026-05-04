// src/pages/Payment.jsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const PAYMENT_METHODS = [
  { id: 'stripe', label: 'Card', icon: '💳', desc: 'Visa or Mastercard' },
  { id: 'bank_transfer', label: 'Bank transfer', icon: '🏦', desc: 'Transfer from your bank' }
];

const MethodIcon = ({ id, className = 'w-5 h-5' }) => {
  if (id === 'bank_transfer') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M5 10V7l7-4 7 4v3M4 10v10h16V10M8 14h8"/></svg>
    );
  }

  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
  );
};

// ── Card form ────────────────────────────────────────────────────────────────
function CardForm({ onSubmit, loading, amount }) {
  const [cardNum, setCardNum] = useState('');
  const [expiry,  setExpiry]  = useState('');
  const [cvv,     setCvv]     = useState('');
  const [name,    setName]    = useState('');

  const fmtCard = v => v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();
  const fmtExp  = v => { const d = v.replace(/\D/g,'').slice(0,4); return d.length > 2 ? d.slice(0,2) + '/' + d.slice(2) : d; };

  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-200/70 p-6 mb-4">
      <h2 className="text-sm font-semibold text-slate-900 mb-4">Card details</h2>

      {/* Live card preview */}
      <div className="rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 p-5 text-white mb-4">
        <p className="text-xs text-slate-400 mb-4 tracking-widest uppercase">Debit / Credit</p>
        <p className="font-mono text-lg tracking-widest mb-5">{cardNum || '•••• •••• •••• ••••'}</p>
        <div className="flex justify-between text-xs text-slate-300">
          <span>{name || 'CARD HOLDER'}</span>
          <span>{expiry || 'MM/YY'}</span>
        </div>
      </div>

      <div className="space-y-3">
        <input type="text" placeholder="Card number" value={cardNum}
          onChange={e => setCardNum(fmtCard(e.target.value))}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all" />

        <input type="text" placeholder="Cardholder name" value={name}
          onChange={e => setName(e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all" />

        <div className="grid grid-cols-2 gap-3">
          <input type="text" placeholder="MM/YY" value={expiry}
            onChange={e => setExpiry(fmtExp(e.target.value))}
            className="border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all" />
          <input type="password" placeholder="CVV" value={cvv} maxLength={4}
            onChange={e => setCvv(e.target.value.replace(/\D/g,''))}
            className="border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all" />
        </div>

        <button
          onClick={() => onSubmit({ cardNum, expiry, cvv, name })}
          disabled={loading}
          className="w-full py-4 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20 transition-all"
        >
          {loading ? 'Processing…' : `Pay KES ${amount?.toLocaleString()}`}
        </button>
      </div>
    </div>
  );
}


// ── Main component ───────────────────────────────────────────────────────────
export default function Payment() {
  const [county, setCounty] = useState(null);
  const [selectedFee, setSelectedFee] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [transaction, setTransaction] = useState(null);
  const [status, setStatus] = useState('');
  const [blockchainInfo, setBlockchainInfo] = useState(null);
  const pollRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    const stored = sessionStorage.getItem('selectedCounty');
    if (!stored) { navigate('/counties'); return; }
    const c = JSON.parse(stored);
    setCounty(c);
    if (c.fees.length > 0) setSelectedFee(c.fees[0]);
  }, [navigate]);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const startPolling = (txId) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/payments/${txId}`);
        const tx = res.data.transaction || res.data;
        setTransaction(tx);
        setStatus(tx.status);
        if (tx.status === 'completed') {
          clearInterval(pollRef.current);
          try {
            const bcRes = await api.get(`/blockchain/transaction/${txId}`);
            setBlockchainInfo(bcRes.data);
          } catch {}
        }
        if (tx.status === 'failed') clearInterval(pollRef.current);
      } catch {}
    }, 3000);
  };

  // Core submit — used by all methods
  const handleSubmit = async () => {
    if (!selectedFee) return setError('Please select a fee.');
    if (!phone) return setError('Please enter your phone number.');

    setError('');
    setLoading(true);
    setStatus('');
    setTransaction(null);
    setBlockchainInfo(null);

    try {
      const body = {
        feeId: selectedFee.id,
        paymentMethod,
        phoneNumber: phone.startsWith('254') ? phone : `254${phone.replace(/^0/, '')}`,
      };
      const res = await api.post('/payments', body);
      const tx = res.data.transaction || res.data;
      setTransaction(tx);
      setStatus(tx.status || 'pending');
      if (tx.status !== 'completed') startPolling(tx.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Payment initiation failed.');
    } finally {
      setLoading(false);
    }
  };

  // Card submit — validates fields then calls core submit
  const handleCardSubmit = ({ cardNum, expiry, cvv, name }) => {
    if (!selectedFee) return setError('Please select a fee.');
    if (!phone) return setError('Please enter your phone number.');
    if (!cardNum || cardNum.replace(/\s/g,'').length < 16) return setError('Please enter a valid 16-digit card number.');
    if (!expiry || expiry.length < 5) return setError('Please enter a valid expiry date.');
    if (!cvv || cvv.length < 3) return setError('Please enter a valid CVV.');
    if (!name) return setError('Please enter the cardholder name.');
    setError('');
    handleSubmit();
  };

  const selectedMethod = PAYMENT_METHODS.find((method) => method.id === paymentMethod);

  const reset = () => {
    clearInterval(pollRef.current);
    setTransaction(null);
    setStatus('');
    setBlockchainInfo(null);
    setError('');
  };

  if (!county) return null;

  // ── Status screen ──────────────────────────────────────────────────────────
  if (status) {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4 flex items-start justify-center">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl shadow-slate-200/60 ring-1 ring-slate-200/70 p-8 text-center">

          {status === 'pending' && (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-5">
                <svg className="w-8 h-8 text-amber-500 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-1.5">Payment in progress</h2>
              <p className="text-sm text-slate-500 mb-5 max-w-sm mx-auto">
                Waiting for payment confirmation…
              </p>
              <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                Checking status…
              </div>
            </>
          )}

          {status === 'completed' && (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-5">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-1.5">Payment successful</h2>
              <p className="text-sm text-slate-500 mb-6">Your payment has been received and recorded.</p>

              {transaction && (
                <div className="bg-slate-50 rounded-xl p-5 text-left text-sm space-y-3 mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Fee</span>
                    <span className="font-medium text-slate-900">{selectedFee?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">County</span>
                    <span className="font-medium text-slate-900">{county.name}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-slate-200">
                    <span className="text-slate-500">Amount paid</span>
                    <span className="font-bold text-slate-900">KES {selectedFee?.amount?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reference</span>
                    <span className="font-mono text-xs text-slate-700">{transaction.reference || transaction.id}</span>
                  </div>
                </div>
              )}

              {blockchainInfo && (
                <div className="bg-emerald-50 border border-emerald-200/70 rounded-xl p-4 text-left text-sm mb-5">
                  <p className="font-semibold text-emerald-900 mb-1.5 flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    Blockchain verified
                  </p>
                  <p className="text-emerald-800 break-all font-mono text-xs">
                    {blockchainInfo.txHash || blockchainInfo.transactionHash || 'Recorded on ledger'}
                  </p>
                  {blockchainInfo.blockNumber && (
                    <p className="text-emerald-700 text-xs mt-1">Block #{blockchainInfo.blockNumber}</p>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => navigate('/transactions')}
                  className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors">
                  View transactions
                </button>
                <button onClick={() => { reset(); navigate('/counties'); }}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors">
                  Pay another
                </button>
              </div>
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-5">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-1.5">Payment failed</h2>
              <p className="text-sm text-slate-500 mb-6">The payment could not be completed. Please try again.</p>
              <button onClick={reset}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors">
                Try again
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Checkout form ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        <button onClick={() => navigate('/counties')}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Counties
        </button>

        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">Make payment</h1>
        <div className="flex items-center gap-2 mb-8">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold">{county.code}</span>
          <p className="text-slate-600 text-sm">{county.name}</p>
        </div>

        {/* Fee selection */}
        <div className="bg-white rounded-2xl ring-1 ring-slate-200/70 p-6 mb-4">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Select fee type</h2>
            <span className="text-xs text-slate-400">{county.fees.length} available</span>
          </div>
          <div className="space-y-2">
            {county.fees.map(fee => {
              const active = selectedFee?.id === fee.id;
              return (
                <label key={fee.id}
                  className={`flex justify-between items-center p-4 rounded-xl border cursor-pointer transition-all ${
                    active ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}>
                  <div className="flex items-center gap-3">
                    <span className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${active ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'}`}>
                      {active && <span className="w-2 h-2 rounded-full bg-white" />}
                    </span>
                    <input type="radio" name="fee" value={fee.id} checked={active} onChange={() => setSelectedFee(fee)} className="sr-only" />
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{fee.name}</p>
                      {fee.description && <p className="text-xs text-slate-500 mt-0.5">{fee.description}</p>}
                    </div>
                  </div>
                  <span className="font-semibold text-slate-900 text-sm whitespace-nowrap">KES {fee.amount.toLocaleString()}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Payment method */}
        <div className="bg-white rounded-2xl ring-1 ring-slate-200/70 p-6 mb-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Payment method</h2>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map(m => {
              const active = paymentMethod === m.id;
              return (
                <button key={m.id} onClick={() => { setPaymentMethod(m.id); setError(''); }}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    active ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}>
                  <div className={`mx-auto mb-2 w-9 h-9 rounded-lg flex items-center justify-center ${active ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <MethodIcon id={m.id} />
                  </div>
                  <p className="font-semibold text-xs text-slate-900">{m.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{m.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Phone — always shown */}
        <div className="bg-white rounded-2xl ring-1 ring-slate-200/70 p-6 mb-4">
          <label className="block text-sm font-semibold text-slate-900 mb-3">Phone number</label>
          <div className="flex">
            <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 text-slate-500 text-sm font-medium">+254</span>
            <input type="tel" placeholder="712 345 678" value={phone} onChange={e => setPhone(e.target.value)}
              className="flex-1 border border-slate-200 rounded-r-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all" />
          </div>
        </div>

        {/* ── Method-specific UI ── */}
        {paymentMethod === 'stripe' && (
          <CardForm onSubmit={handleCardSubmit} loading={loading} amount={selectedFee?.amount} />
        )}

        {paymentMethod === 'bank_transfer' && (
          <div className="bg-white rounded-2xl ring-1 ring-slate-200/70 p-6 mb-4">
            <h2 className="text-sm font-semibold text-slate-900 mb-2">Bank transfer details</h2>
            <p className="text-xs text-slate-500 mb-4">
              Transfer from your bank, then confirm to record the payment.
            </p>
            <button onClick={handleSubmit} disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-sm">
              {loading ? 'Processing…' : `Confirm transfer for KES ${selectedFee?.amount?.toLocaleString() || ''}`}
            </button>
          </div>
        )}

        {/* Summary */}
        {selectedFee && (
          <div className="bg-slate-900 text-white rounded-2xl p-6 mb-4">
            <p className="text-xs uppercase tracking-wider text-slate-400 mb-4">Summary</p>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">Fee</span>
              <span className="font-medium">{selectedFee.name}</span>
            </div>
            <div className="flex justify-between text-sm mb-4">
              <span className="text-slate-400">Method</span>
              <span className="font-medium">{selectedMethod?.label || paymentMethod}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t border-slate-700 pt-4">
              <span>Total</span>
              <span>KES {selectedFee.amount.toLocaleString()}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}


        <p className="text-xs text-slate-400 text-center mt-4 inline-flex items-center gap-1.5 w-full justify-center">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          Secured with bank-grade encryption
        </p>
      </div>
    </div>
  );
}