import { useAuth } from "../hooks/auth";
import { useNavigate } from "react-router-dom";
import {
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/appSidebar";
import { Menu } from "lucide-react";
import { CenterChat } from "@/components/centerChat";
import { useState } from "react";
import { ExistingChat } from "@/components/exisitngChat";

export default function Dashboard() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Function to handle setting current session with loading state
  const handleSetCurrentSession = (sessionId: string | null) => {
    setIsLoading(true);
    setCurrentSession(sessionId);

    // Give a short delay to allow component transition
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  if (!isLoggedIn) {
    navigate("/login");
    return null;
  }

  return (
    <SidebarProvider>
      <div className="h-screen w-screen overflow-hidden flex">
        <SidebarWrapper setCurrentSession={handleSetCurrentSession} />
        <MainContent
          currentSession={currentSession}
          setCurrentSession={handleSetCurrentSession}
          isLoading={isLoading}
        />
      </div>
    </SidebarProvider>
  );
}

function SidebarWrapper({
  setCurrentSession,
}: {
  setCurrentSession: (id: string | null) => void;
}) {
  const { open } = useSidebar();

  return (
    <div
      className={`h-full transition-all duration-300 ease-in-out ${
        open ? "w-[var(--sidebar-width)]" : "w-0"
      }`}
    >
      <AppSidebar setCurrentSession={setCurrentSession} />
    </div>
  );
}

function MainContent({
  currentSession,
  setCurrentSession,
  isLoading,
}: {
  currentSession: string | null;
  setCurrentSession: (id: string | null) => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex-1 relative">
      <div className="absolute top-4 left-4 z-10">
        <SidebarTrigger className="hover:cursor-pointer bg-white dark:bg-gray-800 rounded-md p-2 shadow-sm">
          <Menu className="h-6 w-6" />
        </SidebarTrigger>
      </div>

      <div className="h-full w-full flex items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Loading session...
            </p>
          </div>
        ) : !currentSession ? (
          <CenterChat setCurrentSession={setCurrentSession} />
        ) : (
          <ExistingChat sessionId={currentSession} />
        )}
      </div>
    </div>
  );
}
