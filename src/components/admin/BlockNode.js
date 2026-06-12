"use client";

import React from "react";
import { Handle, Position } from "@xyflow/react";
import { Play } from "lucide-react";

export default function BlockNode({ data }) {
  const { block, updateBlock, onPreview } = data;

  const handleChange = (field, value) => {
    updateBlock(block.id, field, value);
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
          className="bg-transparent border-none outline-none font-bold text-sm w-3/4 text-white placeholder-slate-400"
          value={block.id}
          onChange={(e) => handleChange("id", e.target.value)}
          placeholder="Block Name"
        />
        <button 
          onClick={() => onPreview(block)}
          className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded transition"
        >
          <Play size={12} /> Test
        </button>
      </div>

      {/* Node Body */}
      <div className="p-4 flex flex-col gap-3">
        {/* Task Type */}
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Task Type</label>
          <select 
            className="border border-slate-200 rounded p-1.5 text-xs text-slate-700 bg-slate-50 focus:border-blue-500 outline-none"
            value={taskType}
            onChange={(e) => handleChange("task_type", e.target.value)}
          >
            <option value="reaching">Target Reaching</option>
            <option value="tracking">Path Tracking</option>
          </select>
        </div>

        {/* Mapping Type */}
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Mapping Type</label>
          <select 
            className="border border-slate-200 rounded p-1.5 text-xs text-slate-700 bg-slate-50 focus:border-blue-500 outline-none"
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
            <label className="text-xs font-semibold text-slate-500 mb-1">Rotation Angle (Degrees)</label>
            <input 
              type="number"
              className="border border-slate-200 rounded p-1 text-xs text-slate-700 bg-white focus:border-blue-500 outline-none"
              value={params.rotation_angle}
              onChange={(e) => handleParamChange("rotation_angle", Number(e.target.value))}
              placeholder="e.g. 45"
            />
          </div>
        )}

        {mappingType === "mirror" && (
          <div className="flex flex-col bg-slate-50 p-2 rounded border border-slate-100">
            <label className="text-xs font-semibold text-slate-500 mb-1">Mirror Axis</label>
            <select 
              className="border border-slate-200 rounded p-1 text-xs text-slate-700 bg-white focus:border-blue-500 outline-none"
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
              className="border border-slate-200 rounded p-1 text-xs text-slate-700 bg-white focus:border-blue-500 outline-none"
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
              className="border border-slate-200 rounded p-1 text-xs text-slate-700 bg-white focus:border-blue-500 outline-none"
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
                className="w-full border border-slate-200 rounded p-1 text-xs text-slate-700 bg-white focus:border-blue-500 outline-none"
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
                className="w-full border border-slate-200 rounded p-1 text-xs text-slate-700 bg-white focus:border-blue-500 outline-none"
                value={params.position_coefficient}
                onChange={(e) => handleParamChange("position_coefficient", parseFloat(e.target.value) || 0)}
                placeholder="e.g. 0.1"
              />
            </div>
          </div>
        )}

        {/* Condition Group */}
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Condition group</label>
          <select 
            className="border border-slate-200 rounded p-1.5 text-xs text-slate-700 bg-slate-50 focus:border-blue-500 outline-none"
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
            className="border border-slate-200 rounded p-1.5 text-xs text-slate-700 bg-slate-50 focus:border-blue-500 outline-none"
            value={block.trials}
            onChange={(e) => handleChange("trials", Number(e.target.value))}
          />
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500" />
    </div>
  );
}
