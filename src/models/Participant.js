import mongoose from "mongoose";

const ParticipantSchema = new mongoose.Schema({
  participant_id: { type: String, required: true },
  session_id: { type: String, required: true, unique: true },
  condition_order: { type: String, enum: ["rotation_first", "mirror_first"], required: true },
  handedness: { type: String },
  mouse_experience: { type: String },
  created_at: { type: Date, default: Date.now },
});

export default mongoose.models.Participant || mongoose.model("Participant", ParticipantSchema);
