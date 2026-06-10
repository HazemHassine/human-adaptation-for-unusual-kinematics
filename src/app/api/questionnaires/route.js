import dbConnect from "@/lib/mongodb";
import Questionnaire from "@/models/Questionnaire";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    await dbConnect();
    const data = await req.json();
    const questionnaire = await Questionnaire.create(data);
    return NextResponse.json({ success: true, data: questionnaire }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
