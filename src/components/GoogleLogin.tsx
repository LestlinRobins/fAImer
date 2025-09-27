// src/components/GoogleLogin.tsx

import React from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Chrome } from "lucide-react";

interface GoogleLoginProps {
  // onSuccess and onError are removed
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  text?: string;
}

const GoogleLogin: React.FC<GoogleLoginProps> = ({
  className = "",
  variant = "outline",
  size = "default",
  showIcon = true,
  text = "Continue with Google",
}) => {
  const { signInWithGoogleFirebase, loading } = useAuth();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={signInWithGoogleFirebase}
      disabled={loading}
      className={`transition-all duration-200 ${className}`}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : showIcon ? (
        <Chrome className="w-4 h-4 mr-2" />
      ) : null}
      {loading ? "Redirecting..." : text}
    </Button>
  );
};

export default GoogleLogin;
