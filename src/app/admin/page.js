"use client";

import React, { useState, useEffect, useRef } from "react";
import FlowBuilder from "@/components/admin/FlowBuilder";
import { LayoutDashboard, Settings2, Database, LogOut, CheckCircle2 } from "lucide-react";

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  
  const [activeTab, setActiveTab] = useState("flow"); // flow, questionnaire, analytics
  const [config, setConfig] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [participantData, setParticipantData] = useState(null);
  
  const canvasRef = useRef(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (authenticated) {
      fetch("/api/config")
        .then(res => res.json())
        .then(json => {
          if (json.success) setConfig(json.data);
        });
      
      fetch("/api/participants")
        .then(res => res.json())
        .then(json => {
          if (json.success) setParticipants(json.data);
        });
    }
  }, [authenticated]);

  const loadParticipantData = async (participantId) => {
    const res = await fetch(`/api/analytics?action=participant_movements&participant_id=${participantId}`);
    const json = await res.json();
    if (json.success) {
      setParticipantData(json.data);
      setSelectedParticipant(participantId);
    }
  };

  const drawHeatmap = () => {
    if (!canvasRef.current || !participantData) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, 800, 600);

    // Draw central start circle
    ctx.beginPath();
    ctx.arc(400, 300, 20, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fill();

    // Group movements by block and trial
    const trialPaths = {};
    participantData.movements.forEach(m => {
      const key = `${m.block_id}_${m.trial_id}`;
      if (!trialPaths[key]) trialPaths[key] = [];
      trialPaths[key].push(m);
    });

    // Set global composite operation to multiply so overlapping paths darken and create a heatmap effect
    ctx.globalCompositeOperation = "multiply";

    // Draw each trial as a continuous path
    Object.values(trialPaths).forEach(path => {
      if (path.length < 2) return;
      
      ctx.beginPath();
      ctx.moveTo(path[0].cursor_x, path[0].cursor_y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].cursor_x, path[i].cursor_y);
      }
      
      const type = path[0].mapping_type;
      // Use low opacity so overlapping lines create a density "heatmap"
      if (type.includes("rotation")) ctx.strokeStyle = "rgba(59, 130, 246, 0.15)"; // Blue
      else if (type.includes("mirror")) ctx.strokeStyle = "rgba(34, 197, 94, 0.15)"; // Green
      else ctx.strokeStyle = "rgba(156, 163, 175, 0.15)"; // Gray
      
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    });

    // Reset composite operation
    ctx.globalCompositeOperation = "source-over";
  };

  useEffect(() => {
    if (activeTab === "analytics" && selectedParticipant) {
      drawHeatmap();
    }
  }, [participantData, activeTab]);

  const saveConfig = async () => {
    await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (!authenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100">
        <div className="bg-white p-8 shadow-xl rounded-2xl w-96 text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <LayoutDashboard size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-6 text-slate-800">Admin Login</h1>
          <input 
            type="password" 
            className="border-2 border-slate-200 p-3 rounded-lg w-full mb-4 focus:border-blue-500 focus:outline-none transition"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && password === "SRM2026") setAuthenticated(true);
            }}
          />
          <button 
            className="bg-blue-600 text-white px-4 py-3 rounded-lg w-full font-bold hover:bg-blue-700 transition"
            onClick={() => {
              if (password === "SRM2026") setAuthenticated(true);
            }}
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2">
            <LayoutDashboard size={24} />
            SRM Admin
          </h1>
        </div>
        <div className="flex-1 p-4 flex flex-col gap-2">
          <button 
            className={`flex items-center gap-3 p-3 rounded-lg font-medium transition ${activeTab === "flow" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}
            onClick={() => setActiveTab("flow")}
          >
            <Settings2 size={20} /> Visual Flow
          </button>
          <button 
            className={`flex items-center gap-3 p-3 rounded-lg font-medium transition ${activeTab === "questionnaire" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}
            onClick={() => setActiveTab("questionnaire")}
          >
            <LayoutDashboard size={20} /> Questionnaire
          </button>
          <button 
            className={`flex items-center gap-3 p-3 rounded-lg font-medium transition ${activeTab === "analytics" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}
            onClick={() => setActiveTab("analytics")}
          >
            <Database size={20} /> Data & Analytics
          </button>
        </div>
        <div className="p-4 border-t border-slate-100">
          <button 
            className="flex items-center gap-3 p-3 rounded-lg font-medium text-red-600 hover:bg-red-50 w-full transition"
            onClick={() => setAuthenticated(false)}
          >
            <LogOut size={20} /> Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-0">
          <h2 className="text-lg font-semibold capitalize">
            {activeTab === "flow" ? "Experiment Flow Builder" : activeTab === "questionnaire" ? "Questionnaire Builder" : "Analytics Dashboard"}
          </h2>
          {(activeTab === "flow" || activeTab === "questionnaire") && (
            <button 
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-white transition ${saved ? 'bg-green-500' : 'bg-blue-600 hover:bg-blue-700'}`}
              onClick={saveConfig}
            >
              {saved ? <><CheckCircle2 size={18}/> Saved!</> : "Save Changes"}
            </button>
          )}
        </div>

        {/* Workspace */}
        <div className="flex-1 overflow-auto p-8 relative">
          
          {/* FLOW BUILDER */}
          {activeTab === "flow" && config && (
            <div className="h-full flex flex-col">
              <p className="text-slate-500 mb-4">
                Drag and drop nodes to organize the sequence of your experiment. Connect them visually. Click <b>Test</b> on any node to preview the exact mouse mapping without saving data.
              </p>
              <div className="flex-1">
                <FlowBuilder 
                  initialBlocks={config.blocks} 
                  onBlocksChange={(orderedBlocks) => setConfig({...config, blocks: orderedBlocks})} 
                />
              </div>
            </div>
          )}

          {/* QUESTIONNAIRE BUILDER */}
          {activeTab === "questionnaire" && config && (
            <div className="max-w-4xl mx-auto pb-20">
              <p className="text-slate-500 mb-6">
                Design the questions participants will answer at the end of their session.
              </p>
              <div className="grid gap-6">
                {config.questionnaire.map((q, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-4">
                      <input 
                        className="font-bold text-lg border-b-2 border-transparent hover:border-slate-300 focus:border-blue-500 outline-none bg-transparent w-full"
                        value={q.question}
                        placeholder="Type question here..."
                        onChange={(e) => {
                          const newQs = [...config.questionnaire];
                          newQs[idx].question = e.target.value;
                          setConfig({...config, questionnaire: newQs});
                        }} 
                      />
                      <button 
                        className="text-red-400 hover:text-red-600 p-2"
                        onClick={() => {
                          const newQs = config.questionnaire.filter((_, i) => i !== idx);
                          setConfig({...config, questionnaire: newQs});
                        }}
                      ><XIcon /></button>
                    </div>

                    <div className="flex gap-4 items-start">
                      <div className="flex-1">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Database ID</label>
                        <input 
                          className="w-full border border-slate-300 p-2 rounded bg-slate-50" 
                          value={q.id} 
                          onChange={(e) => {
                            const newQs = [...config.questionnaire];
                            newQs[idx].id = e.target.value;
                            setConfig({...config, questionnaire: newQs});
                          }} 
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Answer Type</label>
                        <select 
                          className="w-full border border-slate-300 p-2 rounded bg-slate-50" 
                          value={q.type} 
                          onChange={(e) => {
                            const newQs = [...config.questionnaire];
                            newQs[idx].type = e.target.value;
                            setConfig({...config, questionnaire: newQs});
                          }} 
                        >
                          <option value="text">Text Entry</option>
                          <option value="number">Numeric</option>
                          <option value="select">Dropdown Menu</option>
                        </select>
                      </div>
                    </div>

                    {q.type === "select" && (
                      <div className="mt-4">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Dropdown Options (Comma separated)</label>
                        <input 
                          className="w-full border border-slate-300 p-2 rounded bg-slate-50" 
                          placeholder="Yes, No, Maybe"
                          value={q.options ? q.options.join(", ") : ""} 
                          onChange={(e) => {
                            const newQs = [...config.questionnaire];
                            newQs[idx].options = e.target.value.split(",").map(s => s.trim());
                            setConfig({...config, questionnaire: newQs});
                          }} 
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button 
                className="mt-6 w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:bg-slate-100 hover:text-slate-700 transition"
                onClick={() => {
                  setConfig({...config, questionnaire: [...config.questionnaire, { id: "new_q", question: "New Question?", type: "text", options: [] }]});
                }}
              >
                + Add New Question
              </button>
            </div>
          )}

          {/* ANALYTICS */}
          {activeTab === "analytics" && (
            <div className="flex gap-8 h-full">
              {/* Participant List */}
              <div className="w-1/3 bg-white p-4 rounded-xl shadow-sm border border-slate-200 overflow-auto h-full">
                <h3 className="font-bold text-lg mb-4 text-slate-800 sticky top-0 bg-white pb-2 border-b">Participants ({participants.length})</h3>
                <ul className="flex flex-col gap-2">
                  {participants.map(p => (
                    <li 
                      key={p.participant_id} 
                      className={`p-3 border rounded-lg cursor-pointer transition ${selectedParticipant === p.participant_id ? 'bg-blue-50 border-blue-300 text-blue-800 font-medium' : 'hover:bg-slate-50 border-slate-100'}`}
                      onClick={() => loadParticipantData(p.participant_id)}
                    >
                      ID: {p.participant_id} <br/>
                      <span className="text-xs text-slate-500">Completed at: {new Date(p.created_at).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Data View */}
              <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full overflow-auto">
                {selectedParticipant && participantData ? (
                  <div>
                    <h3 className="font-bold text-xl mb-6 text-slate-800">Participant: {selectedParticipant}</h3>
                    
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <p className="text-sm text-slate-500">Total Trials</p>
                        <p className="text-2xl font-bold">{participantData.trials.length}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <p className="text-sm text-slate-500">Average Reach Time</p>
                        <p className="text-2xl font-bold">
                          {Math.round(participantData.trials.reduce((acc, t) => acc + (t.movement_time_ms || 0), 0) / participantData.trials.length)} ms
                        </p>
                      </div>
                    </div>

                    <h4 className="font-bold text-lg mb-4 text-slate-800">Movement Heatmap</h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-4 flex justify-center mb-8">
                      <canvas ref={canvasRef} width={800} height={600} className="border bg-white shadow-sm"></canvas>
                    </div>

                    <h4 className="font-bold text-lg mb-4 text-slate-800">Questionnaire Answers</h4>
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                      <pre className="text-sm whitespace-pre-wrap">
                        {JSON.stringify(participantData.questionnaire || {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    Select a participant to view their data.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
