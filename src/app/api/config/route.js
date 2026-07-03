import dbConnect from "@/lib/mongodb";
import Config from "@/models/Config";
import { NextResponse } from "next/server";

const DEFAULT_BLOCKS = [
  { 
    id: "baseline_rotation",
    block_type: "baseline",
    mapping: "identity", // fallback
    mapping_type: "identity", 
    mapping_params: { base_rotation_angle_deg: 0, rotation_noise_deg: 0, rotation_angle: 0, mirror_axis: "none", shear_factor: 0, gain_factor: 1.0, position_coefficient: 0 }, 
    task_type: "reaching",
    path_type: "straight",
    min_target_distance_px: 150,
    max_target_distance_px: 150,
    normalized_target_distance: 1.0,
    wave_amplitude: 30,
    wave_frequency: 1.5,
    require_return_to_start: true,
    trials: 5, 
    condition: "rotation" 
  },
  { 
    id: "adapt_rotation", 
    block_type: "adaptation",
    mapping: "rotation_45", // fallback
    mapping_type: "rotation", 
    mapping_params: { base_rotation_angle_deg: 45, rotation_noise_deg: 10, rotation_angle: 45, mirror_axis: "none", shear_factor: 0, gain_factor: 1.0, position_coefficient: 0 }, 
    task_type: "reaching",
    path_type: "straight",
    min_target_distance_px: 150,
    max_target_distance_px: 150,
    normalized_target_distance: 1.0,
    wave_amplitude: 30,
    wave_frequency: 1.5,
    require_return_to_start: true,
    trials: 20, 
    condition: "rotation" 
  },
  { 
    id: "washout_rotation", 
    block_type: "aftereffect",
    mapping: "identity", // fallback
    mapping_type: "identity", 
    mapping_params: { base_rotation_angle_deg: 0, rotation_noise_deg: 0, rotation_angle: 0, mirror_axis: "none", shear_factor: 0, gain_factor: 1.0, position_coefficient: 0 }, 
    task_type: "reaching",
    path_type: "straight",
    min_target_distance_px: 150,
    max_target_distance_px: 150,
    normalized_target_distance: 1.0,
    wave_amplitude: 30,
    wave_frequency: 1.5,
    require_return_to_start: true,
    trials: 10, 
    condition: "rotation" 
  },
  { 
    id: "baseline_mirror",
    block_type: "baseline",
    mapping: "identity", // fallback
    mapping_type: "identity", 
    mapping_params: { base_rotation_angle_deg: 0, rotation_noise_deg: 0, rotation_angle: 0, mirror_axis: "none", shear_factor: 0, gain_factor: 1.0, position_coefficient: 0 }, 
    task_type: "reaching",
    path_type: "straight",
    min_target_distance_px: 150,
    max_target_distance_px: 150,
    normalized_target_distance: 1.0,
    wave_amplitude: 30,
    wave_frequency: 1.5,
    require_return_to_start: true,
    trials: 5, 
    condition: "mirror" 
  },
  { 
    id: "adapt_mirror", 
    block_type: "adaptation",
    mapping: "mirror_horizontal", // fallback
    mapping_type: "mirror", 
    mapping_params: { base_rotation_angle_deg: 0, rotation_noise_deg: 0, rotation_angle: 0, mirror_axis: "horizontal", shear_factor: 0, gain_factor: 1.0, position_coefficient: 0 }, 
    task_type: "reaching",
    path_type: "straight",
    min_target_distance_px: 150,
    max_target_distance_px: 150,
    normalized_target_distance: 1.0,
    wave_amplitude: 30,
    wave_frequency: 1.5,
    require_return_to_start: true,
    trials: 20, 
    condition: "mirror" 
  },
  { 
    id: "washout_mirror", 
    block_type: "aftereffect",
    mapping: "identity", // fallback
    mapping_type: "identity", 
    mapping_params: { base_rotation_angle_deg: 0, rotation_noise_deg: 0, rotation_angle: 0, mirror_axis: "none", shear_factor: 0, gain_factor: 1.0, position_coefficient: 0 }, 
    task_type: "reaching",
    path_type: "straight",
    min_target_distance_px: 150,
    max_target_distance_px: 150,
    normalized_target_distance: 1.0,
    wave_amplitude: 30,
    wave_frequency: 1.5,
    require_return_to_start: true,
    trials: 10, 
    condition: "mirror" 
  },
  { 
    id: "tracking_baseline", 
    block_type: "baseline",
    mapping: "identity", // fallback
    mapping_type: "identity", 
    mapping_params: { base_rotation_angle_deg: 0, rotation_noise_deg: 0, rotation_angle: 0, mirror_axis: "none", shear_factor: 0, gain_factor: 1.0, position_coefficient: 0 }, 
    task_type: "tracking",
    path_type: "sine",
    min_target_distance_px: 150,
    max_target_distance_px: 150,
    normalized_target_distance: 1.0,
    wave_amplitude: 30,
    wave_frequency: 1.5,
    require_return_to_start: true,
    trials: 5, 
    condition: "none" 
  }
];

const DEFAULT_QUESTIONNAIRE = [
  { id: "q_adaptation_difficulty", question: "How hard was it to adapt? (1 = very easy, 10 = very hard)", type: "number", options: [] },
  { id: "q_strategy_noticed", question: "Did you notice a strategy that helped you?", type: "select", options: ["Yes", "No"] },
  { id: "q_strategy_desc", question: "Describe your strategy briefly.", type: "text", options: [] },
  { id: "q_mapping_awareness", question: "Did the mouse behavior feel random, mirrored, rotated, or something else?", type: "select", options: ["Random", "Mirrored", "Rotated", "Both Mirrored & Rotated", "Something else", "Normal"] },
];

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const all = searchParams.get('all') === 'true';
    const id = searchParams.get('id');

    if (all) {
      const configs = await Config.find({});
      if (configs.length === 0) {
        // Create initial default setup if none exist
        const newConfig = await Config.create({
          name: "Default Setup",
          isActive: true,
          blocks: DEFAULT_BLOCKS,
          questionnaire: DEFAULT_QUESTIONNAIRE,
          courseName: "Scientific Research Methods: Foundations & Techniques",
          universityName: "Bielefeld University",
          contactEmail: "mohamed.hassine@uni-bielefeld.de"
        });
        return NextResponse.json({ success: true, data: [newConfig] }, { status: 200 });
      }
      return NextResponse.json({ success: true, data: configs }, { status: 200 });
    } else if (id) {
      const config = await Config.findById(id);
      return NextResponse.json({ success: true, data: config }, { status: 200 });
    } else {
      // Find active config
      let config = await Config.findOne({ isActive: true });
      if (!config) {
        // Fallback to first available or create
        config = await Config.findOne({});
        if (!config) {
          config = await Config.create({
            name: "Default Setup",
            isActive: true,
            blocks: DEFAULT_BLOCKS,
            questionnaire: DEFAULT_QUESTIONNAIRE,
            courseName: "Scientific Research Methods: Foundations & Techniques",
            universityName: "Bielefeld University",
            contactEmail: "mohamed.hassine@uni-bielefeld.de"
          });
        } else {
          config.isActive = true;
          await config.save();
        }
      }
      return NextResponse.json({ success: true, data: config }, { status: 200 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');
    const data = await req.json();
    
    // Legacy support: if no ID, find the active one to update
    if (!id) {
      let activeConfig = await Config.findOne({ isActive: true });
      if (!activeConfig) activeConfig = await Config.findOne({});
      if (activeConfig) id = activeConfig._id;
      else return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });
    }

    if (data.isActive === true) {
      // Deactivate all others
      await Config.updateMany({ _id: { $ne: id } }, { $set: { isActive: false } });
    }

    const updateObj = {};
    if (data.name !== undefined) updateObj.name = data.name;
    if (data.isActive !== undefined) updateObj.isActive = data.isActive;
    if (data.blocks !== undefined) updateObj.blocks = data.blocks;
    if (data.questionnaire !== undefined) updateObj.questionnaire = data.questionnaire;
    if (data.courseName !== undefined) updateObj.courseName = data.courseName;
    if (data.universityName !== undefined) updateObj.universityName = data.universityName;
    if (data.contactEmail !== undefined) updateObj.contactEmail = data.contactEmail;

    const config = await Config.findByIdAndUpdate(
      id,
      { $set: updateObj },
      { new: true }
    );
    return NextResponse.json({ success: true, data: config }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const data = await req.json();
    
    // Create new configuration
    const configData = {
      name: data.name || `Setup ${Date.now()}`,
      isActive: data.isActive || false,
      blocks: data.blocks !== undefined ? data.blocks : [], // Blank setup by default
      questionnaire: data.questionnaire !== undefined ? data.questionnaire : [], // Blank questionnaire by default
      courseName: data.courseName || "Scientific Research Methods: Foundations & Techniques",
      universityName: data.universityName || "Bielefeld University",
      contactEmail: data.contactEmail || "mohamed.hassine@uni-bielefeld.de"
    };

    if (configData.isActive) {
      await Config.updateMany({}, { $set: { isActive: false } });
    }

    const config = await Config.create(configData);
    return NextResponse.json({ success: true, data: config }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });
    }

    const count = await Config.countDocuments();
    if (count <= 1) {
      return NextResponse.json({ success: false, error: "Cannot delete the last configuration setup." }, { status: 400 });
    }

    const configToDelete = await Config.findById(id);
    if (!configToDelete) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    await Config.findByIdAndDelete(id);

    if (configToDelete.isActive) {
      const nextConfig = await Config.findOne();
      if (nextConfig) {
        nextConfig.isActive = true;
        await nextConfig.save();
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
