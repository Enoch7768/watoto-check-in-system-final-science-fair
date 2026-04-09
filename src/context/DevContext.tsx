import React, { createContext, useState, useContext } from 'react';

interface DevContextType {
  isDevAuthenticated: boolean;
  loginDev: (password: string) => boolean;
  logoutDev: () => void;
  devModeEnabled: boolean;
  setDevModeEnabled: (enabled: boolean) => void;
  simModeEnabled: boolean;
  setSimModeEnabled: (enabled: boolean) => void;
  adminPassword: string;
  setAdminPassword: (pwd: string) => void;
  isAdminAuthenticated: boolean;
  loginAdmin: (password: string) => boolean;
  logoutAdmin: () => void;
}

const DevContext = createContext<DevContextType | undefined>(undefined);

export const DevProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDevAuthenticated, setIsDevAuthenticated] = useState(false);
  const [devModeEnabled, setDevModeEnabled] = useState(false);
  const [simModeEnabled, setSimModeEnabled] = useState(false);
  const [adminPassword, setAdminPasswordState] = useState(() => localStorage.getItem('admin_pwd') || 'admin123');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  const setAdminPassword = (pwd: string) => {
    setAdminPasswordState(pwd);
    localStorage.setItem('admin_pwd', pwd);
  };

  const loginAdmin = (password: string) => {
    if (password === adminPassword) {
      setIsAdminAuthenticated(true);
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    setIsAdminAuthenticated(false);
  };

  const loginDev = (password: string) => {
    if (password === 'IamthebestDev') {
      setIsDevAuthenticated(true);
      return true;
    }
    return false;
  };

  const logoutDev = () => {
    setIsDevAuthenticated(false);
    setDevModeEnabled(false);
    setSimModeEnabled(false);
    setIsAdminAuthenticated(false);
  };

  return (
    <DevContext.Provider value={{ 
      isDevAuthenticated, loginDev, logoutDev, 
      devModeEnabled, setDevModeEnabled, 
      simModeEnabled, setSimModeEnabled,
      adminPassword, setAdminPassword,
      isAdminAuthenticated, loginAdmin, logoutAdmin
    }}>
      {children}
    </DevContext.Provider>
  );
};

export const useDevContext = () => {
  const context = useContext(DevContext);
  if (!context) throw new Error('useDevContext must be used within DevProvider');
  return context;
};
