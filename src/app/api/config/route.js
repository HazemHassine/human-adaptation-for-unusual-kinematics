import dbConnect from "@/lib/mongodb";
import Config from "@/models/Config";
import { NextResponse } from "next/server";

const DEFAULT_BLOCKS = [
  { id: "practice", mapping: "identity", trials: 5, condition: "none" },
  { id: "baseline_rotation", mapping: "identity", trials: 10, condition: "rotation" },
  { id: "adapt_rotation", mapping: "rotation_45", trials: 20, condition: "rotation" },
  { id: "perturb_rotation", mapping: "rotation_60", trials: 10, condition: "rotation" },
  { id: "washout_rotation", mapping: "identity", trials: 10, condition: "rotation" },
  { id: "baseline_mirror", mapping: "identity", trials: 10, condition: "mirror" },
  { id: "adapt_mirror", mapping: "mirror_horizontal", trials: 20, condition: "mirror" },
  { id: "washout_mirror", mapping: "identity", trials: 10, condition: "mirror" },
];

const DEFAULT_QUESTIONNAIRE = [
  { id: "q_how_understand", question: "How did you try to understand the changed mouse behavior?", type: "text", options: [] },
  { id: "q_mapping_awareness", question: "What mappings did you notice?", type: "select", options: ["Rotation", "Mirror", "Both", "None"] },
];

export async function GET() {
  try {
    await dbConnect();
    let config = await Config.findOne({ singleton: "default" });
    if (!config) {
      config = await Config.create({
        singleton: "default",
        blocks: DEFAULT_BLOCKS,
        questionnaire: DEFAULT_QUESTIONNAIRE,
      });
    }
    return NextResponse.json({ success: true, data: config }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(req) {
  try {
    await dbConnect();
    const data = await req.json();
    const config = await Config.findOneAndUpdate(
      { singleton: "default" },
      { $set: { blocks: data.blocks, questionnaire: data.questionnaire } },
      { new: true, upsert: true }
    );
    return NextResponse.json({ success: true, data: config }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
