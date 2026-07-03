import React from "react";
import { Handle, Position } from "@xyflow/react";
import { Play } from "lucide-react";

export default function StartNode({ data }) {
  const { onPreviewAll } = data;

  return (
    <div className="bg-emerald-50 rounded-xl shadow-lg border-2 border-emerald-400 w-48 overflow-hidden font-sans text-slate-800 text-sm flex flex-col items-center justify-center py-4 relative">
      
      <div className="flex flex-col items-center gap-2">
        <div className="font-bold text-emerald-800 text-lg uppercase tracking-wider">Start</div>
        <div className="text-[10px] text-emerald-600 mb-2">Experiment Flow Begins Here</div>
        
        {onPreviewAll && (
          <button 
            onClick={onPreviewAll}
            className="flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-full transition shadow-md"
          >
            <Play size={14} fill="currentColor" /> Preview Flow
          </button>
        )}
      </div>

      {/* Output handle only */}
      <Handle type="source" position={Position.Right} className="w-4 h-4 bg-emerald-500 border-2 border-white" />
    </div>
  );
}
