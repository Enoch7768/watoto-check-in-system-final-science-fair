import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LogIn, User, Clock, Calendar, LogOut, ChevronRight, ShieldCheck, Users } from 'lucide-react-native';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.0.2.2:3000';

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

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [parent, setParent] = useState<any>(null);
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<{ children: Child[], attendance: AttendanceRecord[] } | null>(null);

  useEffect(() => {
    const loadParent = async () => {
      try {
        const savedParent = await AsyncStorage.getItem('parent_user');
        if (savedParent) {
          const p = JSON.parse(savedParent);
          setParent(p);
          setIsLoggedIn(true);
          fetchDashboard(p.id);
        }
      } catch (e) {
        console.error('Failed to load parent', e);
      }
    };
    loadParent();
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !parent) return;

    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      let wsUrl = '';
      if (API_BASE) {
        try {
          const url = new URL(API_BASE.startsWith('http') ? API_BASE : `http://${API_BASE}`);
          wsUrl = `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}`;
        } catch (e) {
          wsUrl = `ws://10.0.2.2:3000`;
        }
      } else {
        wsUrl = `ws://10.0.2.2:3000`;
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
        reconnectTimeout = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [isLoggedIn, parent]);

  const handleLogin = async () => {
    if (!phone || !pin) {
      setError('Please enter phone and PIN');
      return;
    }
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
        await AsyncStorage.setItem('parent_user', JSON.stringify(data.parent));
        setParent(data.parent);
        setIsLoggedIn(true);
        fetchDashboard(data.parent.id);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Ensure API is reachable.');
      console.error(err);
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

  const handleLogout = async () => {
    await AsyncStorage.removeItem('parent_user');
    setIsLoggedIn(false);
    setParent(null);
    setDashboardData(null);
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginContainer}>
          <View style={styles.iconContainer}>
            <ShieldCheck color="#4f46e5" size={40} />
          </View>
          <Text style={styles.title}>Parent Portal</Text>
          <Text style={styles.subtitle}>Secure access to your children's attendance</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g. 555-0101"
              keyboardType="phone-pad"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Security PIN</Text>
            <TextInput
              style={styles.input}
              value={pin}
              onChangeText={setPin}
              placeholder="••••"
              secureTextEntry
              maxLength={4}
              keyboardType="numeric"
            />

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <LogIn color="#fff" size={20} style={{ marginRight: 8 }} />
                  <Text style={styles.buttonText}>Access Portal</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.dashboardScroll}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <User color="#4f46e5" size={28} />
            </View>
            <View>
              <Text style={styles.welcomeText}>Welcome, {parent.first_name}!</Text>
              <Text style={styles.dashboardSubtitle}>Parent Dashboard</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut color="#ef4444" size={20} style={{ marginRight: 6 }} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users color="#6366f1" size={24} style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Your Children</Text>
          </View>
          {dashboardData?.children.map(child => (
            <View key={child.id} style={styles.card}>
              <View>
                <Text style={styles.childName}>{child.first_name} {child.last_name}</Text>
                <Text style={styles.className}>{child.class_name}</Text>
              </View>
              <ChevronRight color="#cbd5e1" size={24} />
            </View>
          ))}
          {dashboardData?.children.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No children assigned to your account.</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock color="#10b981" size={24} style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Recent Activity</Text>
          </View>
          
          {dashboardData?.attendance.map(record => (
            <View key={record.id} style={styles.recordCard}>
              <View style={styles.recordHeader}>
                <Text style={styles.recordName}>{record.first_name}</Text>
                <View style={styles.dateContainer}>
                  <Calendar color="#94a3b8" size={14} style={{ marginRight: 4 }} />
                  <Text style={styles.recordDate}>{record.date}</Text>
                </View>
              </View>
              
              <View style={styles.recordDetails}>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeLabel}>Check-in</Text>
                  <View style={[styles.badge, record.status === 'Present' ? styles.badgeSuccess : styles.badgeWarning]}>
                    <Text style={[styles.badgeText, record.status === 'Present' ? styles.badgeTextSuccess : styles.badgeTextWarning]}>
                      {new Date(record.check_in_time + 'Z').toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.timeBlock}>
                  <Text style={styles.timeLabel}>Check-out</Text>
                  {record.check_out_time ? (
                    <View style={[styles.badge, styles.badgeInfo]}>
                      <Text style={[styles.badgeText, styles.badgeTextInfo]}>
                        {new Date(record.check_out_time + 'Z').toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.stillInSchool}>Still in school</Text>
                  )}
                </View>
              </View>
              
              <View style={styles.signedOutBy}>
                <Text style={styles.signedOutLabel}>Signed out by: </Text>
                <Text style={styles.signedOutName}>{record.signed_out_by_name || '-'}</Text>
              </View>
            </View>
          ))}
          
          {dashboardData?.attendance.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No attendance records found.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#e0e7ff',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
    fontSize: 14,
  },
  dashboardScroll: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    backgroundColor: '#e0e7ff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  dashboardSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  logoutText: {
    color: '#475569',
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  childName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  className: {
    fontSize: 14,
    color: '#64748b',
  },
  emptyCard: {
    backgroundColor: '#f8fafc',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
  },
  recordCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
  },
  recordName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordDate: {
    fontSize: 14,
    color: '#64748b',
  },
  recordDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeBlock: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stillInSchool: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#94a3b8',
    marginTop: 6,
  },
  signedOutBy: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
  },
  signedOutLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  signedOutName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeSuccess: {
    backgroundColor: '#d1fae5',
  },
  badgeWarning: {
    backgroundColor: '#fef3c7',
  },
  badgeInfo: {
    backgroundColor: '#e0e7ff',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  badgeTextSuccess: {
    color: '#047857',
  },
  badgeTextWarning: {
    color: '#b45309',
  },
  badgeTextInfo: {
    color: '#4338ca',
  },
});
