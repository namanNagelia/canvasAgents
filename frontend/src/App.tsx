import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const API_URL = import.meta.env.VITE_API_URL;
function App() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/hello`);
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const data = await response.json();
        setMessage(data.message);
        setError(null);
      } catch (err) {
        setError("Failed to connect to the backend API");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-gray-500">
      <div className="text-center">
        <h1>Agentic AI Canvas</h1>
        <div className="card">
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p className="error">{error}</p>
          ) : (
            <>
              <p>{message}</p>
              <Button>Click me</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
