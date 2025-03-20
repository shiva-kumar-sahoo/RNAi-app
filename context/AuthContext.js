import { createContext, useEffect, useState } from "react";
import { getTokenService } from "../services/authServices";

export const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [location, setLocation] = useState("");

  const checkLoginStatus = async () => {
    console.log("Checking login status");

    setIsLoading(true);
    try {
      const token = await getTokenService();
      console.log("Token:", token);
      setIsLoggedIn(!!token);
    } catch (error) {
      console.log("Token check failed", error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    checkLoginStatus();
  }, []);
  return (
    <AuthContext.Provider
      value={{
        isLoading,
        setIsLoading,
        isLoggedIn,
        setIsLoggedIn,
        location,
        setLocation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
