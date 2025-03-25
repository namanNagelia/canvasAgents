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
      <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[10px] opacity-50">
          <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-blue-500/30 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-1/4 left-1/2 w-64 h-64 bg-emerald-500/20 rounded-full filter blur-3xl animate-pulse delay-2000"></div>
        </div>
      </div>

      <div className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            Canvas AI
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-300 leading-relaxed">
            Transform your ideas into reality with our intelligent AI-powered
            platform. Create, collaborate, and innovate with ease.
          </p>
          <div className="space-y-4">
            <Button
              onClick={handleGetStarted}
              className="px-8 py-6 text-lg bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl rounded-xl"
            >
              {isLoggedIn ? "Go to Dashboard" : "Get Started"}
            </Button>
            <p className="text-sm text-gray-400 mt-4">
              Experience the future of AI-assisted education
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="p-6 rounded-xl bg-gray-800/50 backdrop-blur-sm border border-gray-700">
              <h3 className="text-lg font-semibold text-blue-400 mb-2">
                Smart Agents
              </h3>
              <p className="text-gray-400">
                Leverage powerful AI agents to assist with your creative process
              </p>
            </div>
            <div className="p-6 rounded-xl bg-gray-800/50 backdrop-blur-sm border border-gray-700">
              <h3 className="text-lg font-semibold text-emerald-400 mb-2">
                Fits all Learning Styles
              </h3>
              <p className="text-gray-400">
                Understand and learn from your own style
              </p>
            </div>
            <div className="p-6 rounded-xl bg-gray-800/50 backdrop-blur-sm border border-gray-700">
              <h3 className="text-lg font-semibold text-purple-400 mb-2">
                Customizable
              </h3>
              <p className="text-gray-400">
                Tailor the canvas to your specific needs
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
