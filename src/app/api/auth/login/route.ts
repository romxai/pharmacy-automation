import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { key } = await req.json();
    const validKey = process.env.ACCESS_KEY || "pharmacy123"; // Default fallback for development

    if (key === validKey) {
      const response = NextResponse.json({ success: true });

      // Set a secure, HTTP-only cookie for authentication
      response.cookies.set({
        name: "authenticated",
        value: "true",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/",
      });

      return response;
    } else {
      return NextResponse.json(
        { message: "Invalid access key" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Authentication error:", error);
    return NextResponse.json(
      { message: "An error occurred during authentication" },
      { status: 500 }
    );
  }
}
