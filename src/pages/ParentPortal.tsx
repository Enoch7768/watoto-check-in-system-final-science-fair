import React, { useState, useEffect } from 'react';
import { LogIn, User, Clock, Calendar, LogOut, ChevronRight, ShieldCheck, Users, Code2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDevContext } from '../context/DevContext';

interface Child {
  id: number;
  first_name: string;
  last_name: string;
  class_name: string;
}

interface AttendanceRecord {
  id: number;
  first_name: string;
  last_name: string;
  date: string;
  check_in_time: string;
  check_out_time: string | null;
  signed_out_by_name: string | null;
  status: string;
}

export default function ParentPortal() {
  const { devModeEnabled } = useDevContext();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [parent, setParent] = useState<any>(null);
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<{ children: Child[], attendance: AttendanceRecord[] } | null>(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  useEffect(() => {
    const savedParent = localStorage.getItem('parent_user');
    if (savedParent) {
      const p = JSON.parse(savedParent);
      setParent(p);
      setIsLoggedIn(true);
      fetchDashboard(p.id);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !parent) return;

    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      let wsUrl = '';
      if (API_BASE) {
        const url = new URL(API_BASE);
        wsUrl = `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}`;
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}`;
      }
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ATTENDANCE_UPDATED') {
            fetchDashboard(parent.id);
          }
        } catch (e) {
          console.error('Failed to parse WS message', e);
        }
      };

      ws.onclose = () => {
        // Attempt to reconnect after 3 seconds
        reconnectTimeout = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null; // Prevent reconnect on intentional unmount
        ws.close();
      }
    };
  }, [isLoggedIn, parent]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/parents-data/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('parent_user', JSON.stringify(data.parent));
        setParent(data.parent);
        setIsLoggedIn(true);
        fetchDashboard(data.parent.id);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboard = async (parentId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/parents-data/dashboard/${parentId}`);
      const data = await res.json();
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to fetch dashboard', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('parent_user');
    setIsLoggedIn(false);
    setParent(null);
    setDashboardData(null);
  };

  const handleDevBypass = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch the first parent to impersonate
      const res = await fetch(`${API_BASE}/api/parents`);
      const parents = await res.json();
      if (parents && parents.length > 0) {
        const p = parents[0];
        localStorage.setItem('parent_user', JSON.stringify(p));
        setParent(p);
        setIsLoggedIn(true);
        fetchDashboard(p.id);
      } else {
        setError('No parents exist in the database to bypass login.');
      }
    } catch (err) {
      setError('Dev bypass failed. Ensure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-slate-200 dark:border-zinc-800 shadow-xl"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-50">Parent Portal</h1>
            <p className="text-slate-500 dark:text-zinc-400 mt-2">Secure access to your children's attendance</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-2">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. 555-0101"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-zinc-100 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-2">Security PIN</label>
              <input
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="••••"
                maxLength={4}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-zinc-100 transition-all tracking-widest"
                required
              />
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm text-center"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
            >
              {loading ? 'Authenticating...' : (
                <>
                  <LogIn className="w-5 h-5" />
                  Access Portal
                </>
              )}
            </button>

            {devModeEnabled && (
              <button
                type="button"
                onClick={handleDevBypass}
                disabled={loading}
                className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-zinc-900/20 flex items-center justify-center gap-2 mt-4"
              >
                <Code2 className="w-5 h-5" />
                Supreme Dev Bypass
              </button>
            )}
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center">
            <User className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-50">Welcome, {parent.first_name}!</h1>
            <p className="text-slate-500 dark:text-zinc-400">Parent Dashboard</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 text-slate-600 dark:text-zinc-300 font-medium rounded-xl transition-all"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Children List */}
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            Your Children
          </h2>
          <div className="space-y-4">
            {dashboardData?.children.map(child => (
              <motion.div 
                key={child.id}
                whileHover={{ x: 5 }}
                className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm group cursor-default"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-zinc-100">{child.first_name} {child.last_name}</h3>
                    <p className="text-sm text-slate-500 dark:text-zinc-400">{child.class_name}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </div>
              </motion.div>
            ))}
            {dashboardData?.children.length === 0 && (
              <div className="p-8 text-center bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-zinc-700">
                <p className="text-slate-500">No children assigned to your account.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Attendance */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-500" />
            Recent Activity
          </h2>
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Child</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Check-in</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Check-out</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Signed Out By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {dashboardData?.attendance.map(record => (
                    <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-5 font-bold text-slate-900 dark:text-zinc-100">{record.first_name}</td>
                      <td className="px-6 py-5 text-slate-600 dark:text-zinc-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 opacity-40" />
                          {record.date}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          record.status === 'Present' 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                          {new Date(record.check_in_time + 'Z').toLocaleTimeString('en-US', { timeZone: 'Africa/Nairobi', hour: 'numeric', minute: '2-digit', hour12: true })}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        {record.check_out_time ? (
                          <span className="px-3 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-full text-xs font-bold">
                            {new Date(record.check_out_time + 'Z').toLocaleTimeString('en-US', { timeZone: 'Africa/Nairobi', hour: 'numeric', minute: '2-digit', hour12: true })}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Still in school</span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                          {record.signed_out_by_name || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {dashboardData?.attendance.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                        No attendance records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
