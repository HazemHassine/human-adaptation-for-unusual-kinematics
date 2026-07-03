import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { password } = await req.json();
    const correctPassword = process.env.ADMIN_PASSWORD || "SRM2026";
    
    if (password.trim().toUpperCase() === correctPassword.toUpperCase()) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: "Invalid password" }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: "Authentication failed" }, { status: 500 });
  }
}
