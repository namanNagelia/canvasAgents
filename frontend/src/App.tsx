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
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#C08C2D] mx-auto"></div>
          <p className="mt-4 text-gray-300 font-bitter">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[10px] opacity-50">
          <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-[#C08C2D]/20 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#C08C2D]/10 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-1/4 left-1/2 w-64 h-64 bg-[#C08C2D]/15 rounded-full filter blur-3xl animate-pulse delay-2000"></div>
        </div>
      </div>

      <div className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-6xl md:text-7xl font-raleway font-bold mb-6 text-white">
            Canvas
            <span className="text-[#C08C2D]"> AI</span>
          </h1>
          <p className="text-xl md:text-2xl mb-12 text-gray-300 leading-relaxed font-bitter">
            Transform your learning journey with intelligent AI-powered
            assistance.
            <br />
            Create, understand, and master any subject with ease.
          </p>

          <Button
            onClick={handleGetStarted}
            className="px-8 py-6 text-lg font-bitter bg-[#C08C2D] hover:bg-[#A77B26] transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl rounded-xl"
          >
            {isLoggedIn ? "Go to Dashboard" : "Get Started"}
          </Button>

          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {[
              {
                title: "Smart Learning Agents",
                description:
                  "Multiple AI agents specialized for different learning styles and needs",
                icon: "🤖",
              },
              {
                title: "Interactive Learning",
                description:
                  "Create flashcards, diagrams, and step-by-step guides instantly",
                icon: "✨",
              },
              {
                title: "Research Assistant",
                description:
                  "Get help with research, note-taking, and understanding complex topics",
                icon: "📚",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-[#C08C2D]/50 transition-all duration-300"
              >
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-[#C08C2D] mb-2 font-raleway">
                  {feature.title}
                </h3>
                <p className="text-gray-400 font-bitter">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          <p className="text-sm text-gray-400 mt-12 font-bitter">
            Join thousands of students revolutionizing their learning experience
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
