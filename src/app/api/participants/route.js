import dbConnect from "@/lib/mongodb";
import Participant from "@/models/Participant";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    await dbConnect();
    const data = await req.json();
    const participant = await Participant.create(data);
    return NextResponse.json({ success: true, data: participant }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function GET() {
  try {
    await dbConnect();
    const participants = await Participant.aggregate([
      {
        $lookup: {
          from: "questionnaires",
          localField: "session_id",
          foreignField: "session_id",
          as: "qData"
        }
      },
      {
        $addFields: {
          finished: { $gt: [{ $size: "$qData" }, 0] }
        }
      },
      {
        $project: {
          qData: 0
        }
      },
      {
        $sort: { created_at: -1 }
      }
    ]);
    return NextResponse.json({ success: true, data: participants }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
