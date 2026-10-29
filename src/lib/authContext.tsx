import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppUser, UserRole } from '../types/database';
import { supabase } from './supabase';

interface AuthContextType {
  currentUser: AppUser | null;
  usersList: AppUser[];
  setCurrentUser: (user: AppUser) => void;
  switchUserRole: (role: UserRole, unitId?: string | null) => void;
  isLoading: boolean;
  canAccessUnit: (unitId: string) => boolean;
  canPerformAnalysis: boolean;
  canApprove: boolean;
  canDisburse: boolean;
  canManageSettings: boolean;
  canManageDraft: (submissionUnitId: string, submissionStatus: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch registered users from Supabase app_users table
  useEffect(() => {
    async function loadUsers() {
      try {
        const { data, error } = await supabase
          .from('app_users')
          .select('*, units(name)')
          .order('role', { ascending: true });

        if (error) {
          console.error('Error fetching app_users:', error);
          // Fallback user if offline or starting up
          const fallbackUser: AppUser = {
            id: 'admin-fallback',
            email: 'admin@alquraniyyah.sch.id',
            full_name: 'Administrator Yayasan',
            role: 'ADMIN',
            unit_id: null,
            is_active: true,
            created_at: new Date().toISOString()
          };
          setUsersList([fallbackUser]);
          setCurrentUser(fallbackUser);
        } else if (data && data.length > 0) {
          const mappedUsers: AppUser[] = data.map((u: any) => ({
            id: u.id,
            email: u.email,
            full_name: u.full_name,
            role: u.role as UserRole,
            unit_id: u.unit_id,
            unit_name: u.units?.name,
            is_active: u.is_active,
            created_at: u.created_at
          }));
          setUsersList(mappedUsers);

          // Restore previously selected user if stored in session or default to Bendahara/Admin
          const savedUserId = sessionStorage.getItem('active_user_id');
          const found = mappedUsers.find(u => u.id === savedUserId);
          setCurrentUser(found || mappedUsers.find(u => u.role === 'BENDAHARA') || mappedUsers[0]);
        }
      } catch (err) {
        console.error('Error in loadUsers:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadUsers();
  }, []);

  const handleSetCurrentUser = (user: AppUser) => {
    setCurrentUser(user);
    sessionStorage.setItem('active_user_id', user.id);
  };

  const switchUserRole = (role: UserRole, unitId?: string | null) => {
    let match = usersList.find(u => {
      if (u.role !== role) return false;
      if (role === 'OPERATOR' && unitId) {
        return u.unit_id === unitId;
      }
      return true;
    });

    if (match) {
      handleSetCurrentUser(match);
    }
  };

  // RBAC Permission checks
  const canAccessUnit = (unitId: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'ADMIN' || currentUser.role === 'BENDAHARA' || currentUser.role === 'PENGELUARAN') {
      return true;
    }
    // Operator can only access their designated unit
    return currentUser.unit_id === unitId;
  };

  const canPerformAnalysis = currentUser?.role === 'BENDAHARA' || currentUser?.role === 'ADMIN';
  const canApprove = currentUser?.role === 'BENDAHARA' || currentUser?.role === 'ADMIN';
  const canDisburse = currentUser?.role === 'PENGELUARAN' || currentUser?.role === 'ADMIN';
  const canManageSettings = currentUser?.role === 'ADMIN';

  const canManageDraft = (submissionUnitId: string, submissionStatus: string): boolean => {
    if (!currentUser) return false;
    if (submissionStatus !== 'Draft') return false; // Once submitted, follow audit workflow
    if (currentUser.role === 'ADMIN') return true;
    if (currentUser.role === 'OPERATOR') {
      return currentUser.unit_id === submissionUnitId;
    }
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        usersList,
        setCurrentUser: handleSetCurrentUser,
        switchUserRole,
        isLoading,
        canAccessUnit,
        canPerformAnalysis,
        canApprove,
        canDisburse,
        canManageSettings,
        canManageDraft,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
