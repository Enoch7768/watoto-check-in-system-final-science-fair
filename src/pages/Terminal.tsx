import { useState, useEffect, useRef } from 'react';
import { Search, Fingerprint, AlertCircle, CheckCircle2, Clock, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  class_name: string;
  biometric_template: string | null;
}

interface Parent {
  id: number;
  first_name: string;
  last_name: string;
  biometric_template: string | null;
}

interface CheckInResult {
  success: boolean;
  message: string;
  type?: 'check_in' | 'sign_out';
  student?: {
    first_name: string;
    last_name: string;
    class_name: string;
  };
  parent?: {
    first_name: string;
    last_name: string;
  };
  children_signed_out?: number;
}

export default function Terminal() {
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [manualType, setManualType] = useState<'student' | 'parent'>('student');
  const lastProcessedTimestamp = useRef<string | null>(null);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Automatic Hardware Polling
  useEffect(() => {
    const pollHardware = async () => {
      if (loading) return; // Don't poll while a check-in is processing
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);
        
        const res = await fetch('http://localhost:9999/', { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'running' && data.lastScan) {
            const scanTimeStr = data.lastScan.timestamp; // e.g., "09/04/2026, 19:12:13"
            
            if (scanTimeStr !== lastProcessedTimestamp.current) {
              const [datePart, timePart] = scanTimeStr.split(', ');
              const [day, month, year] = datePart.split('/');
              const [hours, minutes, seconds] = timePart.split(':');
              
              // Construct date in EAT (UTC+3)
              const scanDate = new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}+03:00`);
              const now = new Date();
              
              const diffSeconds = Math.abs(now.getTime() - scanDate.getTime()) / 1000;
              
              if (diffSeconds <= 15) {
                lastProcessedTimestamp.current = scanTimeStr;
                handleCheckIn({ biometric_template: data.lastScan.fingerprint_id.toString() });
              }
            }
          }
        }
      } catch (err) {
        // Silently fail for polling to avoid console spam
      }
    };

    const intervalId = setInterval(pollHardware, 2000);
    return () => clearInterval(intervalId);
  }, [loading]);

  // Fetch data
  useEffect(() => {
    Promise.all([
      fetch('/api/students').then(res => res.json()),
      fetch('/api/parents').then(res => res.json())
    ])
    .then(([studentsData, parentsData]) => {
      setStudents(studentsData);
      setParents(parentsData);
    })
    .catch(err => console.error(err));
  }, []);

  const handleCheckIn = async (payload: any) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Operation failed');
      }

      // Map the backend response to the CheckInResult interface
      let mappedResult: CheckInResult;
      
      if (data.type === 'checkin') {
        mappedResult = {
          success: true,
          message: 'Successfully checked in',
          type: 'check_in',
          student: {
            first_name: data.record.first_name,
            last_name: data.record.last_name,
            class_name: data.record.class_name
          }
        };
      } else if (data.type === 'signout') {
        mappedResult = {
          success: true,
          message: `Signed out ${data.children.length} children`,
          type: 'sign_out',
          parent: {
            first_name: data.parent.first_name,
            last_name: data.parent.last_name
          },
          children_signed_out: data.children.length
        };
      } else {
         mappedResult = {
            success: true,
            message: data.message || 'Operation successful'
         }
      }

      setResult(mappedResult);
      // Auto-clear success message after 5 seconds
      setTimeout(() => setResult(null), 5000);
      setSearchQuery(''); // Clear search
    } catch (err: any) {
      setError(err.message);
      // Auto-clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Filter for manual search
  const filteredStudents = students.filter(s => 
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredParents = parents.filter(p => 
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">Check-in Terminal</h1>
          <p className="text-slate-600 dark:text-zinc-400 mt-1">
            Place finger on scanner or search manually.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-full bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800`}>
              <div className={`w-2 h-2 rounded-full animate-pulse bg-emerald-600 dark:bg-emerald-500`} />
              <span className={`text-xs font-medium text-emerald-800 dark:text-emerald-300`}>
                Hardware Bridge: Online
              </span>
            </div>
            <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
              {/* Pac-Man "Eating" Animation */}
              <div className="w-5 h-5 relative flex items-center justify-center">
                <motion.div
                  className="w-full h-1/2 bg-indigo-600 dark:bg-indigo-400 rounded-t-full absolute top-0"
                  style={{ originY: 1 }}
                  animate={{ rotate: [-45, 0, -45] }}
                  transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="w-full h-1/2 bg-indigo-600 dark:bg-indigo-400 rounded-b-full absolute bottom-0"
                  style={{ originY: 0 }}
                  animate={{ rotate: [45, 0, 45] }}
                  transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
              <span className="font-mono text-xl font-medium text-slate-900 dark:text-zinc-100">
                {currentTime.toLocaleTimeString('en-GB', { timeZone: 'Africa/Nairobi' })}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Primary Method (Biometric) */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden">
          <div 
            className={`w-32 h-32 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center relative group`}
          >
            <Fingerprint className={`w-16 h-16 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300`} />
            <div className={`absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-pulse`} />
          </div>
          
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">
              Biometric Scanner
            </h2>
            <p className="text-slate-600 dark:text-zinc-400 mt-2 max-w-xs mx-auto">
              Place your finger on the scanner. The system is continuously listening for hardware on localhost:9999.
            </p>
          </div>
        </div>

        {/* Right: Secondary Method (Manual) */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col h-[500px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">
              Manual Search
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setManualType('student')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  manualType === 'student' 
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                }`}
              >
                Students
              </button>
              <button
                onClick={() => setManualType('parent')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  manualType === 'parent' 
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                }`}
              >
                Parents
              </button>
            </div>
          </div>
          
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-zinc-400" />
            <input
              type="text"
              placeholder={`Search ${manualType === 'student' ? 'student' : 'parent'} name...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {searchQuery.length > 0 ? (
              manualType === 'student' ? (
                filteredStudents.length > 0 ? (
                  filteredStudents.map(student => (
                    <button
                      key={student.id}
                      onClick={() => handleCheckIn({ student_id: student.id })}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-white dark:bg-zinc-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-slate-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group text-left shadow-sm"
                    >
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-zinc-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                          {student.first_name} {student.last_name}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-zinc-400">
                          {student.class_name}
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                        <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-500 dark:text-zinc-400">
                    No students found matching "{searchQuery}"
                  </div>
                )
              ) : (
                filteredParents.length > 0 ? (
                  filteredParents.map(parent => (
                    <button
                      key={parent.id}
                      onClick={() => handleCheckIn({ parent_id: parent.id })}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-white dark:bg-zinc-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-slate-200 dark:border-zinc-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all group text-left shadow-sm"
                    >
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-zinc-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                          {parent.first_name} {parent.last_name}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-zinc-400">
                          Parent / Guardian
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                        <LogOut className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-500 dark:text-zinc-400">
                    No parents found matching "{searchQuery}"
                  </div>
                )
              )
            ) : (
              <div className="text-center py-12 text-slate-500 dark:text-zinc-400">
                Type to search for {manualType === 'student' ? 'students' : 'parents'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Result / Error Overlay */}
      <AnimatePresence>
        {(result || error) && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md p-6 rounded-2xl shadow-2xl border backdrop-blur-md z-50
              ${result 
                ? (result.type === 'sign_out' 
                    ? 'bg-emerald-50/90 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                    : 'bg-indigo-50/90 dark:bg-indigo-950/90 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-100')
                : 'bg-red-50/90 dark:bg-red-950/90 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100'
              }`}
          >
            <div className="flex items-start gap-4">
              {result ? (
                result.type === 'sign_out' ? <LogOut className="w-8 h-8 shrink-0" /> : <CheckCircle2 className="w-8 h-8 shrink-0" />
              ) : (
                <AlertCircle className="w-8 h-8 shrink-0" />
              )}
              
              <div>
                <h3 className="text-lg font-bold">
                  {result ? (result.type === 'sign_out' ? 'Signed Out' : 'Checked In') : 'Error'}
                </h3>
                {result && result.type === 'check_in' && result.student && (
                  <div className="mt-1">
                    <p className="text-xl font-semibold">{result.student.first_name} {result.student.last_name}</p>
                    <p className="opacity-80 text-sm">{result.student.class_name} • {result.message}</p>
                  </div>
                )}
                {result && result.type === 'sign_out' && result.parent && (
                  <div className="mt-1">
                    <p className="text-xl font-semibold">{result.parent.first_name} {result.parent.last_name}</p>
                    <p className="opacity-80 text-sm">{result.message}</p>
                  </div>
                )}
                {error && <p className="mt-1">{error}</p>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
