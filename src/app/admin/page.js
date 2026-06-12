"use client";

import React, { useState, useEffect, useRef } from "react";
import FlowBuilder from "@/components/admin/FlowBuilder";
import { LayoutDashboard, Settings2, Database, LogOut, CheckCircle2, RefreshCw, Trash2 } from "lucide-react";

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  
  const [activeTab, setActiveTab] = useState("flow"); // flow, questionnaire, analytics
  const [config, setConfig] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [participantData, setParticipantData] = useState(null);
  const [deviceStats, setDeviceStats] = useState([]);
  const [selectedTrialId, setSelectedTrialId] = useState(null);
  
  const canvasRef = useRef(null);
  const velocityCanvasRef = useRef(null);
  const adaptationCanvasRef = useRef(null);
  const [saved, setSaved] = useState(false);

  const refreshData = () => {
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

    fetch("/api/analytics?action=device_stats")
      .then(res => res.json())
      .then(json => {
        if (json.success) setDeviceStats(json.data);
      });
  };

  useEffect(() => {
    if (authenticated) {
      refreshData();
    }
  }, [authenticated]);

  const loadParticipantData = async (participantId) => {
    const res = await fetch(`/api/analytics?action=participant_movements&participant_id=${participantId}`);
    const json = await res.json();
    if (json.success) {
      setParticipantData(json.data);
      setSelectedParticipant(participantId);
      if (json.data.trials.length > 0) {
        setSelectedTrialId(json.data.trials[0].trial_id);
      } else {
        setSelectedTrialId(null);
      }
    }
  };

  const drawHeatmap = () => {
    if (!canvasRef.current || !participantData) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, 800, 600);

    // Draw central start circle
    ctx.beginPath();
    ctx.arc(400, 300, 20, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(107, 114, 128, 0.2)";
    ctx.fill();
    ctx.strokeStyle = "#9ca3af";
    ctx.stroke();

    // Group movements by block and trial
    const trialPaths = {};
    participantData.movements.forEach(m => {
      const key = `${m.block_id}_${m.trial_id}`;
      if (!trialPaths[key]) trialPaths[key] = [];
      trialPaths[key].push(m);
    });

    // Draw each trial as a continuous faint path
    ctx.globalCompositeOperation = "multiply";
    Object.values(trialPaths).forEach(path => {
      if (path.length < 2) return;
      
      ctx.beginPath();
      ctx.moveTo(path[0].cursor_x, path[0].cursor_y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].cursor_x, path[i].cursor_y);
      }
      
      const type = path[0].mapping_type || "identity";
      if (type.includes("rotation") || type === "position_dependent") {
        ctx.strokeStyle = "rgba(59, 130, 246, 0.12)"; // Blue
      } else if (type.includes("mirror") || type === "shear" || type === "gain_anisotropy") {
        ctx.strokeStyle = "rgba(34, 197, 94, 0.12)"; // Green
      } else {
        ctx.strokeStyle = "rgba(156, 163, 175, 0.12)"; // Gray
      }
      
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    });
    ctx.globalCompositeOperation = "source-over";

    // Overlay highlighted selected trial
    if (selectedTrialId !== null) {
      const selectedTrial = participantData.trials.find(t => t.trial_id === selectedTrialId);
      const selectedMovements = participantData.movements.filter(
        m => m.trial_id === selectedTrialId && m.event === "moving"
      );
      
      if (selectedTrial) {
        // Draw Ideal Path (Dotted Green)
        if (selectedTrial.ideal_path_points && selectedTrial.ideal_path_points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(selectedTrial.ideal_path_points[0].x, selectedTrial.ideal_path_points[0].y);
          for (let i = 1; i < selectedTrial.ideal_path_points.length; i++) {
            ctx.lineTo(selectedTrial.ideal_path_points[i].x, selectedTrial.ideal_path_points[i].y);
          }
          ctx.strokeStyle = "#10b981"; // Emerald
          ctx.lineWidth = 3;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        
        // Draw Actual Path (Solid Red)
        if (selectedMovements.length > 1) {
          ctx.beginPath();
          ctx.moveTo(selectedMovements[0].cursor_x, selectedMovements[0].cursor_y);
          for (let i = 1; i < selectedMovements.length; i++) {
            ctx.lineTo(selectedMovements[i].cursor_x, selectedMovements[i].cursor_y);
          }
          ctx.strokeStyle = "#ef4444"; // Solid Red
          ctx.lineWidth = 4;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.stroke();
          
          // Draw target circle
          if (selectedMovements[0].target_x) {
            ctx.beginPath();
            ctx.arc(selectedMovements[0].target_x, selectedMovements[0].target_y, 15, 0, 2 * Math.PI);
            ctx.fillStyle = "rgba(37, 99, 235, 0.4)";
            ctx.fill();
            ctx.strokeStyle = "#2563eb";
            ctx.stroke();
          }
        }
      }
    }
  };

  const drawVelocityProfile = () => {
    const canvas = velocityCanvasRef.current;
    if (!canvas || !participantData || selectedTrialId === null) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 400, 250);

    const trialMovements = participantData.movements.filter(
      m => m.trial_id === selectedTrialId && m.event === "moving"
    );

    if (trialMovements.length < 2) {
      ctx.fillStyle = "#6b7280";
      ctx.font = "12px sans-serif";
      ctx.fillText("No movement velocity logs for this trial.", 40, 110);
      return;
    }

    const t0 = trialMovements[0].timestamp_ms;
    const times = trialMovements.map(m => m.timestamp_ms - t0);
    const maxTime = Math.max(...times, 1);

    const mouseSpeeds = trialMovements.map(m => {
      if (m.mouse_vx !== undefined && m.mouse_vy !== undefined) {
        return Math.hypot(m.mouse_vx, m.mouse_vy);
      }
      return Math.hypot(m.mouse_dx, m.mouse_dy) / 16.6; // fallback
    });

    const cursorSpeeds = trialMovements.map(m => {
      if (m.cursor_vx !== undefined && m.cursor_vy !== undefined) {
        return Math.hypot(m.cursor_vx, m.cursor_vy);
      }
      return Math.hypot(m.mouse_dx, m.mouse_dy) / 16.6;
    });

    const maxSpeed = Math.max(...mouseSpeeds, ...cursorSpeeds, 0.1);

    // Draw horizontal grid lines
    ctx.strokeStyle = "#f3f4f6";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = 30 + i * 35;
      ctx.beginPath();
      ctx.moveTo(50, y);
      ctx.lineTo(370, y);
      ctx.stroke();
      
      ctx.fillStyle = "#9ca3af";
      ctx.font = "9px sans-serif";
      ctx.fillText((maxSpeed * (1 - i / 4)).toFixed(2) + " px/ms", 5, y + 3);
    }

    ctx.fillText("0 ms", 50, 195);
    ctx.fillText(Math.round(maxTime) + " ms", 330, 195);

    const getX = (t) => 50 + (t / maxTime) * 320;
    const getY = (s) => 170 - (s / maxSpeed) * 140;

    // Draw Mouse Speed (Blue)
    ctx.beginPath();
    ctx.moveTo(getX(times[0]), getY(mouseSpeeds[0]));
    for (let i = 1; i < trialMovements.length; i++) {
      ctx.lineTo(getX(times[i]), getY(mouseSpeeds[i]));
    }
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw Cursor Speed (Red)
    ctx.beginPath();
    ctx.moveTo(getX(times[0]), getY(cursorSpeeds[0]));
    for (let i = 1; i < trialMovements.length; i++) {
      ctx.lineTo(getX(times[i]), getY(cursorSpeeds[i]));
    }
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw legend
    ctx.fillStyle = "#2563eb";
    ctx.fillRect(80, 215, 8, 8);
    ctx.fillStyle = "#374151";
    ctx.font = "10px sans-serif";
    ctx.fillText("Mouse Speed", 93, 222);

    ctx.fillStyle = "#ef4444";
    ctx.fillRect(200, 215, 8, 8);
    ctx.fillText("Cursor Speed", 213, 222);
  };

  const drawAdaptationCurve = () => {
    const canvas = adaptationCanvasRef.current;
    if (!canvas || !participantData) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 750, 250);

    const trials = participantData.trials;
    if (trials.length < 2) {
      ctx.fillStyle = "#6b7280";
      ctx.font = "12px sans-serif";
      ctx.fillText("Need at least 2 trials to display learning curves.", 40, 110);
      return;
    }

    const maxTrials = trials.length;
    const getX = (idx) => 50 + (idx / Math.max(1, maxTrials - 1)) * 650;
    
    // Draw grid
    ctx.strokeStyle = "#f3f4f6";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = 30 + i * 35;
      ctx.beginPath();
      ctx.moveTo(50, y);
      ctx.lineTo(700, y);
      ctx.stroke();

      ctx.fillStyle = "#6b7280";
      ctx.font = "9px sans-serif";
      ctx.fillText(Math.round(180 * (1 - i / 4)) + "° IDE", 5, y + 3);
    }

    ctx.beginPath();
    ctx.moveTo(50, 170);
    ctx.lineTo(700, 170);
    ctx.strokeStyle = "#9ca3af";
    ctx.stroke();
    
    ctx.fillStyle = "#374151";
    ctx.font = "10px sans-serif";
    ctx.fillText("Trial 1", 50, 185);
    ctx.fillText(`Trial ${maxTrials}`, 670, 185);

    // Plot IDE Line (Reaching)
    ctx.beginPath();
    let first = true;
    trials.forEach((t, idx) => {
      const ide = t.initial_direction_error_deg;
      if (ide !== undefined && ide !== null) {
        const x = getX(idx);
        const y = 170 - (Math.min(180, ide) / 180) * 140;
        if (first) {
          ctx.moveTo(x, y);
          first = false;
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Plot dot coordinates
    trials.forEach((t, idx) => {
      const x = getX(idx);
      if (t.task_type === "tracking" && t.tracking_rmse_px !== undefined) {
        const y = 170 - (Math.min(60, t.tracking_rmse_px) / 60) * 140;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = "#10b981";
        ctx.fill();
      } else {
        const ide = t.initial_direction_error_deg;
        if (ide !== undefined && ide !== null) {
          const y = 170 - (Math.min(180, ide) / 180) * 140;
          ctx.beginPath();
          ctx.arc(x, y, 3.5, 0, 2 * Math.PI);
          ctx.fillStyle = "#2563eb";
          ctx.fill();
        }
      }
    });

    // Legend
    ctx.fillStyle = "#2563eb";
    ctx.beginPath();
    ctx.arc(80, 215, 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = "#374151";
    ctx.fillText("Initial Direction Error (deg)", 90, 219);

    ctx.fillStyle = "#10b981";
    ctx.beginPath();
    ctx.arc(260, 215, 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillText("Tracking RMSE deviation (px)", 270, 219);
  };

  const resetDatabase = async () => {
    if (confirm("Are you absolutely sure you want to reset the database? This will delete all participant sessions, trials, movement logs, and questionnaires. This action cannot be undone.")) {
      const res = await fetch("/api/analytics", { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        alert("Database has been reset successfully.");
        setParticipants([]);
        setSelectedParticipant(null);
        setParticipantData(null);
        setDeviceStats([]);
      } else {
        alert("Reset failed: " + json.error);
      }
    }
  };

  useEffect(() => {
    if (activeTab === "analytics" && selectedParticipant && participantData) {
      drawHeatmap();
      drawVelocityProfile();
      drawAdaptationCurve();
    }
  }, [participantData, selectedTrialId, activeTab]);

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
            <div className="flex gap-8 h-full min-h-[600px]">
              {/* Participant List */}
              <div className="w-1/3 bg-white p-4 rounded-xl shadow-sm border border-slate-200 overflow-auto h-full flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-lg mb-4 text-slate-800 sticky top-0 bg-white pb-2 border-b">
                    Participants ({participants.length})
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {participants.map((p, idx) => (
                      <li 
                        key={p.session_id || idx} 
                        className={`p-3 border rounded-lg cursor-pointer transition ${selectedParticipant === p.participant_id ? 'bg-blue-50 border-blue-300 text-blue-800 font-medium' : 'hover:bg-slate-50 border-slate-100'}`}
                        onClick={() => loadParticipantData(p.participant_id)}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-sm">ID: {p.participant_id}</span>
                          <span className="text-[9px] bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded capitalize font-semibold">
                            {p.input_device || "mouse"}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          Completed: {new Date(p.created_at).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t">
                  <button
                    onClick={resetDatabase}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 py-2.5 px-4 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
                  >
                    <Trash2 size={14} /> Reset Database
                  </button>
                </div>
              </div>

              {/* Data View */}
              <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full overflow-auto">
                {selectedParticipant && participantData ? (
                  <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-center border-b pb-4">
                      <h3 className="font-bold text-xl text-slate-800">ID: {selectedParticipant}</h3>
                      <span className="bg-blue-100 text-blue-800 font-semibold px-3 py-1 rounded-full text-xs uppercase tracking-wide">
                        Device: {participantData.trials[0]?.pinfo?.input_device || "Mouse"}
                      </span>
                    </div>
                    
                    {/* Metrics Cards */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <p className="text-xs text-slate-400 uppercase font-semibold">Total Trials</p>
                        <p className="text-2xl font-bold text-slate-800">{participantData.trials.length}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <p className="text-xs text-slate-400 uppercase font-semibold">Avg Movement Time</p>
                        <p className="text-2xl font-bold text-slate-800">
                          {Math.round(participantData.trials.reduce((acc, t) => acc + (t.movement_time_ms || 0), 0) / participantData.trials.length)} ms
                        </p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <p className="text-xs text-slate-400 uppercase font-semibold">Avg Reaction Time</p>
                        <p className="text-2xl font-bold text-slate-800">
                          {Math.round(participantData.trials.reduce((acc, t) => acc + (t.reaction_time_ms || 0), 0) / participantData.trials.length)} ms
                        </p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <p className="text-xs text-slate-400 uppercase font-semibold">Avg Directness</p>
                        <p className="text-2xl font-bold text-slate-800">
                          {(participantData.trials.reduce((acc, t) => acc + (t.straightness_ratio || 1.0), 0) / participantData.trials.length * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>

                    {/* Learning Curve (Adaptation) */}
                    <div>
                      <h4 className="font-bold text-sm text-slate-500 uppercase tracking-wide mb-3">Learning Curve (Adaptation Progress)</h4>
                      <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50 p-4 flex justify-center">
                        <canvas ref={adaptationCanvasRef} width={750} height={250} className="border bg-white shadow-sm rounded-lg"></canvas>
                      </div>
                    </div>

                    {/* Heatmap & Selected Trial Detail */}
                    <div className="grid grid-cols-3 gap-6">
                      {/* Left: Heatmap */}
                      <div className="col-span-2">
                        <h4 className="font-bold text-sm text-slate-500 uppercase tracking-wide mb-3">Continuous Trajectory Spaghetti Map</h4>
                        <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50 p-4 flex justify-center">
                          <canvas ref={canvasRef} width={800} height={600} className="border bg-white shadow-sm rounded-lg max-w-full h-auto"></canvas>
                        </div>
                      </div>
                      
                      {/* Right: Selected Trial Metrics & Velocity Chart */}
                      <div className="col-span-1 flex flex-col gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Select Trial to Inspect</label>
                          <select 
                            className="w-full border border-slate-200 p-2 rounded-lg bg-slate-50 text-slate-700 focus:border-blue-500 outline-none text-sm"
                            value={selectedTrialId || ""}
                            onChange={(e) => setSelectedTrialId(Number(e.target.value))}
                          >
                            {participantData.trials.map((t, idx) => (
                              <option key={idx} value={t.trial_id}>
                                Trial {t.trial_id + 1} ({t.task_type || "reaching"})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Selected Trial Summary Info */}
                        {selectedTrialId !== null && (
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs flex flex-col gap-2">
                            <h5 className="font-bold text-slate-700 uppercase tracking-wider border-b pb-1 mb-1">Trial Summary</h5>
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-semibold">Direction Error:</span>
                              <span className="font-bold text-slate-800">
                                {participantData.trials.find(t => t.trial_id === selectedTrialId)?.initial_direction_error_deg?.toFixed(1) || "0.0"}°
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-semibold">Movement Time:</span>
                              <span className="font-bold text-slate-800">
                                {Math.round(participantData.trials.find(t => t.trial_id === selectedTrialId)?.movement_time_ms || 0)} ms
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-semibold">Reaction Time:</span>
                              <span className="font-bold text-slate-800">
                                {Math.round(participantData.trials.find(t => t.trial_id === selectedTrialId)?.reaction_time_ms || 0)} ms
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-semibold">Straightness Ratio:</span>
                              <span className="font-bold text-slate-800">
                                {((participantData.trials.find(t => t.trial_id === selectedTrialId)?.straightness_ratio || 1.0) * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-semibold">Direction Reversals:</span>
                              <span className="font-bold text-slate-800">
                                {participantData.trials.find(t => t.trial_id === selectedTrialId)?.num_direction_reversals || 0}
                              </span>
                            </div>
                            {participantData.trials.find(t => t.trial_id === selectedTrialId)?.task_type === "tracking" && (
                              <div className="flex justify-between text-emerald-600 font-semibold">
                                <span>Path Deviation RMSE:</span>
                                <span>
                                  {participantData.trials.find(t => t.trial_id === selectedTrialId)?.tracking_rmse_px?.toFixed(1)} px
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Velocity Profile Canvas */}
                        <div>
                          <h5 className="font-bold text-xs text-slate-400 uppercase tracking-wide mb-2">Instantaneous Velocity Profile</h5>
                          <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50 p-2 flex justify-center">
                            <canvas ref={velocityCanvasRef} width={400} height={250} className="border bg-white shadow-sm rounded-lg max-w-full h-auto"></canvas>
                          </div>
                        </div>
                      </div>
                    </div>

                    <h4 className="font-bold text-lg mb-2 text-slate-800">Questionnaire Answers</h4>
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                      <pre className="text-sm text-slate-700 whitespace-pre-wrap">
                        {JSON.stringify(participantData.questionnaire || {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col gap-6 justify-center">
                    {/* Device Comparison Overview Landing Page */}
                    <div className="flex flex-col gap-6">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-xl text-slate-800">Device Performance Comparison</h3>
                        <button 
                          onClick={refreshData}
                          className="p-2 border rounded-lg hover:bg-slate-50 text-slate-600 transition flex items-center gap-1.5 text-xs font-semibold"
                        >
                          <RefreshCw size={14} /> Refresh
                        </button>
                      </div>
                      <p className="text-sm text-slate-500">
                        This view compares aggregated kinematics metrics between Mouse users vs. Trackpad users across all trials.
                      </p>
                      
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b text-slate-400 font-bold uppercase tracking-wider text-xxs pb-2">
                              <th className="pb-3 pr-4">Input Device</th>
                              <th className="pb-3 pr-4">Total Trials</th>
                              <th className="pb-3 pr-4">Avg Movement Time</th>
                              <th className="pb-3 pr-4">Avg Reaction Time</th>
                              <th className="pb-3 pr-4">Avg Path RMSE (Tracking)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y text-slate-700">
                            {deviceStats.length > 0 ? (
                              deviceStats.map(stat => (
                                <tr key={stat._id} className="hover:bg-slate-50/50">
                                  <td className="py-3 capitalize font-bold text-blue-600">{stat._id}</td>
                                  <td className="py-3">{stat.total_trials}</td>
                                  <td className="py-3">{Math.round(stat.avg_movement_time || 0)} ms</td>
                                  <td className="py-3">{Math.round(stat.avg_reaction_time || 0)} ms</td>
                                  <td className="py-3 font-semibold text-emerald-600">
                                    {stat.avg_rmse ? stat.avg_rmse.toFixed(1) + " px" : "N/A"}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="5" className="py-6 text-center text-slate-400">
                                  No participant trial data has been recorded yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl p-8 bg-slate-50">
                        Select a participant on the left to view detailed trajectory traces and instantaneous velocities.
                      </div>
                    </div>
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
