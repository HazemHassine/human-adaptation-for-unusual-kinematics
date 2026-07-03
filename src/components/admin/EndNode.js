import React from "react";
import { Handle, Position } from "@xyflow/react";

export default function EndNode() {
  return (
    <div className="bg-rose-50 rounded-xl shadow-lg border-2 border-rose-400 w-48 overflow-hidden font-sans text-slate-800 text-sm flex flex-col items-center justify-center py-4 relative">
      
      {/* Input handle only */}
      <Handle type="target" position={Position.Left} className="w-4 h-4 bg-rose-500 border-2 border-white" />
      
      <div className="flex flex-col items-center">
        <div className="font-bold text-rose-800 text-lg uppercase tracking-wider">End</div>
        <div className="text-[10px] text-rose-600 mt-1">Experiment Flow Ends Here</div>
      </div>

    </div>
  );
}
