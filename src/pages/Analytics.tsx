import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, UserCheck, Clock, UserX, Download, Calendar, Filter } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface Stats {
  summary: {
    total: number;
    present: number;
    late: number;
    absent: number;
  };
  byClass: {
    class_name: string;
    total_students: number;
    present: number;
    late: number;
    absent: number;
  }[];
}

interface HistoryRecord {
  id: number;
  student_id: number;
  first_name: string;
  last_name: string;
  class_name: string;
  status: string;
  date: string;
  check_in_time: string;
}

export default function Analytics() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // History State
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats');
        setStats(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    // Poll every 10 seconds for real-time feel
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/attendance/history?startDate=${startDate}&endDate=${endDate}`);
      setHistory(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const downloadXLSX = async () => {
    if (history.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Watoto Christian International School';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Attendance Report');

    // Generate logo base64
    const logoBase64 = await new Promise<string>((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve('');

      const svgString = `
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="200" height="200">
          <path id="top-curve" d="M 20 100 A 80 80 0 0 1 180 100" fill="none" />
          <text fill="#1E3A8A" font-size="16" font-weight="900" letter-spacing="2" font-family="Arial">
            <textPath href="#top-curve" startOffset="50%" text-anchor="middle">WATOTO CHRISTIAN</textPath>
          </text>
          <path id="bottom-curve" d="M 180 100 A 80 80 0 0 1 20 100" fill="none" />
          <text fill="#1E3A8A" font-size="16" font-weight="900" letter-spacing="2" font-family="Arial">
            <textPath href="#bottom-curve" startOffset="50%" text-anchor="middle">INTERNATIONAL SCHOOL</textPath>
          </text>
          <circle cx="100" cy="100" r="95" fill="none" stroke="#1E3A8A" stroke-width="3" stroke-dasharray="100 40 100 40" stroke-dashoffset="70" />
          <path d="M 45 140 C 60 100, 70 70, 85 55 C 90 80, 95 100, 100 120 C 115 80, 135 60, 160 45 C 140 80, 120 110, 110 140 C 100 110, 90 80, 80 110 C 70 140, 60 150, 45 140 Z" fill="#1E3A8A" />
        </svg>
      `;
      
      const img = new Image();
      const svg = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svg);
      
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png').split(',')[1]);
      };
      img.src = url;
    });

    if (logoBase64) {
      const imageId = workbook.addImage({
        base64: logoBase64,
        extension: 'png',
      });
      worksheet.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 80, height: 80 }
      });
    }

    // Add a formal title
    worksheet.mergeCells('A1:F4');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `Watoto Christian International School\nAttendance Report (${startDate} to ${endDate})`;
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1E3A8A' } }; // Dark blue text
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }; // White background
    titleCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

    // Add some spacing
    worksheet.addRow([]);

    // Define columns
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Time', key: 'time', width: 15 },
      { header: 'First Name', key: 'firstName', width: 20 },
      { header: 'Last Name', key: 'lastName', width: 20 },
      { header: 'Class', key: 'className', width: 15 },
      { header: 'Status', key: 'status', width: 15 }
    ];

    // Style the header row (row 6 now)
    const headerRow = worksheet.getRow(6);
    headerRow.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } }; // Blue
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Add borders to header
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add data
    history.forEach((h, index) => {
      const timeString = new Date(h.check_in_time + 'Z').toLocaleTimeString('en-US', { timeZone: 'Africa/Nairobi', hour: 'numeric', minute: '2-digit', hour12: true });
      const row = worksheet.addRow({
        date: h.date,
        time: timeString,
        firstName: h.first_name,
        lastName: h.last_name,
        className: h.class_name,
        status: h.status
      });

      // Style data rows
      row.font = { name: 'Arial', size: 11 };
      row.alignment = { vertical: 'middle', horizontal: 'left' };
      
      // Alternating row colors
      if (index % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }; // Light gray
      }

      // Add borders
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
        };
      });

      // Status color coding
      const statusCell = row.getCell('status');
      statusCell.alignment = { vertical: 'middle', horizontal: 'center' };
      statusCell.font = { name: 'Arial', size: 11, bold: true };
      if (h.status === 'Present') {
        statusCell.font.color = { argb: 'FF059669' }; // Emerald
      } else if (h.status === 'Late') {
        statusCell.font.color = { argb: 'FFD97706' }; // Amber
      } else {
        statusCell.font.color = { argb: 'FFDC2626' }; // Red
      }
    });

    // Generate and save file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Attendance_Report_${startDate}_to_${endDate}.xlsx`);
  };

  if (loading || !stats) return <div>Loading analytics...</div>;

  const pieData = [
    { name: 'Present', value: stats.summary.present, color: '#10b981' },
    { name: 'Late', value: stats.summary.late, color: '#f59e0b' },
    { name: 'Absent', value: stats.summary.absent, color: '#ef4444' },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">Analytics Dashboard</h1>
          <p className="text-slate-600 dark:text-zinc-400 mt-1">
            Real-time attendance insights and reporting.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">
              {new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Total Students" 
          value={stats.summary.total} 
          icon={Users} 
          color="bg-indigo-500" 
        />
        <StatCard 
          label="Present" 
          value={stats.summary.present} 
          icon={UserCheck} 
          color="bg-emerald-500" 
        />
        <StatCard 
          label="Late" 
          value={stats.summary.late} 
          icon={Clock} 
          color="bg-amber-500" 
        />
        <StatCard 
          label="Absent" 
          value={stats.summary.absent} 
          icon={UserX} 
          color="bg-red-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Attendance by Class Chart */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm h-[400px] flex flex-col">
          <h3 className="text-lg font-semibold mb-6 text-slate-900 dark:text-zinc-100">Attendance by Class</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.byClass} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#64748b" opacity={0.1} />
                <XAxis dataKey="class_name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  cursor={{ fill: 'transparent' }}
                />
                <Bar dataKey="present" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                <Bar dataKey="late" stackId="a" fill="#f59e0b" />
                <Bar dataKey="absent" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Distribution */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm h-[400px] flex flex-col">
          <h3 className="text-lg font-semibold mb-6 text-slate-900 dark:text-zinc-100">Daily Distribution</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Attendance History & Export */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">Attendance History</h3>
            <p className="text-sm text-slate-500 dark:text-zinc-400">View and export historical records.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700">
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-sm text-slate-900 dark:text-zinc-100 outline-none"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-sm text-slate-900 dark:text-zinc-100 outline-none"
              />
            </div>
            
            <button 
              onClick={fetchHistory}
              disabled={historyLoading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <Filter className="w-4 h-4" />
              Filter
            </button>
            
            <button 
              onClick={downloadXLSX}
              disabled={history.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export XLSX
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-zinc-800/50 text-slate-900 dark:text-zinc-100 font-semibold border-b border-slate-200 dark:border-zinc-800 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">Student Name</th>
                <th className="px-6 py-4">Class</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
              {historyLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-zinc-400">
                    Loading history...
                  </td>
                </tr>
              ) : history.length > 0 ? (
                history.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4 text-slate-900 dark:text-zinc-100">{record.date}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-zinc-400 font-mono text-xs">
                      {new Date(record.check_in_time + 'Z').toLocaleTimeString('en-US', { timeZone: 'Africa/Nairobi', hour: 'numeric', minute: '2-digit', hour12: true })}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-zinc-100">{record.first_name} {record.last_name}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-zinc-400">{record.class_name}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        record.status === 'Present' 
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-zinc-400">
                    No records found for the selected range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Class Performance Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-zinc-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">Class Performance (Today)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-zinc-800/50 text-slate-900 dark:text-zinc-100 font-semibold border-b border-slate-200 dark:border-zinc-800">
              <tr>
                <th className="px-6 py-4">Class Name</th>
                <th className="px-6 py-4">Total Students</th>
                <th className="px-6 py-4">Attendance Rate</th>
                <th className="px-6 py-4">Late Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
              {stats.byClass.map((cls) => {
                const attendanceRate = Math.round(((cls.present + cls.late) / cls.total_students) * 100) || 0;
                const lateRate = Math.round((cls.late / cls.total_students) * 100) || 0;
                
                return (
                  <tr key={cls.class_name} className="hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-zinc-100">{cls.class_name}</td>
                    <td className="px-6 py-4 text-slate-700 dark:text-zinc-300">{cls.total_students}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${attendanceRate}%` }} />
                        </div>
                        <span className="text-xs text-slate-600 dark:text-zinc-400">{attendanceRate}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500" style={{ width: `${lateRate}%` }} />
                        </div>
                        <span className="text-xs text-slate-600 dark:text-zinc-400">{lateRate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string, value: number, icon: any, color: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-slate-600 dark:text-zinc-400 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-zinc-100">{value}</p>
      </div>
    </div>
  );
}
