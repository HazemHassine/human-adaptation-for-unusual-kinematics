import mongoose from "mongoose";

const BlockSchema = new mongoose.Schema({
  id: { type: String, required: true },
  mapping: { type: String, required: true },
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
