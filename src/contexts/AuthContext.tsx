// src/contexts/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User as FirebaseUser,
  onAuthStateChanged,
  getRedirectResult, // Import for handling redirect
  signInWithRedirect, // Import for starting redirect
  GoogleAuthProvider, // Import the provider
} from "firebase/auth";
import { auth, logout as firebaseLogout } from "@/lib/firebase";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  loading: boolean; // This function's signature changes: it no longer returns a user
  signInWithGoogleFirebase: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for a redirect result when the component mounts
    getRedirectResult(auth).catch((error) => {
      console.error("🔥 Firebase redirect error:", error);
    }); // Listen for Firebase auth changes (your existing logic)

    const unsubscribeFirebase = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setLoading(false);
    });

    return () => unsubscribeFirebase();
  }, []);

  const value: AuthContextType = {
    firebaseUser,
    loading, // This function now triggers the redirect away from your app
    signInWithGoogleFirebase: async () => {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider);
    }, // Sign out logic
    signOut: async () => {
      await firebaseLogout();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
