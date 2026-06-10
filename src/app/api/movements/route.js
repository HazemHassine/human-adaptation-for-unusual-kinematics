import dbConnect from "@/lib/mongodb";
import Movement from "@/models/Movement";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    await dbConnect();
    const data = await req.json();
    // Allow saving an array of movements in one batch
    if (Array.isArray(data)) {
      const movements = await Movement.insertMany(data);
      return NextResponse.json({ success: true, count: movements.length }, { status: 201 });
    } else {
      const movement = await Movement.create(data);
      return NextResponse.json({ success: true, data: movement }, { status: 201 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
