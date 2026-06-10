"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import BlockNode from "./BlockNode";
import PreviewModal from "./PreviewModal";

export default function FlowBuilder({ initialBlocks, onBlocksChange }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [previewBlock, setPreviewBlock] = useState(null);

  // Register custom node type
  const nodeTypes = useMemo(() => ({ blockNode: BlockNode }), []);

  // Initialize nodes from blocks
  useEffect(() => {
    if (nodes.length === 0 && initialBlocks.length > 0) {
      const newNodes = initialBlocks.map((b, i) => ({
        id: b.id, // Using block.id as node id initially
        type: "blockNode",
        position: { x: 50 + i * 350, y: 150 }, // Layout them horizontally
        data: { block: b }
      }));
      setNodes(newNodes);

      const newEdges = [];
      for (let i = 0; i < initialBlocks.length - 1; i++) {
        newEdges.push({
          id: `e-${initialBlocks[i].id}-${initialBlocks[i+1].id}`,
          source: initialBlocks[i].id,
          target: initialBlocks[i+1].id,
          animated: true,
          style: { stroke: '#3b82f6', strokeWidth: 2 }
        });
      }
      setEdges(newEdges);
    }
  }, [initialBlocks]);

  // Update parent whenever nodes/edges change so it can save
  useEffect(() => {
    // Reconstruct the ordered blocks array based on edges (simplistic sorting)
    // We start from a node with no incoming edges, trace the targets.
    // For now, let's just keep the order of `nodes` to keep it simple, but we should sort logically.
    
    // Sort logic based on edges:
    const blockMap = {};
    nodes.forEach(n => blockMap[n.id] = n.data.block);
    
    // Find root (node with no target pointing to it)
    let rootNode = nodes.find(n => !edges.some(e => e.target === n.id));
    if (!rootNode && nodes.length > 0) rootNode = nodes[0];

    const orderedBlocks = [];
    let currentId = rootNode?.id;
    
    while(currentId && blockMap[currentId]) {
      orderedBlocks.push(blockMap[currentId]);
      const nextEdge = edges.find(e => e.source === currentId);
      currentId = nextEdge ? nextEdge.target : null;
    }

    // If there are isolated nodes, append them
    nodes.forEach(n => {
      if (!orderedBlocks.find(b => b.id === n.id)) {
        orderedBlocks.push(blockMap[n.id]);
      }
    });

    onBlocksChange(orderedBlocks);
  }, [nodes, edges]);

  const updateBlock = (nodeId, field, value) => {
    setNodes(nds => nds.map(n => {
      if (n.id === nodeId) {
        return { ...n, data: { ...n.data, block: { ...n.data.block, [field]: value } } };
      }
      return n;
    }));
  };

  const handlePreview = (block) => {
    setPreviewBlock(block);
  };

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((params) => setEdges((eds) => addEdge({...params, animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 }}, eds)), []);

  const addNode = () => {
    const newId = "block_" + Date.now();
    const newBlock = { id: newId, mapping: "identity", trials: 10, condition: "none" };
    setNodes(nds => [
      ...nds, 
      { 
        id: newId, 
        type: "blockNode", 
        position: { x: Math.random() * 200 + 50, y: Math.random() * 200 + 50 }, 
        data: { block: newBlock, updateBlock, onPreview: handlePreview } 
      }
    ]);
  };

  // Inject functions into node data
  const nodesWithCallbacks = nodes.map(n => ({
    ...n,
    data: { ...n.data, updateBlock, onPreview: handlePreview }
  }));

  return (
    <div className="w-full h-full relative border rounded-xl overflow-hidden shadow-inner bg-slate-50">
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button 
          onClick={addNode}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow transition"
        >
          + Add New Block
        </button>
      </div>

      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background color="#ccc" gap={16} />
        <Controls />
      </ReactFlow>

      {previewBlock && (
        <PreviewModal block={previewBlock} onClose={() => setPreviewBlock(null)} />
      )}
    </div>
  );
}
