import dbConnect from "@/lib/mongodb";
import Participant from "@/models/Participant";
import Trial from "@/models/Trial";
import Movement from "@/models/Movement";
import Questionnaire from "@/models/Questionnaire";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "participants") {
      const participants = await Participant.aggregate([
        {
          $lookup: {
            from: "questionnaires",
            localField: "participant_id",
            foreignField: "participant_id",
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
    }
    
    if (action === "aggregate_stats") {
      // Very basic aggregation: average reaction time and success rate
      const stats = await Trial.aggregate([
        {
          $group: {
            _id: null,
            avg_reaction_time: { $avg: "$reaction_time_ms" },
            avg_movement_time: { $avg: "$movement_time_ms" },
            success_rate: { $avg: "$success" }
          }
        }
      ]);
      const totalParticipants = await Participant.countDocuments();
      const totalTrials = await Trial.countDocuments();
      return NextResponse.json({ success: true, data: { stats: stats[0], totalParticipants, totalTrials } }, { status: 200 });
    }

    if (action === "device_stats") {
      const breakdown = await Trial.aggregate([
        {
          $lookup: {
            from: "participants",
            localField: "session_id",
            foreignField: "session_id",
            as: "pinfo"
          }
        },
        {
          $unwind: {
            path: "$pinfo",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $group: {
            _id: { $ifNull: ["$pinfo.input_device", "mouse"] },
            avg_movement_time: { $avg: "$movement_time_ms" },
            avg_reaction_time: { $avg: "$reaction_time_ms" },
            avg_rmse: { $avg: "$tracking_rmse_px" },
            total_trials: { $sum: 1 }
          }
        }
      ]);
      return NextResponse.json({ success: true, data: breakdown }, { status: 200 });
    }

    if (action === "participant_movements") {
      const participant_id = searchParams.get("participant_id");
      if (!participant_id) throw new Error("participant_id is required");
      
      const movements = await Movement.find({ participant_id }).sort({ timestamp_ms: 1 });
      const trials = await Trial.find({ participant_id }).sort({ _id: 1 });
      const questionnaire = await Questionnaire.findOne({ participant_id });
      
      return NextResponse.json({ success: true, data: { movements, trials, questionnaire } }, { status: 200 });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(req) {
  try {
    await dbConnect();
    await Participant.deleteMany({});
    await Trial.deleteMany({});
    await Movement.deleteMany({});
    await Questionnaire.deleteMany({});
    return NextResponse.json({ success: true, message: "Database reset complete." }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

