import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface User {
  id: string;
  name: string;
  email: string;
}

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  useEffect(() => {
    // If not loading and no user data, redirect to login
    if (!isLoading && (!user || error)) {
      setLocation('/login');
    }
  }, [user, isLoading, error, setLocation]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If no user, return null (redirect happens in useEffect)
  if (!user || error) {
    return null;
  }

  // User is authenticated, render protected content
  return <>{children}</>;
}