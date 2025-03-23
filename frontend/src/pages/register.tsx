import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch("http://localhost:8000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      if (response.ok) {
        const loginResult = await login(email, password);
        if (loginResult.success) {
          navigate("/dashboard");
        } else {
          navigate("/login");
        }
      } else {
        const data = await response.json();
        setError(data.detail || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      setError("An error occurred during registration");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen">
      <div className="w-1/2 bg-gray-100 flex items-center justify-center">
        <Card className="w-3/4 max-w-md">
          <CardHeader>
            <CardTitle className="text-3xl font-raleway">Register</CardTitle>
            <CardDescription className="font-bitter">
              Create an account to get started
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
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>

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

                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full font-bitter"
                  disabled={isLoading}
                  style={{ backgroundColor: "#C08C2D", color: "white" }}
                >
                  {isLoading ? "Registering..." : "Register"}
                </Button>
              </div>
            </form>
          </CardContent>

          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground font-bitter">
              Already have an account?
              <Link
                to="/login"
                className="text-primary font-medium hover:underline ml-2 font-bitter"
              >
                Login
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
