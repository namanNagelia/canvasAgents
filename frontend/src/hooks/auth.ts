import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
const API_URL = import.meta.env.VITE_API_URL;

export const useAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);
  const [bearerToken, setBearerToken] = useState<string | null>(null);
  const navigate = useNavigate();

  // Function to check authentication status
  const checkAuth = async () => {
    try {
      setIsLoading(true);

      // Since we're using httpOnly cookies, we need to check auth state through API
      const response = await fetch(`${API_URL}/api/auth/protected`, {
        method: "GET",
        credentials: "include", // This is crucial for sending cookies
        headers: {
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsLoggedIn(true);
        setUser(data.user);
        setBearerToken(data.bearerToken);
        return true;
      } else {
        setIsLoggedIn(false);
        setUser(null);
        setBearerToken(null);
        return false;
      }
    } catch (error) {
      console.error("Authentication error:", error);
      setIsLoggedIn(false);
      setUser(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    // We're checking an httpOnly cookie on the server, not relying on the local cookie
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Important for setting cookies
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        // After login, verify auth state
        const authSuccess = await checkAuth();

        if (authSuccess) {
          navigate("/dashboard");
          return { success: true };
        } else {
          return {
            success: false,
            error: "Failed to authenticate after login",
          };
        }
      } else {
        const data = await response.json();
        return { success: false, error: data.detail || "Login failed" };
      }
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "An error occurred during login" };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/api/auth/logout`, {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        setIsLoggedIn(false);
        setUser(null);
        navigate("/login");
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Manual function to force check authentication
  const refreshAuth = async () => {
    return await checkAuth();
  };

  return {
    isLoggedIn,
    isLoading,
    user,
    login,
    logout,
    refreshAuth,
    bearerToken,
  };
};
