import React, { useEffect, useState } from 'react';
import { Fingerprint, Users, BarChart3, Sun, Moon, TerminalSquare } from 'lucide-react';
import { motion } from 'motion/react';
import WatotoLogo from './WatotoLogo';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'light' ? 'light' : 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const navItems = [
    { id: 'terminal', label: 'Check-in Terminal', icon: Fingerprint },
    { id: 'admin', label: 'Admin Console', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'dev', label: 'Dev Portal', icon: TerminalSquare },
  ];

  return (
    <div className="min-h-screen transition-colors duration-300 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100">
      {/* Sidebar / Navigation */}
      <nav className="fixed left-0 top-0 h-full w-20 lg:w-64 border-r transition-colors duration-300 z-50 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 flex flex-col justify-between">
        
        <div>
          <div className="p-6 flex items-center justify-center lg:justify-start gap-3">
            <div className="w-10 h-10 flex items-center justify-center shrink-0 text-indigo-700 dark:text-indigo-400">
              <WatotoLogo className="w-10 h-10" />
            </div>
            <span className="hidden lg:block font-bold text-lg tracking-tight text-slate-900 dark:text-zinc-50">Watoto CIS</span>
          </div>

          <div className="mt-8 flex flex-col gap-2 px-3">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group relative
                  ${activeTab === item.id 
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' 
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                  }`}
              >
                <item.icon className={`w-6 h-6 shrink-0 ${activeTab === item.id ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                <span className="hidden lg:block font-medium">{item.label}</span>
                {activeTab === item.id && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute left-0 w-1 h-8 bg-indigo-600 rounded-r-full"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="p-4 border-t border-slate-200 dark:border-zinc-800">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-center lg:justify-start gap-3 p-3 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-all"
          >
            {theme === 'dark' ? <Sun className="w-6 h-6 shrink-0" /> : <Moon className="w-6 h-6 shrink-0" />}
            <span className="hidden lg:block font-medium">
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pl-20 lg:pl-64 min-h-screen transition-all duration-300">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
