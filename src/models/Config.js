import mongoose from "mongoose";

const BlockSchema = new mongoose.Schema({
  id: { type: String, required: true },
  mapping: { type: String }, // Legacy compatibility fallback
  mapping_type: { type: String, enum: ["identity", "rotation", "mirror", "shear", "gain_anisotropy", "position_dependent"], default: "identity" },
  mapping_params: {
    rotation_angle: { type: Number, default: 0 },
    mirror_axis: { type: String, enum: ["horizontal", "vertical", "both", "none"], default: "none" },
    shear_factor: { type: Number, default: 0 },
    gain_factor: { type: Number, default: 1.0 },
    position_coefficient: { type: Number, default: 0 }
  },
  task_type: { type: String, enum: ["reaching", "tracking"], default: "reaching" },
  trials: { type: Number, required: true },
  condition: { type: String, required: true }
});

const QuestionnaireFieldSchema = new mongoose.Schema({
  id: { type: String, required: true },
  question: { type: String, required: true },
  type: { type: String, enum: ["text", "select", "number"], required: true },
  options: [{ type: String }] // only used if type === 'select'
});

const ConfigSchema = new mongoose.Schema({
  singleton: { type: String, default: "default", unique: true }, // ensure only one document
  blocks: [BlockSchema],
  questionnaire: [QuestionnaireFieldSchema]
});

export default mongoose.models.Config || mongoose.model("Config", ConfigSchema);
