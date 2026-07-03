"use client";

import React from "react";
import { Handle, Position } from "@xyflow/react";
import { Play, Trash2 } from "lucide-react";

export default function BlockNode({ id, data }) {
  const { block, updateBlock, deleteBlock, onPreview } = data;

  const handleChange = (field, value) => {
    updateBlock(id, field, value);
  };

  const handleMinMaxChange = (field, value) => {
    const val = Number(value);
    const updates = { [field]: val };
    
    if (field.startsWith('min_')) {
      const maxField = field.replace('min_', 'max_');
      const currentMax = block[maxField] !== undefined ? block[maxField] : 
                         (field.includes('angle') ? 360 : 
                          field.includes('frequency') ? 1.5 : 150);
      if (val > currentMax) {
        updates[maxField] = val;
      }
    } else if (field.startsWith('max_')) {
      const minField = field.replace('max_', 'min_');
      const currentMin = block[minField] !== undefined ? block[minField] : 
                         (field.includes('angle') ? 0 : 
                          field.includes('frequency') ? 1.5 : 150);
      if (val < currentMin) {
        updates[minField] = val;
      }
    }
    
    updateBlock(id, updates);
  };

  const handleParamChange = (paramField, value) => {
    const currentParams = block.mapping_params || {
      rotation_angle: 0,
      mirror_axis: "none",
      shear_factor: 0,
      gain_factor: 1.0,
      position_coefficient: 0
    };
    handleChange("mapping_params", {
      ...currentParams,
      [paramField]: value
    });
  };

  // Get defaults if undefined
  const mappingType = block.mapping_type || "identity";
  const params = block.mapping_params || {
    base_rotation_angle_deg: 0,
    rotation_noise_deg: 0,
    rotation_angle: 0,
    mirror_axis: "none",
    shear_factor: 0,
    gain_factor: 1.0,
    position_coefficient: 0
  };
  const taskType = block.task_type || "reaching";

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-80 overflow-hidden hover:shadow-xl transition-shadow font-sans text-slate-800 text-sm">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-blue-500" />
      
      {/* Node Header */}
      <div className="bg-slate-800 text-white p-3 flex justify-between items-center">
        <input 
           className="nodrag nowheel bg-transparent border-none outline-none font-bold text-sm w-1/2 text-white placeholder-slate-400"
          value={block.id}
          onChange={(e) => handleChange("id", e.target.value)}
          placeholder="Block Name"
        />
        <div className="flex gap-2">
          <button 
            onClick={() => onPreview(block)}
            className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded transition"
          >
            <Play size={12} /> Test
          </button>
          {deleteBlock && (
            <button 
              onClick={() => deleteBlock(id)}
              className="flex items-center gap-1 text-xs bg-red-600 hover:bg-red-500 px-2 py-1 rounded transition text-white"
              title="Delete block"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Node Body */}
      <div className="p-4 flex flex-col gap-3">
        {/* Task Type */}
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Task Type</label>
          <select 
             className="nodrag nowheel border border-slate-200 rounded p-1.5 text-xs text-slate-700 bg-slate-50 focus:border-blue-500 outline-none"
            value={taskType}
            onChange={(e) => handleChange("task_type", e.target.value)}
          >
            <option value="reaching">Target Reaching</option>
            <option value="tracking">Path Tracking</option>
          </select>
        </div>

        {/* Target Distance */}
        <div className="flex flex-col bg-slate-50 p-2 rounded border border-slate-100 gap-2">
          <label className="text-xs font-semibold text-slate-500 mb-0 flex justify-between items-center">
            Target Distance (px)
            <label className="flex items-center gap-1 cursor-pointer text-[10px] text-slate-400 font-normal">
              <input 
                type="checkbox"
                checked={block.randomize_target_distance === true}
                onChange={(e) => handleChange("randomize_target_distance", e.target.checked)}
              />
              Randomize Range
            </label>
          </label>
          
          {block.randomize_target_distance ? (
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-slate-400 mb-1 block">Min</label>
                <input 
                  type="number"
                   className="nodrag nowheel w-full border border-slate-200 rounded p-1 text-xs text-slate-700 bg-white focus:border-blue-500 outline-none"
                  value={block.min_target_distance_px !== undefined ? block.min_target_distance_px : (block.target_distance_px || 150)}
                  onChange={(e) => handleMinMaxChange("min_target_distance_px", e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-slate-400 mb-1 block">Max</label>
                <input 
                  type="number"
                   className="nodrag nowheel w-full border border-slate-200 rounded p-1 text-xs text-slate-700 bg-white focus:border-blue-500 outline-none"
                  value={block.max_target_distance_px !== undefined ? block.max_target_distance_px : (block.target_distance_px || 150)}
                  onChange={(e) => handleMinMaxChange("max_target_distance_px", e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div>
              <input 
                type="number"
                 className="nodrag nowheel w-full border border-slate-200 rounded p-1 text-xs text-slate-700 bg-white focus:border-blue-500 outline-none"
                value={block.target_distance_px !== undefined ? block.target_distance_px : 150}
                onChange={(e) => handleChange("target_distance_px", Number(e.target.value))}
                placeholder="e.g. 150"
              />
            </div>
          )}
        </div>

        {/* Target Angle */}
        <div className="flex flex-col bg-slate-50 p-2 rounded border border-slate-100 gap-2">
          <label className="text-xs font-semibold text-slate-500 mb-0 flex justify-between items-center">
            Target Angle
          </label>
          <select 
             className="nodrag nowheel border border-slate-200 rounded p-1.5 text-xs text-slate-700 bg-white focus:border-blue-500 outline-none w-full"
            value={block.target_angle_mode || (block.randomize_target_angle ? "random_range" : "random_cardinal")}
            onChange={(e) => handleChange("target_angle_mode", e.target.value)}
          >
            <option value="random_cardinal">Random Cardinal (45°, 90°, etc.)</option>
            <option value="fixed_cardinal">Fixed Angle</option>
            <option value="random_range">Random Range (Min - Max)</option>
          </select>
          
          {(block.target_angle_mode || (block.randomize_target_angle ? "random_range" : "random_cardinal")) === "random_range" && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1">
                <label className="text-[10px] text-slate-400 mb-1 block">Min (Deg)</label>
                <input 
                  type="number"
                   className="nodrag nowheel w-full border border-slate-200 rounded p-1 text-xs text-slate-700 bg-white focus:border-blue-500 outline-none"
                  value={block.min_target_angle_deg !== undefined ? block.min_target_angle_deg : 0}
                  onChange={(e) => handleMinMaxChange("min_target_angle_deg", e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-slate-400 mb-1 block">Max (Deg)</label>
                <input 
                  type="number"
                   className="nodrag nowheel w-full border border-slate-200 rounded p-1 text-xs text-slate-700 bg-white focus:border-blue-500 outline-none"
                  value={block.max_target_angle_deg !== undefined ? block.max_target_angle_deg : 360}
                  onChange={(e) => handleMinMaxChange("max_target_angle_deg", e.target.value)}
                />
              </div>
            </div>
          )}
          
          {(block.target_angle_mode || (block.randomize_target_angle ? "random_range" : "random_cardinal")) === "fixed_cardinal" && (
            <div className="flex-1 mt-1">
              <label className="text-[10px] text-slate-400 mb-1 block">Angle (Deg)</label>
              <select
                 className="nodrag nowheel w-full border border-slate-200 rounded p-1 text-xs text-slate-700 bg-white focus:border-blue-500 outline-none"
                value={block.fixed_target_angle_deg !== undefined ? block.fixed_target_angle_deg : 0}
                onChange={(e) => handleChange("fixed_target_angle_deg", Number(e.target.value))}
              >
                <option value={0}>0° (Right)</option>
                <option value={45}>45° (Top Right)</option>
                <option value={90}>90° (Top)</option>
                <option value={135}>135° (Top Left)</option>
                <option value={180}>180° (Left)</option>
                <option value={225}>225° (Bottom Left)</option>
                <option value={270}>270° (Bottom)</option>
                <option value={315}>315° (Bottom Right)</option>
              </select>
            </div>
          )}
        </div>

        {/* Mapping Type */}
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Mapping Type</label>
          <select 
             className="nodrag nowheel border border-slate-200 rounded p-1.5 text-xs text-slate-700 bg-slate-50 focus:border-blue-500 outline-none"
            value={mappingType}
            onChange={(e) => {
              handleChange("mapping_type", e.target.value);
              // Setup sensible defaults for chosen mapping
              if (e.target.value === "mirror" && params.mirror_axis === "none") {
                handleParamChange("mirror_axis", "horizontal");
              } else if (e.target.value === "rotation" && params.rotation_angle === 0) {
                handleParamChange("rotation_angle", 45);
              }
            }}
          >
            <option value="identity">Normal (Identity)</option>
            <option value="rotation">Custom Rotation</option>
            <option value="mirror">Mirror Mapping</option>
            <option value="shear">Shear Distortion (Anti-Cheat)</option>
            <option value="gain_anisotropy">Gain Anisotropy (Anti-Cheat)</option>
            <option value="position_dependent">Position Rotation (Anti-Cheat)</option>
          </select>
        </div>

        {/* Dynamic Mapping parameters inputs */}
        {mappingType === "rotation" && (
          <div className="flex flex-col bg-slate-50 p-2 rounded border border-slate-100">
            <label className="text-xs font-semibold text-slate-500 mb-1">Base Rotation Angle (Degrees)</label>
            <input 
              type="number"
               className="nodrag nowheel border border-slate-200 rounded p-1 text-xs text-slate-700 bg-white focus:border-blue-500 outline-none"
              value={params.base_rotation_angle_deg !== undefined ? params.base_rotation_angle_deg : params.rotation_angle}
              onChange={(e) => {
                const val = Number(e.target.value);
                handleChange("mapping_params", {
                  ...(block.mapping_params || {}),
                  base_rotation_angle_deg: val,
                  rotation_angle: val
                });
              }}
              placeholder="e.g. 45"
            />
            
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 mt-2 mb-1 cursor-pointer">
              <input 
                type="checkbox"
                checked={params.rotation_noise_deg > 0}
                onChange={(e) => handleParamChange("rotation_noise_deg", e.target.checked ? 10 : 0)}
              />
              Enable Randomness (Noise)
            </label>
            {params.rotation_noise_deg > 0 && (
              <div className="flex flex-col mt-1">
                 <label className="text-[10px] text-slate-400 mb-1">Noise Std Dev (Degrees)</label>
                 <input 
                   type="number"
                    className="nodrag nowheel border border-slate-200 rounded p-1 text-xs text-slate-700 bg-white focus:border-blue-500 outline-none"
                   value={params.rotation_noise_deg}
                   onChange={(e) => handleParamChange("rotation_noise_deg", Number(e.target.value))}
                   placeholder="e.g. 10"
                 />
              </div>
            )}
          </div>
        )}

        {mappingType === "mirror" && (
          <div className="flex flex-col bg-slate-50 p-2 rounded border border-slate-100">
            <label className="text-xs font-semibold text-slate-500 mb-1">Mirror Axis</label>
            <select 
               className="nodrag nowheel border border-slate-200 rounded p-1 text-xs text-slate-700 bg-white focus:border-blue-500 outline-none"
              value={params.mirror_axis}
              onChange={(e) => handleParamChange("mirror_axis", e.target.value)}
            >
              <option value="horizontal">Horizontal (Left/Right)</option>
              <option value="vertical">Vertical (Up/Down)</option>
              <option value="both">Both (180° Rotation)</option>
            </select>
          </div>
        )}

        {mappingType === "shear" && (
          <div className="flex flex-col bg-slate-50 p-2 rounded border border-slate-100">
            <label className="text-xs font-semibold text-slate-500 mb-1">Shear Factor (k)</label>
            <input 
              type="number"
              step="0.1"
               className="nodrag nowheel border border-slate-200 rounded p-1 text-xs text-slate-700 bg-white focus:border-blue-500 outline-none"
              value={params.shear_factor}
              onChange={(e) => handleParamChange("shear_factor", parseFloat(e.target.value) || 0)}
              placeholder="e.g. 0.5"
            />
          </div>
        )}

        {mappingType === "gain_anisotropy" && (
          <div className="flex flex-col bg-slate-50 p-2 rounded border border-slate-100">
            <label className="text-xs font-semibold text-slate-500 mb-1">Gain Factor (Y-scale)</label>
            <input 
              type="number"
              step="0.1"
               className="nodrag nowheel border border-slate-200 rounded p-1 text-xs text-slate-700 bg-white focus:border-blue-500 outline-none"
              value={params.gain_factor}
              onChange={(e) => handleParamChange("gain_factor", parseFloat(e.target.value) || 1.0)}
              placeholder="e.g. 2.0"
            />
          </div>
        )}

        {mappingType === "position_dependent" && (
          <div className="flex flex-col bg-slate-50 p-2 rounded border border-slate-100 gap-2">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Base Rotation Angle</label>
              <input 
                type="number"
                 className="nodrag nowheel w-full border border-slate-200 rounded p-1 text-xs text-slate-700 bg-white focus:border-blue-500 outline-none"
                value={params.rotation_angle}
                onChange={(e) => handleParamChange("rotation_angle", Number(e.target.value))}
                placeholder="e.g. 0"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Distance Coeff (deg/px)</label>
              <input 
                type="number"
                step="0.01"
                 className="nodrag nowheel w-full border border-slate-200 rounded p-1 text-xs text-slate-700 bg-white focus:border-blue-500 outline-none"
                value={params.position_coefficient}
                onChange={(e) => handleParamChange("position_coefficient", parseFloat(e.target.value) || 0)}
                placeholder="e.g. 0.1"
              />
            </div>
          </div>
        )}

        {/* Wave Frequency (for tracking) */}
        {taskType === "tracking" && (
          <div className="flex flex-col bg-slate-50 p-2 rounded border border-slate-100 gap-2">
            <label className="text-xs font-semibold text-slate-500 mb-0">Wave Frequency</label>
            
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-slate-400 mb-1 block">Min (Hz)</label>
                <input 
                  type="number"
                  step="0.1"
                   className="nodrag nowheel w-full border border-slate-200 rounded p-1 text-xs text-slate-700 bg-white focus:border-blue-500 outline-none"
                  value={block.min_wave_frequency !== undefined ? block.min_wave_frequency : (block.wave_frequency || 1.5)}
                  onChange={(e) => handleMinMaxChange("min_wave_frequency", e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-slate-400 mb-1 block">Max (Hz)</label>
                <input 
                  type="number"
                  step="0.1"
                   className="nodrag nowheel w-full border border-slate-200 rounded p-1 text-xs text-slate-700 bg-white focus:border-blue-500 outline-none"
                  value={block.max_wave_frequency !== undefined ? block.max_wave_frequency : (block.wave_frequency || 1.5)}
                  onChange={(e) => handleMinMaxChange("max_wave_frequency", e.target.value)}
                />
              </div>
            </div>
            
            <div className="mt-1">
              <label className="text-[10px] text-slate-400 mb-1 block">Randomness Std Dev</label>
              <input 
                type="number"
                step="0.1"
                 className="nodrag nowheel w-full border border-slate-200 rounded p-1 text-xs text-slate-700 bg-white focus:border-blue-500 outline-none"
                value={block.wave_frequency_noise || 0}
                onChange={(e) => handleChange("wave_frequency_noise", Number(e.target.value))}
                placeholder="e.g. 0.5"
              />
            </div>
          </div>
        )}

        {/* Condition Group */}
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Condition group</label>
          <select 
             className="nodrag nowheel border border-slate-200 rounded p-1.5 text-xs text-slate-700 bg-slate-50 focus:border-blue-500 outline-none"
            value={block.condition}
            onChange={(e) => handleChange("condition", e.target.value)}
          >
            <option value="none">Practice / None</option>
            <option value="rotation">Rotation Phase</option>
            <option value="mirror">Mirror Phase</option>
          </select>
        </div>

        {/* Trial Count */}
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Trials</label>
          <input 
            type="number"
             className="nodrag nowheel border border-slate-200 rounded p-1.5 text-xs text-slate-700 bg-slate-50 focus:border-blue-500 outline-none"
            value={block.trials}
            onChange={(e) => handleChange("trials", Number(e.target.value))}
          />
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500" />
    </div>
  );
}
