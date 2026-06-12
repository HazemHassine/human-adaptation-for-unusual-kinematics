import mongoose from "mongoose";

const TrialSchema = new mongoose.Schema({
  participant_id: { type: String, required: true },
  session_id: { type: String, required: true },
  condition: { type: String },
  block_id: { type: String },
  mapping_type: { type: String },
  task_type: { type: String, enum: ["reaching", "tracking"], default: "reaching" },
  trial_id: { type: Number },
  target_angle_deg: { type: Number },
  target_distance_px: { type: Number },
  reaction_time_ms: { type: Number },
  movement_time_ms: { type: Number },
  success: { type: Number },
  initial_direction_error_deg: { type: Number },
  endpoint_error_px: { type: Number },
  path_length_px: { type: Number },
  straightness_ratio: { type: Number },
  num_direction_reversals: { type: Number },
  tracking_rmse_px: { type: Number },
  ideal_path_points: [{ x: Number, y: Number }],
});

export default mongoose.models.Trial || mongoose.model("Trial", TrialSchema);
