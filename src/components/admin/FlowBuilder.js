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
import StartNode from "./StartNode";
import EndNode from "./EndNode";
import CustomEdge from "./CustomEdge";
import PreviewModal from "./PreviewModal";

export default function FlowBuilder({ initialBlocks, onBlocksChange }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [previewBlock, setPreviewBlock] = useState(null);
  const [previewBlocks, setPreviewBlocks] = useState(null);

  // Register custom node type
  const nodeTypes = useMemo(() => ({ blockNode: BlockNode, startNode: StartNode, endNode: EndNode }), []);
  const edgeTypes = useMemo(() => ({ custom: CustomEdge }), []);

  // Initialize nodes from blocks
  useEffect(() => {
    if (nodes.length === 0) {
      const newNodes = [];
      const newEdges = [];

      // Add start node
      newNodes.push({ id: 'start', type: 'startNode', position: { x: 50, y: 150 }, data: { } });

      let currentX = 300;
      let lastId = 'start';

      if (initialBlocks && initialBlocks.length > 0) {
        initialBlocks.forEach((b) => {
          newNodes.push({
            id: b.id,
            type: "blockNode",
            position: { x: currentX, y: 150 },
            data: { block: b }
          });
          
          newEdges.push({
            id: `e-${lastId}-${b.id}`,
            source: lastId,
            target: b.id,
            type: 'custom',
            animated: true,
            style: { stroke: '#3b82f6', strokeWidth: 2 }
          });
          
          lastId = b.id;
          currentX += 350;
        });
      }

      // Add end node
      newNodes.push({ id: 'end', type: 'endNode', position: { x: currentX, y: 150 }, data: {} });
      
      newEdges.push({
        id: `e-${lastId}-end`,
        source: lastId,
        target: 'end',
        type: 'custom',
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 }
      });

      setNodes(newNodes);
      setEdges(newEdges);
    }
  }, [initialBlocks]);

  // Update parent whenever nodes/edges change so it can save
  useEffect(() => {
    const blockMap = {};
    nodes.forEach(n => {
      if (n.type === 'blockNode') {
        blockMap[n.id] = n.data.block;
      }
    });
    
    // Trace from start node
    const orderedBlocks = [];
    let currentId = 'start';
    
    // Safe guard against infinite loops
    const visited = new Set();
    
    while(currentId && !visited.has(currentId)) {
      visited.add(currentId);
      if (blockMap[currentId]) {
        orderedBlocks.push(blockMap[currentId]);
      }
      const nextEdge = edges.find(e => e.source === currentId);
      currentId = nextEdge ? nextEdge.target : null;
    }

    onBlocksChange(orderedBlocks);
  }, [nodes, edges]);

  const updateBlock = (nodeId, fieldOrUpdates, value) => {
    setNodes(nds => {
      const updates = typeof fieldOrUpdates === 'object' ? fieldOrUpdates : { [fieldOrUpdates]: value };
      
      if (updates.id !== undefined) {
        const newId = updates.id.trim();
        if (nds.some(n => n.id !== nodeId && n.type === 'blockNode' && n.data?.block?.id === newId)) {
          alert(`A block named "${newId}" already exists. Block names must be unique.`);
          return nds;
        }
      }

      return nds.map(n => {
        if (n.id === nodeId) {
          return { ...n, data: { ...n.data, block: { ...n.data.block, ...updates } } };
        }
        return n;
      });
    });
  };

  const deleteBlock = useCallback((nodeId) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
  }, []);

  const deleteEdge = useCallback((edgeId) => {
    setEdges(eds => eds.filter(e => e.id !== edgeId));
  }, []);

  const handlePreview = (block) => {
    setPreviewBlock(block);
    setPreviewBlocks(null);
  };

  const handlePreviewAll = useCallback(() => {
    // Collect all blocks in order from start
    const blockMap = {};
    nodes.forEach(n => {
      if (n.type === 'blockNode') {
        blockMap[n.id] = n.data.block;
      }
    });
    
    const orderedBlocks = [];
    let currentId = 'start';
    const visited = new Set();
    
    while(currentId && !visited.has(currentId)) {
      visited.add(currentId);
      if (blockMap[currentId]) {
        orderedBlocks.push(blockMap[currentId]);
      }
      const nextEdge = edges.find(e => e.source === currentId);
      currentId = nextEdge ? nextEdge.target : null;
    }

    if (orderedBlocks.length > 0) {
      setPreviewBlocks(orderedBlocks);
      setPreviewBlock(null);
    } else {
      alert("No blocks connected to Start node to preview.");
    }
  }, [nodes, edges]);

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  
  const onConnect = useCallback((params) => {
    setEdges((eds) => {
      // 1-to-1 constraint: Remove any existing edge that shares the same source OR target
      const filteredEds = eds.filter(e => e.source !== params.source && e.target !== params.target);
      return addEdge({
        ...params, 
        type: 'custom', 
        animated: true, 
        style: { stroke: '#3b82f6', strokeWidth: 2 }
      }, filteredEds);
    });
  }, []);

  const addNode = () => {
    const newId = "block_" + Date.now();
    const newBlock = { id: newId, mapping_type: "identity", task_type: "reaching", path_type: "none", trials: 10, condition: "none" };
    
    setNodes(nds => {
      // Find the edge going to the end node, we want to insert right before the end node
      const edgeToEnd = edges.find(e => e.target === 'end');
      const tailNodeId = edgeToEnd ? edgeToEnd.source : 'start';
      const tailNode = nds.find(n => n.id === tailNodeId);
      
      const newNode = { 
        id: newId, 
        type: "blockNode", 
        position: tailNode ? { x: tailNode.position.x + 350, y: tailNode.position.y } : { x: 50, y: 150 }, 
        data: { block: newBlock, updateBlock, deleteBlock, onPreview: handlePreview } 
      };
      
      if (tailNode) {
        setTimeout(() => {
          setEdges(eds => {
            // Remove the edge to end
            const withoutEndEdge = eds.filter(e => e.target !== 'end' || e.source !== tailNodeId);
            // Add edge from tail to new node
            const newEds = addEdge({
              id: `e-${tailNodeId}-${newId}`,
              source: tailNodeId,
              target: newId,
              type: 'custom',
              animated: true,
              style: { stroke: '#3b82f6', strokeWidth: 2 }
            }, withoutEndEdge);
            // Add edge from new node to end
            return addEdge({
              id: `e-${newId}-end`,
              source: newId,
              target: 'end',
              type: 'custom',
              animated: true,
              style: { stroke: '#3b82f6', strokeWidth: 2 }
            }, newEds);
          });
        }, 10);
      }
      
      // Move 'end' node to the right
      const endNodeIndex = nds.findIndex(n => n.id === 'end');
      const newNodes = [...nds, newNode];
      if (endNodeIndex !== -1 && tailNode) {
        newNodes[endNodeIndex] = {
          ...newNodes[endNodeIndex],
          position: { x: tailNode.position.x + 700, y: tailNode.position.y }
        };
      }
      
      return newNodes;
    });
  };

  // Inject functions into node data
  const nodesWithCallbacks = nodes.map(n => {
    if (n.type === 'blockNode') {
      return {
        ...n,
        data: { ...n.data, updateBlock, deleteBlock, onPreview: handlePreview }
      };
    } else if (n.type === 'startNode') {
      return {
        ...n,
        data: { ...n.data, onPreviewAll: handlePreviewAll }
      };
    }
    return n;
  });

  const edgesWithCallbacks = edges.map(e => ({
    ...e,
    data: { ...e.data, onDelete: deleteEdge }
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
        edges={edgesWithCallbacks}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
      >
        <Background color="#ccc" gap={16} />
        <Controls />
      </ReactFlow>

      {(previewBlock || previewBlocks) && (
        <PreviewModal 
          block={previewBlock} 
          blocks={previewBlocks} 
          onClose={() => { setPreviewBlock(null); setPreviewBlocks(null); }} 
        />
      )}
    </div>
  );
}
