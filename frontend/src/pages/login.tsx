import React from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/auth";
import loginImage from "@/images/loginPhoto.avif";

// Import shadcn components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    const result = await login(email, password);

    if (!result.success) {
      setError(result.error || "Login failed");
    }
  };

  return (
    <div className="flex h-screen">
      <div className="w-1/2 bg-gray-100 flex items-center justify-center">
        <Card className="w-3/4 max-w-md">
          <CardHeader>
            <CardTitle className="text-3xl font-raleway">Login</CardTitle>
            <CardDescription className="font-bitter">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full col font-bitter"
                  disabled={isLoading}
                  style={{ backgroundColor: "#C08C2D", color: "white" }}
                >
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
              </div>
            </form>
          </CardContent>

          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground font-bitter">
              Don't have an account?
              <Link
                to="/register"
                className="text-primary font-medium hover:underline ml-2 font-bitter"
              >
                Register
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>

      <div
        className="w-1/2 bg-cover bg-center rounded-lg flex items-center justify-center"
        style={{ backgroundImage: `url(${loginImage})` }}
      >
        <div className="p-6 backdrop-blur-sm bg-black/30 rounded-lg">
          <div className="flex flex-col gap-4 text-center">
            <p className="text-white text-4xl font-raleway">
              Intelligent Learning
            </p>
            <p className="text-white text-4xl font-raleway">
              Limitless Possibilities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
