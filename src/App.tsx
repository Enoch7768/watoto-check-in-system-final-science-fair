import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Terminal from './pages/Terminal';
import Admin from './pages/Admin';
import Analytics from './pages/Analytics';
import DevPortal from './pages/DevPortal';
import { Lock, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('terminal');
  
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken') || '');
  const [analyticsToken, setAnalyticsToken] = useState(localStorage.getItem('analyticsToken') || '');
  
  const [showAuthModal, setShowAuthModal] = useState<{show: boolean, tab: string}>({show: false, tab: ''});
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    localStorage.setItem('adminToken', adminToken);
  }, [adminToken]);

  useEffect(() => {
    localStorage.setItem('analyticsToken', analyticsToken);
  }, [analyticsToken]);

  const handleTabChange = async (tab: string) => {
    if (tab === 'admin' || tab === 'analytics') {
      const token = tab === 'admin' ? adminToken : analyticsToken;
      
      // Verify existing token or check if password is required
      try {
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: tab, password: token })
        });
        
        if (res.ok) {
          setActiveTab(tab);
        } else {
          setShowAuthModal({ show: true, tab });
        }
      } catch (err) {
        setShowAuthModal({ show: true, tab });
      }
    } else {
      setActiveTab(tab);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: showAuthModal.tab, password: authPassword })
      });
      
      if (res.ok) {
        if (showAuthModal.tab === 'admin') setAdminToken(authPassword);
        if (showAuthModal.tab === 'analytics') setAnalyticsToken(authPassword);
        
        setActiveTab(showAuthModal.tab);
        setShowAuthModal({ show: false, tab: '' });
        setAuthPassword('');
      } else {
        setAuthError('Incorrect password');
      }
    } catch (err) {
      setAuthError('Verification failed');
    }
  };

  return (
    <>
      <Layout activeTab={activeTab} onTabChange={handleTabChange}>
        {activeTab === 'terminal' && <Terminal />}
        {activeTab === 'admin' && <Admin adminToken={adminToken} />}
        {activeTab === 'analytics' && <Analytics analyticsToken={analyticsToken} />}
        {activeTab === 'dev' && (
          <DevPortal />
        )}
      </Layout>

      {showAuthModal.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-zinc-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-zinc-100">
                <Lock className="w-5 h-5 text-indigo-500" />
                Authentication Required
              </h2>
              <button 
                onClick={() => {
                  setShowAuthModal({ show: false, tab: '' });
                  setAuthPassword('');
                  setAuthError('');
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-zinc-300">
                  {showAuthModal.tab === 'admin' ? 'Admin' : 'Analytics'} Password
                </label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-zinc-100"
                  placeholder="Enter password"
                  autoFocus
                />
                {authError && <p className="text-red-500 text-sm mt-2">{authError}</p>}
              </div>
              <button 
                type="submit" 
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
              >
                Unlock
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
