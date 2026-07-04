import mongoose from "mongoose";

const BlockSchema = new mongoose.Schema({
  id: { type: String, required: true },
  block_type: { type: String, enum: ["practice", "baseline", "adaptation", "aftereffect", "questionnaire"], default: "baseline" },
  mapping: { type: String }, // Legacy compatibility fallback
  mapping_type: { type: String, enum: ["identity", "rotation", "mirror", "shear", "gain_anisotropy", "position_dependent"], default: "identity" },
  mapping_params: {
    base_rotation_angle_deg: { type: Number, default: 0 },
    rotation_noise_deg: { type: Number, default: 0 },
    rotation_angle: { type: Number, default: 0 }, // Legacy
    mirror_axis: { type: String, enum: ["horizontal", "vertical", "both", "none"], default: "none" },
    shear_factor: { type: Number, default: 0 },
    gain_factor: { type: Number, default: 1.0 },
    position_coefficient: { type: Number, default: 0 }
  },
  task_type: { type: String, enum: ["reaching", "tracking"], default: "reaching" },
  path_type: { type: String, enum: ["none", "straight", "sine"], default: "none" },
  target_distance_px: { type: Number, default: 150 }, // Legacy fallback
  min_target_distance_px: { type: Number, default: 150 },
  max_target_distance_px: { type: Number, default: 150 },
  randomize_target_distance: { type: Boolean, default: false },
  min_target_angle_deg: { type: Number, default: 0 },
  max_target_angle_deg: { type: Number, default: 360 },
  randomize_target_angle: { type: Boolean, default: false }, // Legacy
  target_angle_mode: { type: String, enum: ["random_cardinal", "fixed_cardinal", "random_range"], default: "random_cardinal" },
  fixed_target_angle_deg: { type: Number, default: 0 },
  normalized_target_distance: { type: Number, default: 1.0 },
  wave_amplitude: { type: Number, default: 30 },
  wave_frequency: { type: Number, default: 1.5 }, // Legacy fallback
  min_wave_frequency: { type: Number, default: 1.5 },
  max_wave_frequency: { type: Number, default: 1.5 },
  wave_frequency_noise: { type: Number, default: 0 },
  require_return_to_start: { type: Boolean, default: true },
  trials: { type: Number, required: true },
  condition: { type: String, required: true }
});

const QuestionnaireFieldSchema = new mongoose.Schema({
  id: { type: String, required: true },
  question: { type: String, required: true },
  question_de: { type: String },
  type: { type: String, enum: ["text", "select", "number"], required: true },
  options: [{ type: String }], // only used if type === 'select'
  options_de: [{ type: String }] // only used if type === 'select'
});

const ConfigSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, default: "Default Setup" },
  isActive: { type: Boolean, default: false },
  blocks: [BlockSchema],
  questionnaire: [QuestionnaireFieldSchema],
  courseName: { type: String, default: "Scientific Research Methods: Foundations & Techniques" },
  universityName: { type: String, default: "Bielefeld University" },
  contactEmail: { type: String, default: "mohamed.hassine@uni-bielefeld.de" }
});

export default mongoose.models.Config || mongoose.model("Config", ConfigSchema);
