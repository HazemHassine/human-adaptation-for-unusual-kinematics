"use client";

import React from "react";
import { Handle, Position } from "@xyflow/react";
import { Play } from "lucide-react";

export default function BlockNode({ data }) {
  const { block, updateBlock, onPreview } = data;

  const handleChange = (field, value) => {
    updateBlock(block.id, field, value);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 w-72 overflow-hidden hover:shadow-xl transition-shadow">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-blue-500" />
      
      <div className="bg-slate-800 text-white p-3 flex justify-between items-center">
        <input 
          className="bg-transparent border-none outline-none font-bold text-sm w-3/4"
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

      <div className="p-4 flex flex-col gap-3">
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-500 uppercase mb-1">Mapping</label>
          <select 
            className="border border-gray-300 rounded p-1 text-sm text-gray-800"
            value={block.mapping}
            onChange={(e) => handleChange("mapping", e.target.value)}
          >
            <option value="identity">Normal (Identity)</option>
            <option value="rotation_45">Rotation (45°)</option>
            <option value="rotation_60">Rotation (60°)</option>
            <option value="mirror_horizontal">Mirror (Horizontal)</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-500 uppercase mb-1">Condition</label>
          <select 
            className="border border-gray-300 rounded p-1 text-sm text-gray-800"
            value={block.condition}
            onChange={(e) => handleChange("condition", e.target.value)}
          >
            <option value="none">Practice / None</option>
            <option value="rotation">Rotation Phase</option>
            <option value="mirror">Mirror Phase</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-500 uppercase mb-1">Trials</label>
          <input 
            type="number"
            className="border border-gray-300 rounded p-1 text-sm text-gray-800"
            value={block.trials}
            onChange={(e) => handleChange("trials", Number(e.target.value))}
          />
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500" />
    </div>
  );
}
