"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [accessKey, setAccessKey] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key: accessKey }),
      });

      const data = await response.json();

      if (response.ok) {
        // The cookie is set by the server, just redirect
        router.push("/dashboard");
      } else {
        setError(data.message || "Invalid access key");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 p-8 rounded-xl border border-border bg-card shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            Pharmacy Inventory System
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your access key to continue
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="accessKey"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Access Key
            </label>
            <input
              id="accessKey"
              name="accessKey"
              type="password"
              required
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter your access key"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
            />
          </div>

          {error && (
            <div className="p-3 bg-destructive/20 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Verifying..." : "Login"}
          </Button>
        </form>
      </div>
    </div>
  );
}
