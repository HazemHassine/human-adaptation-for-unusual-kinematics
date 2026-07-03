"use client";

import React, { useState } from "react";
import CanvasTask from "@/components/CanvasTask";
import { X } from "lucide-react";

export default function PreviewModal({ block, blocks, onClose }) {
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [completeMessage, setCompleteMessage] = useState(null);

  const isMultiBlock = Array.isArray(blocks) && blocks.length > 0;
  const currentBlock = isMultiBlock ? blocks[currentBlockIndex] : block;

  if (!currentBlock) {
    return null; // Safety catch if blocks is empty
  }

  const handleTaskComplete = (movements, trialLogs) => {
    if (isMultiBlock && currentBlockIndex < blocks.length - 1) {
      setCurrentBlockIndex(currentBlockIndex + 1);
    } else {
      setCompleteMessage(`Preview complete!`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col relative animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center bg-gray-100 p-4 border-b">
          <h2 className="font-bold text-lg text-gray-800">
            Preview: {currentBlock.id} {isMultiBlock && `(${currentBlockIndex + 1}/${blocks.length})`}
          </h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded hover:bg-gray-200 transition"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>
        
        <div className="p-8 flex flex-col items-center justify-center bg-gray-50 flex-1 min-h-[650px]">
          {completeMessage ? (
            <div className="text-center">
              <p className="text-xl font-bold text-green-600 mb-4">{completeMessage}</p>
              <button 
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Close Preview
              </button>
            </div>
          ) : (
            <CanvasTask key={currentBlock.id} block={currentBlock} devMode={true} onComplete={handleTaskComplete} />
          )}
        </div>
      </div>
    </div>
  );
}
