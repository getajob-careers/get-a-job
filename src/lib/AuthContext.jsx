import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

// Exported so DEV-gated preview harnesses can wrap children in their own
// AuthContext.Provider to stub a fixture user. Not consumed by any prod
// code path beyond useAuth() below.
export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Use onAuthStateChange exclusively — the INITIAL_SESSION event fires on subscription
    // and gives us the current session without a separate getSession() race condition.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          setUser(session.user);
          setIsAuthenticated(true);
          setAuthError(null);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
        // Mark loading done after the first event (INITIAL_SESSION or SIGNED_OUT)
        setIsLoadingAuth(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const logout = async (shouldRedirect = true) => {
    await supabase.auth.signOut();
    if (shouldRedirect && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  };

  const navigateToLogin = () => {
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings: false, // Legacy support
      authError,
      appPublicSettings: null, // Legacy support
      logout,
      navigateToLogin,
      checkAppState: () => {} // Legacy support
    }}>
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
