import React, { useState, useEffect } from 'react';
import { Settings, Shield, Activity, Terminal as TerminalIcon, Lock, Unlock, Database, Cpu, MessageSquare, Send } from 'lucide-react';
import Admin from './Admin';
import Analytics from './Analytics';
import { GoogleGenAI } from '@google/genai';

export default function DevPortal() {
  const [auth, setAuth] = useState(false);
  const [password, setPassword] = useState('');
  const [pingStatus, setPingStatus] = useState('');
  const [listening, setListening] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [geminiInput, setGeminiInput] = useState('');
  const [isAskingGemini, setIsAskingGemini] = useState(false);
  const [activeDevTab, setActiveDevTab] = useState('portal'); // portal, admin, analytics

  const [adminPassword, setAdminPassword] = useState('');
  const [analyticsPassword, setAnalyticsPassword] = useState('');

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  useEffect(() => {
    if (auth) {
      // Fetch settings
      fetch('/api/settings', {
        headers: { 'Authorization': `Bearer ${password}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.adminPassword) setAdminPassword(data.adminPassword);
          if (data.analyticsPassword) setAnalyticsPassword(data.analyticsPassword);
        })
        .catch(err => addLog(`Failed to fetch settings: ${err.message}`));
    }
  }, [auth]);

  const saveSetting = async (key: string, value: string) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password}`
        },
        body: JSON.stringify({ key, value })
      });
      if (res.ok) {
        addLog(`Saved setting: ${key}`);
      } else {
        addLog(`Failed to save setting: ${key}`);
      }
    } catch (err: any) {
      addLog(`Error saving setting: ${err.message}`);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'IamthebestDev') {
      setAuth(true);
      addLog('Dev authenticated successfully.');
    } else {
      alert('Incorrect password');
    }
  };

  const handlePing = async () => {
    setPingStatus('Pinging localhost:9999...');
    addLog('Pinging localhost:9999...');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch('http://localhost:9999/ping', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        setPingStatus('Ping successful!');
        addLog('Ping successful!');
      } else {
        setPingStatus('Ping failed: Server responded with error.');
        addLog('Ping failed: Server responded with error.');
      }
    } catch (err: any) {
      setPingStatus(`Ping failed: ${err.message}`);
      addLog(`Ping failed: ${err.message}`);
    }
  };

  const handleListen = async () => {
    setListening(true);
    addLog('Listening on localhost:9999 for 30 seconds...');
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const res = await fetch('http://localhost:9999/', { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (res.ok) {
        const data = await res.json();
        addLog(`Received data: ${JSON.stringify(data)}`);
      } else {
        addLog('Failed to fetch from scanner');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        addLog('Request timeout: No ID received from localhost:9999 within 30 seconds.');
      } else {
        addLog(`Listen failed: ${err.message}`);
      }
    } finally {
      setListening(false);
    }
  };

  const askGemini = async () => {
    if (!geminiInput.trim()) return;
    
    const prompt = geminiInput;
    setGeminiInput('');
    addLog(`You: ${prompt}`);
    setIsAskingGemini(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are an AI assistant in a developer portal for a school attendance system. The developer is asking for help with an error or problem. 
        Recent system logs:
        ${logs.slice(-10).join('\n')}
        
        Developer question: ${prompt}`,
      });
      
      addLog(`Gemini: ${response.text}`);
    } catch (error: any) {
      console.error(error);
      addLog(`Gemini Error: ${error.message}`);
    } finally {
      setIsAskingGemini(false);
    }
  };

  if (!auth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center mb-6 text-slate-900 dark:text-zinc-100">Developer Portal</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Enter Dev Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-zinc-100"
              />
            </div>
            <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors">
              Access Portal
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-50 flex items-center gap-3">
            <TerminalIcon className="w-8 h-8 text-indigo-600" />
            Developer Portal
          </h1>
          <p className="text-slate-600 dark:text-zinc-400 mt-1">Ultimate access and system configuration.</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
          <button 
            onClick={() => setActiveDevTab('portal')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeDevTab === 'portal' ? 'bg-white dark:bg-zinc-700 shadow-sm text-slate-900 dark:text-zinc-100' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'}`}
          >
            Portal
          </button>
          <button 
            onClick={() => setActiveDevTab('admin')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeDevTab === 'admin' ? 'bg-white dark:bg-zinc-700 shadow-sm text-slate-900 dark:text-zinc-100' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'}`}
          >
            Supreme Admin
          </button>
          <button 
            onClick={() => setActiveDevTab('analytics')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeDevTab === 'analytics' ? 'bg-white dark:bg-zinc-700 shadow-sm text-slate-900 dark:text-zinc-100' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'}`}
          >
            Supreme Analytics
          </button>
        </div>
      </header>

      {activeDevTab === 'admin' && (
        <div className="border-t border-slate-200 dark:border-zinc-800 pt-8">
          <div className="mb-4 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 p-3 rounded-lg flex items-center gap-2 text-sm font-medium">
            <Shield className="w-5 h-5" />
            You have supreme developer access to the Admin Console.
          </div>
          <Admin adminToken={adminPassword} />
        </div>
      )}

      {activeDevTab === 'analytics' && (
        <div className="border-t border-slate-200 dark:border-zinc-800 pt-8">
          <div className="mb-4 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 p-3 rounded-lg flex items-center gap-2 text-sm font-medium">
            <Shield className="w-5 h-5" />
            You have supreme developer access to Analytics.
          </div>
          <Analytics analyticsToken={analyticsPassword} />
        </div>
      )}

      {activeDevTab === 'portal' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-8">
            {/* System Modes */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-slate-900 dark:text-zinc-100">
                <Cpu className="w-5 h-5 text-indigo-500" /> System Modes
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-slate-900 dark:text-zinc-100">Production Mode</h3>
                    <p className="text-sm text-slate-500 dark:text-zinc-400">System is locked to hardware scanner on localhost:9999</p>
                  </div>
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full bg-emerald-500`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white translate-x-6`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Security */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-slate-900 dark:text-zinc-100">
                <Lock className="w-5 h-5 text-indigo-500" /> Security Controls
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-zinc-300">Admin Password</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Leave empty to disable"
                      className="flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-zinc-100"
                    />
                    <button 
                      onClick={() => saveSetting('adminPassword', adminPassword)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
                    >
                      Save
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Locks the Admin Console and protects its API endpoints.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-zinc-300">Analytics Password</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={analyticsPassword}
                      onChange={(e) => setAnalyticsPassword(e.target.value)}
                      placeholder="Leave empty to disable"
                      className="flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-zinc-100"
                    />
                    <button 
                      onClick={() => saveSetting('analyticsPassword', analyticsPassword)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
                    >
                      Save
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Locks the Analytics page and protects its API endpoints.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Logs & Gemini */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col h-[600px]">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-slate-900 dark:text-zinc-100">
              <Activity className="w-5 h-5 text-indigo-500" /> System Logs & Gemini AI
            </h2>
            <div className="flex-1 bg-slate-950 rounded-xl p-4 font-mono text-sm overflow-y-auto custom-scrollbar text-emerald-400 space-y-2">
              {logs.length === 0 ? (
                <span className="text-slate-600">No logs yet...</span>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={log.startsWith('Gemini:') ? 'text-indigo-400' : log.startsWith('You:') ? 'text-slate-300' : 'text-emerald-400'}>
                    {log}
                  </div>
                ))
              )}
            </div>
            <div className="mt-4">
              <p className="text-sm text-slate-500 dark:text-zinc-400 mb-2">Ask Gemini for help with errors:</p>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={geminiInput}
                  onChange={(e) => setGeminiInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && askGemini()}
                  placeholder="e.g. How to fix connection refused on port 9999?" 
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 outline-none text-slate-900 dark:text-zinc-100" 
                />
                <button 
                  onClick={askGemini} 
                  disabled={isAskingGemini || !geminiInput.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shrink-0 disabled:opacity-50 flex items-center gap-2"
                >
                  {isAskingGemini ? 'Thinking...' : <><Send className="w-4 h-4" /> Ask</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
