import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppUser, UserRole } from '../types/database';
import { supabase } from './supabase';

interface AuthContextType {
  currentUser: AppUser | null;
  usersList: AppUser[];
  setCurrentUser: (user: AppUser) => void;
  switchUserRole: (role: UserRole, unitId?: string | null) => void;
  isLoading: boolean;
  isOperator: boolean;
  isBendahara: boolean;
  canApprove: boolean;
  canDisburse: boolean;
  canManageSettings: boolean;
  canAccessUnit: (unitId: string) => boolean;
  canManageDraft: (submissionUnitId: string, submissionStatus: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      try {
        const { data, error } = await supabase
          .from('app_users')
          .select('*, units(name)')
          .order('role', { ascending: true });

        if (error) {
          console.error('Error fetching app_users:', error);
          const fallbackUser: AppUser = {
            id: 'bendahara-default',
            email: 'bendahara@alquraniyyah.sch.id',
            full_name: 'Bendahara Umum Yayasan',
            role: 'BENDAHARA',
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
            role: (u.role === 'ADMIN' ? 'BENDAHARA' : u.role) as UserRole,
            unit_id: u.unit_id,
            unit_name: u.units?.name,
            is_active: u.is_active,
            created_at: u.created_at
          }));
          setUsersList(mappedUsers);

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
    const match = usersList.find(u => {
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

  const isOperator = currentUser?.role === 'OPERATOR';
  const isBendahara = currentUser?.role === 'BENDAHARA' || currentUser?.role === 'ADMIN';
  const canApprove = isBendahara;
  const canDisburse = isBendahara || currentUser?.role === 'PENGELUARAN';
  const canManageSettings = isBendahara;

  // Strict RBAC: Operator can only access their unit
  const canAccessUnit = (unitId: string): boolean => {
    if (!currentUser) return false;
    if (isBendahara) return true;
    return currentUser.unit_id === unitId;
  };

  const canManageDraft = (submissionUnitId: string, submissionStatus: string): boolean => {
    if (!currentUser) return false;
    if (submissionStatus !== 'Draft') return false;
    if (isBendahara) return true;
    return currentUser.unit_id === submissionUnitId;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        usersList,
        setCurrentUser: handleSetCurrentUser,
        switchUserRole,
        isLoading,
        isOperator,
        isBendahara,
        canApprove,
        canDisburse,
        canManageSettings,
        canAccessUnit,
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
