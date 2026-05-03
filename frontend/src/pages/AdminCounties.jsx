// src/pages/AdminCounties.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

export default function AdminCounties() {
  const [counties, setCounties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCountyForm, setShowCountyForm] = useState(false);
  const [countyName, setCountyName] = useState('');
  const [countyCode, setCountyCode] = useState('');
  const [saving, setSaving] = useState(false);

  const [activeFeeCounty, setActiveFeeCounty] = useState(null);
  const [feeName, setFeeName] = useState('');
  const [feeDesc, setFeeDesc] = useState('');
  const [feeAmount, setFeeAmount] = useState('');
  const [savingFee, setSavingFee] = useState(false);

  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    api.get('/counties')
      .then(res => setCounties(res.data.counties))
      .catch(() => setError('Failed to load counties.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAddCounty = async () => {
    if (!countyName || !countyCode) return setError('Name and code are required.');
    setSaving(true);
    setError('');
    try {
      await api.post('/counties', { name: countyName, code: countyCode.toUpperCase() });
      setCountyName('');
      setCountyCode('');
      setShowCountyForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create county.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddFee = async () => {
    if (!feeName || !feeAmount) return setError('Fee name and amount are required.');
    setSavingFee(true);
    setError('');
    try {
      await api.post(`/counties/${activeFeeCounty}/fees`, {
        name: feeName,
        description: feeDesc,
        amount: parseFloat(feeAmount),
      });
      setFeeName('');
      setFeeDesc('');
      setFeeAmount('');
      setActiveFeeCounty(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add fee.');
    } finally {
      setSavingFee(false);
    }
  };

  const uniqueFees = (fees) => {
    const seen = new Set();
    return fees.filter(f => { if (seen.has(f.name)) return false; seen.add(f.name); return true; });
  };

  const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-all";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto py-10 px-4">

        {/* Header */}
        <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
          <div>
            <button onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-2 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Dashboard
            </button>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">County management</h1>
            <p className="text-sm text-slate-500 mt-1">{counties.length} counties configured</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/admin/analytics')}
              className="px-4 py-2.5 bg-white ring-1 ring-slate-200 text-sm font-medium text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Analytics →
            </button>
            <button
              onClick={() => { setShowCountyForm(!showCountyForm); setError(''); }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add county
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Add County Form */}
        {showCountyForm && (
          <div className="bg-white rounded-2xl ring-1 ring-emerald-200 p-6 mb-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-4">New county</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">County name</label>
                <input
                  type="text"
                  placeholder="e.g. Nairobi County"
                  value={countyName}
                  onChange={e => setCountyName(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">Code</label>
                <input
                  type="text"
                  placeholder="NRB"
                  value={countyCode}
                  onChange={e => setCountyCode(e.target.value)}
                  maxLength={5}
                  className={`${inputCls} font-mono uppercase`}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddCounty}
                disabled={saving}
                className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-60 shadow-md shadow-emerald-600/20 transition-all"
              >
                {saving ? 'Saving…' : 'Save county'}
              </button>
              <button
                onClick={() => { setShowCountyForm(false); setError(''); }}
                className="px-5 py-2.5 ring-1 ring-slate-200 bg-white text-sm font-medium text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Counties List */}
        {loading ? (
          <p className="text-slate-400 text-center py-12">Loading…</p>
        ) : (
          <div className="space-y-4">
            {counties.map(county => (
              <div key={county.id} className="bg-white rounded-2xl ring-1 ring-slate-200/70 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center">
                      {county.code}
                    </div>
                    <div>
                      <h2 className="font-semibold text-slate-900">{county.name}</h2>
                      <p className="text-xs text-slate-500">{uniqueFees(county.fees).length} fee types</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setActiveFeeCounty(activeFeeCounty === county.id ? null : county.id); setError(''); }}
                    className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Add fee
                  </button>
                </div>

                {/* Fee list */}
                <div className="divide-y divide-slate-100 border-t border-slate-100">
                  {uniqueFees(county.fees).map(fee => (
                    <div key={fee.id} className="flex justify-between items-center py-3 gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{fee.name}</p>
                        {fee.description && <p className="text-xs text-slate-500 mt-0.5">{fee.description}</p>}
                      </div>
                      <span className="font-semibold text-slate-900 text-sm whitespace-nowrap">KES {fee.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  {county.fees.length === 0 && (
                    <p className="text-xs text-slate-400 py-3">No fees configured yet.</p>
                  )}
                </div>

                {/* Add Fee Form */}
                {activeFeeCounty === county.id && (
                  <div className="mt-5 pt-5 border-t border-slate-100">
                    <p className="text-sm font-semibold text-slate-900 mb-3">New fee for {county.name}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Fee name"
                        value={feeName}
                        onChange={e => setFeeName(e.target.value)}
                        className={inputCls}
                      />
                      <input
                        type="number"
                        placeholder="Amount (KES)"
                        value={feeAmount}
                        onChange={e => setFeeAmount(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Description (optional)"
                      value={feeDesc}
                      onChange={e => setFeeDesc(e.target.value)}
                      className={`${inputCls} mb-3`}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddFee}
                        disabled={savingFee}
                        className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-60 shadow-md shadow-emerald-600/20 transition-all"
                      >
                        {savingFee ? 'Saving…' : 'Add fee'}
                      </button>
                      <button
                        onClick={() => setActiveFeeCounty(null)}
                        className="px-5 py-2.5 ring-1 ring-slate-200 bg-white text-sm font-medium text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
