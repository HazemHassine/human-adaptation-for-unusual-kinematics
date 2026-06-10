import dbConnect from "@/lib/mongodb";
import Trial from "@/models/Trial";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    await dbConnect();
    const data = await req.json();
    // Allow saving an array of trials
    if (Array.isArray(data)) {
      const trials = await Trial.insertMany(data);
      return NextResponse.json({ success: true, count: trials.length }, { status: 201 });
    } else {
      const trial = await Trial.create(data);
      return NextResponse.json({ success: true, data: trial }, { status: 201 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
