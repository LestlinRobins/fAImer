import React, { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser } from "firebase/auth";
import {
  auth,
  signInWithGoogle as firebaseSignInWithGoogle,
  logout as firebaseLogout,
} from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signInWithGoogleFirebase: () => Promise<FirebaseUser>;
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
    // Listen for Firebase auth changes
    const unsubscribeFirebase = onAuthStateChanged(auth, (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      setLoading(false);
    });

    return () => {
      unsubscribeFirebase();
    };
  }, []);

  const value: AuthContextType = {
    firebaseUser,
    loading,
    signInWithGoogleFirebase: async () => {
      const firebaseUser = await firebaseSignInWithGoogle();
      return firebaseUser;
    },
    signOut: async () => {
      if (firebaseUser) {
        await firebaseLogout();
      }
      setFirebaseUser(null);
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
