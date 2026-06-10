import mongoose from "mongoose";

const MovementSchema = new mongoose.Schema({
  participant_id: { type: String, required: true },
  session_id: { type: String, required: true },
  condition: { type: String },
  block_id: { type: String },
  mapping_type: { type: String },
  trial_id: { type: Number },
  timestamp_ms: { type: Number },
  mouse_x: { type: Number },
  mouse_y: { type: Number },
  mouse_dx: { type: Number },
  mouse_dy: { type: Number },
  cursor_x: { type: Number },
  cursor_y: { type: Number },
  target_x: { type: Number },
  target_y: { type: Number },
  event: { type: String },
});

export default mongoose.models.Movement || mongoose.model("Movement", MovementSchema);
