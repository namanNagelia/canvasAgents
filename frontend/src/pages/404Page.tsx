import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <div className="w-full max-w-md mx-auto text-center">
        <h1
          className="text-9xl font-bold tracking-tighter"
          style={{ color: "#C08C2D" }}
        >
          404
        </h1>

        <div
          className="h-2 w-24 mx-auto my-6"
          style={{ backgroundColor: "#C08C2D" }}
        ></div>

        <h2 className="text-3xl font-semibold mb-4">Page Not Found</h2>

        <p className="text-gray-400 mb-8">
          The page you are looking for might have been removed, had its name
          changed, or is temporarily unavailable.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => navigate(-1)}
            className="px-6 py-2 border border-gray-600 rounded-md hover:bg-gray-800"
          >
            Go Back
          </Button>

          <Button
            onClick={() => navigate("/")}
            className="px-6 py-2 rounded-md"
            style={{ backgroundColor: "#C08C2D", color: "white" }}
          >
            Return Home
          </Button>
        </div>
      </div>
    </div>
  );
}
