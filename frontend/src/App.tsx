import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "./hooks/auth";

function App() {
  const { isLoggedIn, isLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if logged in
  useEffect(() => {
    if (isLoggedIn && !isLoading) {
      navigate("/dashboard");
    }
  }, [isLoggedIn, isLoading, navigate]);

  const handleGetStarted = () => {
    if (isLoggedIn) {
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  };

  // If still loading, show a loading spinner
  if (isLoading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-gray-500">
      <div className="text-center text-white">
        <h1 className="text-4xl font-bold mb-4">
          Welcome to Agentic AI Canvas
        </h1>
        <p className="mb-8 text-xl">
          Your intelligent platform for creating amazing things
        </p>
        <Button onClick={handleGetStarted} className="px-6 py-2 text-lg">
          {isLoggedIn ? "Go to Dashboard" : "Get Started"}
        </Button>
      </div>
    </div>
  );
}

export default App;
