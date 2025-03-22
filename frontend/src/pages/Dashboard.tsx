import { useState } from "react";
import { useAuth } from "../hooks/auth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { logout, isLoggedIn, bearerToken } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();
  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <Button onClick={logout} variant="destructive">
            Logout
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white shadow-sm rounded-lg">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              {["overview", "examples", "settings"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-6 font-medium text-sm capitalize ${
                    activeTab === tab
                      ? "border-b-2 border-blue-500 text-blue-600"
                      : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab content */}
          <div className="p-6">
            {activeTab === "overview" && (
              <div>
                <h2 className="text-lg font-medium mb-4">
                  Welcome to Your Dashboard
                </h2>
                <p>Bearer Token: {bearerToken}</p>
                <p className="text-gray-600 mb-4">
                  This is your personal dashboard where you can manage your
                  projects and settings.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  {[
                    {
                      title: "Projects",
                      count: 12,
                      color: "bg-blue-100 text-blue-800",
                    },
                    {
                      title: "Tasks",
                      count: 42,
                      color: "bg-green-100 text-green-800",
                    },
                    {
                      title: "Completed",
                      count: 8,
                      color: "bg-purple-100 text-purple-800",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className={`${item.color} p-4 rounded-lg shadow-sm`}
                    >
                      <h3 className="font-medium">{item.title}</h3>
                      <p className="text-2xl font-bold">{item.count}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "examples" && (
              <div>
                <h2 className="text-lg font-medium mb-4">Example Code</h2>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto">
                  <pre className="whitespace-pre-wrap text-sm font-mono"></pre>
                </div>
                <div className="mt-6">
                  <h3 className="font-medium mb-2">Example API Endpoints</h3>
                  <ul className="list-disc pl-5 text-gray-600">
                    <li className="mb-1">GET /api/data - Fetch all data</li>
                    <li className="mb-1">POST /api/data - Create new data</li>
                    <li className="mb-1">PUT /api/data/:id - Update data</li>
                    <li className="mb-1">DELETE /api/data/:id - Delete data</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div>
                <h2 className="text-lg font-medium mb-4">Settings</h2>
                <p className="text-gray-600 mb-4">
                  Configure your account settings and preferences.
                </p>
                <div className="mt-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Notifications
                    </label>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 rounded"
                        id="notifications"
                        defaultChecked
                      />
                      <label
                        htmlFor="notifications"
                        className="ml-2 text-sm text-gray-600"
                      >
                        Receive email notifications
                      </label>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Theme
                    </label>
                    <select className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                      <option>Light</option>
                      <option>Dark</option>
                      <option>System</option>
                    </select>
                  </div>
                  <Button className="mt-4">Save Settings</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
