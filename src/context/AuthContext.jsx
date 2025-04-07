import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    fetchSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    signIn: async (email, password) => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          console.error("Sign in error:", error.message);
          throw new Error(getAuthErrorMessage(error.message));
        }
        return data.user;
      } catch (error) {
        console.error("Sign in failed:", error);
        throw error;
      }
    },

    signUp: async (email, password) => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
          },
        });
        if (error) {
          console.error("Sign up error:", error.message);
          throw new Error(getAuthErrorMessage(error.message));
        }
        return data.user;
      } catch (error) {
        console.error("Sign up failed:", error);
        throw error;
      }
    },

    signOut: async () => {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      } catch (error) {
        console.error("Sign out error:", error.message);
        throw new Error("Failed to sign out. Please try again.");
      }
    },

    resetPassword: async (email) => {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) {
          console.error("Password reset error:", error.message);
          throw new Error(getAuthErrorMessage(error.message));
        }
      } catch (error) {
        console.error("Password reset failed:", error);
        throw error;
      }
    },

    updatePassword: async (newPassword) => {
      try {
        const { data, error } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (error) {
          console.error("Password update error:", error.message);
          throw new Error(getAuthErrorMessage(error.message));
        }
        return data.user;
      } catch (error) {
        console.error("Password update failed:", error);
        throw error;
      }
    },

    user,
  };

  // Helper function for user-friendly error messages
  function getAuthErrorMessage(error) {
    const messages = {
      "Invalid login credentials": "Wrong email or password. Please try again.",
      "Email not confirmed": "Please confirm your email before signing in.",
      "User already registered": "This email is already registered.",
      "Weak password": "Password must be at least 6 characters long.",
      "For security purposes, you can only request this once every 60 seconds":
        "Please wait a minute before trying again.",
    };
    return messages[error] || error;
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
