import React, { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, Edit2, Save, X, Users, UserCircle } from 'lucide-react';

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  class_name: string;
  class_id: number;
  biometric_template: string | null;
}

interface Class {
  id: number;
  name: string;
}

interface Parent {
  id: number;
  first_name: string;
  last_name: string;
  phone: string | null;
  biometric_template: string | null;
  student_ids: number[];
  student_names: string[];
}

export default function Admin({ adminToken }: { adminToken?: string }) {
  const [activeTab, setActiveTab] = useState<'students' | 'parents'>('students');
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Student Form State
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [classId, setClassId] = useState('');
  const [biometricId, setBiometricId] = useState('');

  // Parent Form State
  const [editingParentId, setEditingParentId] = useState<number | null>(null);
  const [parentFirstName, setParentFirstName] = useState('');
  const [parentLastName, setParentLastName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentBiometricId, setParentBiometricId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const lastProcessedTimestamp = React.useRef<string | null>(null);

  // Class Form State
  const [newClassName, setNewClassName] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sRes, cRes, pRes] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/classes', { headers: { 'Authorization': `Bearer ${adminToken || ''}` } }),
        fetch('/api/parents')
      ]);
      setStudents(await sRes.json());
      setClasses(await cRes.json());
      setParents(await pRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Automatic Hardware Polling for Enrollment
  useEffect(() => {
    const pollHardware = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);
        
        const res = await fetch('http://localhost:9999/', { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'running' && data.lastScan) {
            const scanTimeStr = data.lastScan.timestamp;
            
            if (scanTimeStr !== lastProcessedTimestamp.current) {
              const [datePart, timePart] = scanTimeStr.split(', ');
              const [day, month, year] = datePart.split('/');
              const [hours, minutes, seconds] = timePart.split(':');
              
              const scanDate = new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}+03:00`);
              const now = new Date();
              
              const diffSeconds = Math.abs(now.getTime() - scanDate.getTime()) / 1000;
              
              if (diffSeconds <= 15) {
                lastProcessedTimestamp.current = scanTimeStr;
                const newFingerprintId = data.lastScan.fingerprint_id.toString();
                if (activeTab === 'students') {
                  setBiometricId(newFingerprintId);
                } else if (activeTab === 'parents') {
                  setParentBiometricId(newFingerprintId);
                }
              }
            }
          }
        }
      } catch (err) {
        // Silently fail for polling
      }
    };

    const intervalId = setInterval(pollHardware, 2000);
    return () => clearInterval(intervalId);
  }, [activeTab]);

  // --- Student Logic ---
  const handleCreateOrUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !classId) {
      alert("Please fill in all required fields");
      return;
    }

    const url = editingStudentId ? `/api/students/${editingStudentId}` : '/api/students';
    const method = editingStudentId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken || ''}`
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          class_id: parseInt(classId),
          biometric_template: biometricId || null
        })
      });
      
      if (res.ok) {
        fetchData();
        resetStudentForm();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save student");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred while saving");
    }
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudentId(student.id);
    setFirstName(student.first_name);
    setLastName(student.last_name);
    setClassId(student.class_id ? student.class_id.toString() : '');
    setBiometricId(student.biometric_template || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetStudentForm = () => {
    setEditingStudentId(null);
    setFirstName('');
    setLastName('');
    setClassId('');
    setBiometricId('');
  };

  // --- Parent Logic ---
  const handleCreateOrUpdateParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentFirstName || !parentLastName) {
      alert("Please fill in all required fields");
      return;
    }

    const url = editingParentId ? `/api/parents/${editingParentId}` : '/api/parents';
    const method = editingParentId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken || ''}`
        },
        body: JSON.stringify({
          first_name: parentFirstName,
          last_name: parentLastName,
          phone: parentPhone || null,
          biometric_template: parentBiometricId || null,
          student_ids: selectedStudentIds
        })
      });
      
      if (res.ok) {
        fetchData();
        resetParentForm();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save parent");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred while saving");
    }
  };

  const handleEditParent = (parent: Parent) => {
    setEditingParentId(parent.id);
    setParentFirstName(parent.first_name);
    setParentLastName(parent.last_name);
    setParentPhone(parent.phone || '');
    setParentBiometricId(parent.biometric_template || '');
    setSelectedStudentIds(parent.student_ids || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetParentForm = () => {
    setEditingParentId(null);
    setParentFirstName('');
    setParentLastName('');
    setParentPhone('');
    setParentBiometricId('');
    setSelectedStudentIds([]);
  };

  const toggleStudentSelection = (studentId: number) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  // --- Class Logic ---
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName) return;

    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken || ''}`
        },
        body: JSON.stringify({ name: newClassName })
      });

      if (res.ok) {
        fetchData();
        setNewClassName('');
      } else {
        alert("Failed to create class");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'student' | 'parent' | 'class', id: number } | null>(null);

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const { type, id } = deleteConfirm;
    
    try {
      let url = '';
      if (type === 'student') url = `/api/students/${id}`;
      else if (type === 'parent') url = `/api/parents/${id}`;
      else if (type === 'class') url = `/api/classes/${id}`;

      const res = await fetch(url, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken || ''}` }
      });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || `Failed to delete ${type}`);
      }
    } catch (e) {
      console.error(e);
      alert(`Error deleting ${type}`);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleDeleteStudent = (id: number) => setDeleteConfirm({ type: 'student', id });
  const handleDeleteParent = (id: number) => setDeleteConfirm({ type: 'parent', id });
  const handleDeleteClass = (id: number) => setDeleteConfirm({ type: 'class', id });

  return (
    <div className="space-y-8">
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-800 max-w-sm w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100 mb-2">Confirm Deletion</h3>
            <p className="text-slate-600 dark:text-zinc-400 mb-6">
              Are you sure you want to delete this {deleteConfirm.type}? This action cannot be undone and may result in data loss.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">Admin Console</h1>
          <p className="text-slate-600 dark:text-zinc-400 mt-1">
            Manage students, parents, and classes.
          </p>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-zinc-800/50 p-1 rounded-xl border border-slate-200 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'students' 
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Students
          </button>
          <button
            onClick={() => setActiveTab('parents')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'parents' 
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`}
          >
            <UserCircle className="w-4 h-4" />
            Parents / Guardians
          </button>
        </div>
      </header>

      {activeTab === 'students' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
          {/* Left Column: Forms */}
          <div className="lg:col-span-1 space-y-8">
            
            {/* Student Form */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">
                  {editingStudentId ? 'Edit Student' : 'Enroll New Student'}
                </h2>
                {editingStudentId && (
                  <button type="button" onClick={resetStudentForm} className="text-xs text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 flex items-center gap-1">
                    <X className="w-3 h-3" /> Cancel
                  </button>
                )}
              </div>
              <form onSubmit={handleCreateOrUpdateStudent} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-zinc-300">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-zinc-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-zinc-300">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-zinc-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-zinc-300">Class</label>
                    <select
                      value={classId}
                      onChange={e => setClassId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-zinc-100"
                      required
                    >
                      <option value="">Select Class</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="pt-2">
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-zinc-300">Biometric Template</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={biometricId}
                        readOnly
                        placeholder="Not enrolled"
                        className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400"
                      />
                      <div className="px-3 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center justify-center" title="Listening for hardware">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Place finger on scanner to automatically enroll</p>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    {editingStudentId ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    {editingStudentId ? 'Update Student' : 'Enroll Student'}
                  </button>
                </form>
              </div>

            {/* Class Management Form */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-zinc-100">Manage Classes</h2>
              <form onSubmit={handleCreateClass} className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newClassName}
                    onChange={e => setNewClassName(e.target.value)}
                    placeholder="New Class Name (e.g. Grade 2)"
                    className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-zinc-100"
                    required
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </form>

              <div className="mt-4 space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {classes.map(cls => (
                  <div key={cls.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-lg border border-slate-200 dark:border-zinc-800 hover:border-indigo-500/30 transition-colors">
                    <span className="text-slate-900 dark:text-zinc-100 font-medium">{cls.name}</span>
                    <button 
                      type="button"
                      onClick={() => handleDeleteClass(cls.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      title="Delete Class"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {classes.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-2">No classes found.</p>
                )}
              </div>
            </div>

          </div>

          {/* Right Column: List */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">
                  Student Directory
                </h2>
                <span className="text-sm text-slate-600 dark:text-zinc-400">
                  {students.length} Students
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-zinc-800/50 text-slate-900 dark:text-zinc-100 font-semibold border-b border-slate-200 dark:border-zinc-800">
                    <tr>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Class</th>
                      <th className="px-6 py-4">Biometric Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                    {/* Student List */}
                    {students.map(student => (
                      <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-zinc-100">{student.first_name} {student.last_name}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-zinc-400">{student.class_name}</td>
                        <td className="px-6 py-4">
                          {student.biometric_template ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                              Enrolled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 dark:bg-zinc-500" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              type="button"
                              onClick={() => handleEditStudent(student)}
                              className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
                              title="Edit Student"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleDeleteStudent(student.id)}
                              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                              title="Delete Student"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {/* Empty States */}
                    {students.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-slate-500 dark:text-zinc-400">
                          No students enrolled yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'parents' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
          {/* Left Column: Parent Form */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">
                  {editingParentId ? 'Edit Parent' : 'Add New Parent'}
                </h2>
                {editingParentId && (
                  <button type="button" onClick={resetParentForm} className="text-xs text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 flex items-center gap-1">
                    <X className="w-3 h-3" /> Cancel
                  </button>
                )}
              </div>
              <form onSubmit={handleCreateOrUpdateParent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-zinc-300">First Name</label>
                  <input
                    type="text"
                    value={parentFirstName}
                    onChange={e => setParentFirstName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-zinc-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-zinc-300">Last Name</label>
                  <input
                    type="text"
                    value={parentLastName}
                    onChange={e => setParentLastName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-zinc-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-zinc-300">Phone Number</label>
                  <input
                    type="tel"
                    value={parentPhone}
                    onChange={e => setParentPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-zinc-100"
                  />
                </div>
                
                <div className="pt-2">
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-zinc-300">Biometric Template</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={parentBiometricId}
                      readOnly
                      placeholder="Not enrolled"
                      className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400"
                    />
                    <div className="px-3 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center justify-center" title="Listening for hardware">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Place finger on scanner to automatically enroll</p>
                </div>

                <div className="pt-2">
                  <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-zinc-300">Assign Students</label>
                  <div className="max-h-48 overflow-y-auto custom-scrollbar border border-slate-200 dark:border-zinc-700 rounded-lg p-2 bg-slate-50 dark:bg-zinc-950 space-y-1">
                    {students.map(student => (
                      <label key={student.id} className="flex items-center gap-3 p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-md cursor-pointer transition-colors">
                        <input 
                          type="checkbox"
                          checked={selectedStudentIds.includes(student.id)}
                          onChange={() => toggleStudentSelection(student.id)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-zinc-300">
                          {student.first_name} {student.last_name} <span className="text-slate-400 text-xs">({student.class_name})</span>
                        </span>
                      </label>
                    ))}
                    {students.length === 0 && (
                      <p className="text-xs text-slate-500 text-center py-2">No students available.</p>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  {editingParentId ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  {editingParentId ? 'Update Parent' : 'Add Parent'}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Parent List */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">
                  Parent Directory
                </h2>
                <span className="text-sm text-slate-600 dark:text-zinc-400">
                  {parents.length} Parents
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-zinc-800/50 text-slate-900 dark:text-zinc-100 font-semibold border-b border-slate-200 dark:border-zinc-800">
                    <tr>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Phone</th>
                      <th className="px-6 py-4">Assigned Students</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                    {parents.map(parent => (
                      <tr key={parent.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-zinc-100">{parent.first_name} {parent.last_name}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-zinc-400">{parent.phone || '-'}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {parent.student_names && parent.student_names.length > 0 ? (
                              parent.student_names.map((name, idx) => (
                                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                                  {name}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 italic text-xs">None</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              type="button"
                              onClick={() => handleEditParent(parent)}
                              className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
                              title="Edit Parent"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleDeleteParent(parent.id)}
                              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                              title="Delete Parent"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {parents.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-slate-500 dark:text-zinc-400">
                          No parents added yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
