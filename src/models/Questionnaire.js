import mongoose from "mongoose";

const QuestionnaireSchema = new mongoose.Schema({
  participant_id: { type: String, required: true },
  session_id: { type: String, required: true },
  condition: { type: String, required: true },
  q_how_understand: { type: String },
  q_discover_rule: { type: String },
  q_trial_error: { type: Number },
  q_mental_rotate: { type: Number },
  q_mirror_movement: { type: Number },
  q_sudden_understand: { type: Number },
  q_mapping_awareness: { type: String },
}, { strict: false });

export default mongoose.models.Questionnaire || mongoose.model("Questionnaire", QuestionnaireSchema);
