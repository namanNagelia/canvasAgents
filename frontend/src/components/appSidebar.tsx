import { Home, LogOut, MessageCircle } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/auth";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

// Menu items
const items = [
  {
    title: "Home",
    url: "/dashboard",
    icon: Home,
  },
];

// Utility function to truncate text
const truncateText = (text: string, maxLength: number = 30) => {
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
};

export function AppSidebar({
  setCurrentSession,
}: {
  setCurrentSession: (id: string | null) => void;
}) {
  const { logout, user, bearerToken } = useAuth();

  const [sessionHistory, setSessionHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchSessionHistory = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/agents/get_session_history`,
          {
            headers: {
              Authorization: `Bearer ${bearerToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch session history");
        }

        const data = await response.json();
        setSessionHistory(data);
      } catch (error) {
        console.error("Error fetching session history:", error);
      }
    };

    fetchSessionHistory();
  }, [bearerToken]);

  const handleSessionSelect = (sessionId: string) => {
    setCurrentSession(sessionId);
  };

  return (
    <Sidebar className="border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xl font-bold px-4 pt-4 pb-2 text-gray-900 dark:text-white">
            Learn AI
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a
                      href={item.url}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-md text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-black dark:hover:text-white transition-colors font-medium"
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-xl font-bold px-4 pt-4 pb-2 text-gray-900 dark:text-white">
            Recent Sessions
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sessionHistory.map((session) => {
                const firstUserInput =
                  session.user_input?.[0]?.message || "Untitled Session";

                return (
                  <SidebarMenuItem key={session.id}>
                    <SidebarMenuButton asChild>
                      <div
                        onClick={() => handleSessionSelect(session.id)}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-md text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-black dark:hover:text-white transition-colors font-medium cursor-pointer"
                      >
                        <MessageCircle className="h-5 w-5 text-gray-500" />
                        <span className="truncate">
                          {truncateText(firstUserInput)}
                        </span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="mt-auto p-4 border-t border-gray-200 dark:border-gray-800">
        <Button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium py-2"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
