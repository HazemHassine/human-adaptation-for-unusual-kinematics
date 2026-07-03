"use client";

import React, { useState, useEffect, useRef } from "react";
import FlowBuilder from "@/components/admin/FlowBuilder";
import { LayoutDashboard, Settings2, Database, LogOut, CheckCircle2, RefreshCw, Trash2, Shield, Copy, Star, PlusCircle } from "lucide-react";

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [activeTab, setActiveTab] = useState("flow"); // flow, questionnaire, settings, analytics
  const [analyticsTab, setAnalyticsTab] = useState("overview"); // overview, adaptation, aftereffect, replay, export
  const [selectedMetric, setSelectedMetric] = useState("initial_direction_error_deg");
  const [config, setConfig] = useState(null);
  const [allConfigs, setAllConfigs] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [participantData, setParticipantData] = useState(null);
  const [deviceStats, setDeviceStats] = useState([]);
  const [selectedTrialIds, setSelectedTrialIds] = useState([]);
  const [trialFilterType, setTrialFilterType] = useState("all");
  
  const canvasRef = useRef(null);
  const velocityCanvasRef = useRef(null);
  const adaptationCanvasRef = useRef(null);
  const [saved, setSaved] = useState(false);

  const refreshData = () => {
    fetch("/api/config?all=true")
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setAllConfigs(json.data);
          setConfig(prev => {
            if (!prev) return json.data.find(c => c.isActive) || json.data[0];
            return json.data.find(c => c._id === prev._id) || json.data.find(c => c.isActive) || json.data[0];
          });
        }
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
      // Add strategy labels to trials
      const enrichedTrials = (json.data.trials || []).map(trial => ({
        ...trial,
        strategy: detectStrategy(trial)
      }));
      setParticipantData({ ...json.data, trials: enrichedTrials });
      setSelectedParticipant(participantId);
      setSelectedTrialIds([]);
    }
  };

  const detectStrategy = (trial) => {
    if (!trial) return "unknown";
    
    const ide = trial.initial_direction_error_deg || 0;
    const rev = trial.num_direction_reversals || 0;
    const straight = trial.straightness_ratio || 1.0;
    const rt = trial.reaction_time_ms || 0;
    
    if (Math.abs(ide) < 15 && straight > 0.9 && rev === 0) {
      return "direct";
    }
    
    if (rt > 500 && Math.abs(ide) > 20) {
      return "hesitant/slow";
    }
    
    if (rev > 2 || straight < 0.6) {
      return "random exploration";
    }
    
    if (Math.abs(ide) > 60 && straight > 0.8) {
       return "maladaptive correction";
    }
    
    return "systematic exploration";
  };

  const downloadJSON = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadCSV = (data, filename) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(",")];
    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        return typeof val === "string" ? `"${val.replace(/"/g, '""')}"` : val;
      });
      csvRows.push(values.join(","));
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getHighlightColor = (idx) => {
    const colors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"];
    return colors[idx % colors.length];
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

    // Draw each trial as a continuous faint path (only when moving)
    ctx.globalCompositeOperation = "multiply";
    Object.values(trialPaths).forEach(path => {
      if (path.length < 2) return;
      
      ctx.beginPath();
      let first = true;
      for (let i = 0; i < path.length; i++) {
        if (path[i].event === "moving") {
          if (first) {
            ctx.moveTo(path[i].cursor_x, path[i].cursor_y);
            first = false;
          } else {
            ctx.lineTo(path[i].cursor_x, path[i].cursor_y);
          }
        } else {
          first = true; // Break the path
        }
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

    // Overlay highlighted selected trials
    if (selectedTrialIds.length > 0) {
      selectedTrialIds.forEach((trialKey, idx) => {
        const selectedTrial = participantData.trials.find(t => t._id === trialKey);
        if (!selectedTrial) return;
        const selectedMovements = participantData.movements.filter(
          m => m.session_id === selectedTrial.session_id && m.block_id === selectedTrial.block_id && m.trial_id === selectedTrial.trial_id && m.event === "moving"
        );
        
        if (selectedTrial) {
          // Draw Ideal Path (Dotted line)
          if (selectedTrial.ideal_path_points && selectedTrial.ideal_path_points.length > 0) {
            ctx.beginPath();
            ctx.moveTo(selectedTrial.ideal_path_points[0].x, selectedTrial.ideal_path_points[0].y);
            for (let i = 1; i < selectedTrial.ideal_path_points.length; i++) {
              ctx.lineTo(selectedTrial.ideal_path_points[i].x, selectedTrial.ideal_path_points[i].y);
            }
            ctx.strokeStyle = "#9ca3af"; // Gray
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          
          // Draw Actual Path (Solid Colored)
          if (selectedMovements.length > 1) {
            ctx.beginPath();
            let first = true;
            for (let i = 0; i < selectedMovements.length; i++) {
              if (first) {
                ctx.moveTo(selectedMovements[i].cursor_x, selectedMovements[i].cursor_y);
                first = false;
              } else {
                ctx.lineTo(selectedMovements[i].cursor_x, selectedMovements[i].cursor_y);
              }
            }
            const color = getHighlightColor(idx);
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.stroke();
            
            // Draw target circle
            if (selectedMovements[0].target_x) {
              ctx.beginPath();
              ctx.arc(selectedMovements[0].target_x, selectedMovements[0].target_y, 15, 0, 2 * Math.PI);
              ctx.fillStyle = color + "66"; // with opacity
              ctx.fill();
              ctx.strokeStyle = color;
              ctx.stroke();
            }
          }
        }
      });
    }
  };

  const drawVelocityProfile = () => {
    const canvas = velocityCanvasRef.current;
    if (!canvas || !participantData || selectedTrialIds.length === 0) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 400, 250);

    let maxTimeOverall = 1;
    let maxSpeedOverall = 0.1;

    const trialsData = selectedTrialIds.map((trialKey, idx) => {
      const selectedTrial = participantData.trials.find(t => t._id === trialKey);
      if (!selectedTrial) return null;
      const trialMovements = participantData.movements.filter(
        m => m.session_id === selectedTrial.session_id && m.block_id === selectedTrial.block_id && m.trial_id === selectedTrial.trial_id && m.event === "moving"
      );
      if (trialMovements.length < 2) return null;

      const t0 = trialMovements[0].timestamp_ms;
      const times = trialMovements.map(m => m.timestamp_ms - t0);
      const maxTime = Math.max(...times, 1);

      const mouseSpeeds = trialMovements.map(m => {
        if (m.mouse_vx !== undefined && m.mouse_vy !== undefined) {
          return Math.hypot(m.mouse_vx, m.mouse_vy);
        }
        return Math.hypot(m.mouse_dx, m.mouse_dy) / 16.6;
      });

      const cursorSpeeds = trialMovements.map(m => {
        if (m.cursor_vx !== undefined && m.cursor_vy !== undefined) {
          return Math.hypot(m.cursor_vx, m.cursor_vy);
        }
        return Math.hypot(m.mouse_dx, m.mouse_dy) / 16.6;
      });

      const maxSpeed = Math.max(...mouseSpeeds, ...cursorSpeeds, 0.1);
      
      maxTimeOverall = Math.max(maxTimeOverall, maxTime);
      maxSpeedOverall = Math.max(maxSpeedOverall, maxSpeed);

      return { trialMovements, times, mouseSpeeds, cursorSpeeds, color: getHighlightColor(idx) };
    }).filter(Boolean);

    if (trialsData.length === 0) {
      ctx.fillStyle = "#6b7280";
      ctx.font = "12px sans-serif";
      ctx.fillText("No movement velocity logs for selected trials.", 40, 110);
      return;
    }

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
      ctx.fillText((maxSpeedOverall * (1 - i / 4)).toFixed(2) + " px/ms", 5, y + 3);
    }

    ctx.fillText("0 ms", 50, 195);
    ctx.fillText(Math.round(maxTimeOverall) + " ms", 330, 195);

    const getX = (t) => 50 + (t / maxTimeOverall) * 320;
    const getY = (s) => 170 - (s / maxSpeedOverall) * 140;

    trialsData.forEach((data, i) => {
      const { times, mouseSpeeds, cursorSpeeds, color } = data;

      if (trialsData.length === 1) {
        // Draw Mouse Speed (Blue)
        ctx.beginPath();
        ctx.moveTo(getX(times[0]), getY(mouseSpeeds[0]));
        for (let j = 1; j < times.length; j++) {
          ctx.lineTo(getX(times[j]), getY(mouseSpeeds[j]));
        }
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw Cursor Speed (Red)
        ctx.beginPath();
        ctx.moveTo(getX(times[0]), getY(cursorSpeeds[0]));
        for (let j = 1; j < times.length; j++) {
          ctx.lineTo(getX(times[j]), getY(cursorSpeeds[j]));
        }
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        // If multiple trials, draw only cursor speed with trial color
        ctx.beginPath();
        ctx.moveTo(getX(times[0]), getY(cursorSpeeds[0]));
        for (let j = 1; j < times.length; j++) {
          ctx.lineTo(getX(times[j]), getY(cursorSpeeds[j]));
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });

    // Draw legend
    if (trialsData.length === 1) {
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(80, 215, 8, 8);
      ctx.fillStyle = "#374151";
      ctx.font = "10px sans-serif";
      ctx.fillText("Mouse Speed", 93, 222);

      ctx.fillStyle = "#ef4444";
      ctx.fillRect(200, 215, 8, 8);
      ctx.fillText("Cursor Speed", 213, 222);
    } else {
      ctx.fillStyle = "#374151";
      ctx.font = "10px sans-serif";
      ctx.fillText("Cursor Speed (Colors match path)", 80, 222);
    }
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
    
    let maxVal = 180;
    let unit = "° IDE";
    if (selectedMetric === "movement_time_ms") {
       maxVal = 3000;
       unit = "ms";
    } else if (selectedMetric === "path_length_px") {
       maxVal = 2000;
       unit = "px";
    } else if (selectedMetric === "straightness_ratio") {
       maxVal = 2.0;
       unit = "ratio";
    }

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
      const val = (maxVal * (1 - i / 4));
      ctx.fillText((selectedMetric === "straightness_ratio" ? val.toFixed(2) : Math.round(val)) + " " + unit, 5, y + 3);
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

    // Plot Line (Reaching)
    ctx.beginPath();
    let first = true;
    trials.forEach((t, idx) => {
      let val = t[selectedMetric];
      if (val === undefined || val === null) val = 0;
      if (selectedMetric === "initial_direction_error_deg") val = Math.abs(val);
      
      const x = getX(idx);
      const y = 170 - (Math.min(maxVal, val) / maxVal) * 140;
      if (first) {
        ctx.moveTo(x, y);
        first = false;
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Plot dot coordinates
    trials.forEach((t, idx) => {
      const x = getX(idx);
      let val = t[selectedMetric];
      if (val === undefined || val === null) val = 0;
      if (selectedMetric === "initial_direction_error_deg") val = Math.abs(val);

      if (t.task_type === "tracking" && selectedMetric === "initial_direction_error_deg" && t.tracking_rmse_px !== undefined) {
        const y = 170 - (Math.min(60, t.tracking_rmse_px) / 60) * 140;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = "#10b981";
        ctx.fill();
      } else {
        const y = 170 - (Math.min(maxVal, val) / maxVal) * 140;
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, 2 * Math.PI);
        ctx.fillStyle = t.mapping_type === "identity" ? "#10b981" : "#2563eb";
        ctx.fill();
      }
    });

    // Legend
    ctx.fillStyle = "#2563eb";
    ctx.beginPath();
    ctx.arc(80, 215, 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = "#374151";
    ctx.fillText("Distorted Mapping Trial", 90, 219);

    ctx.fillStyle = "#10b981";
    ctx.beginPath();
    ctx.arc(230, 215, 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillText("Identity / Normal Mapping Trial", 240, 219);
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
  }, [participantData, selectedTrialIds, activeTab, analyticsTab, selectedMetric]);

  const saveConfig = async () => {
    await fetch(`/api/config?id=${config._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });
    setSaved(true);
    refreshData();
    setTimeout(() => setSaved(false), 3000);
  };

  const createSetup = async () => {
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Setup " + Math.floor(Math.random() * 1000) })
    });
    const json = await res.json();
    if (json.success) {
      setConfig(json.data);
      refreshData();
    }
  };

  const duplicateSetup = async () => {
    const { _id, ...duplicateData } = config;
    duplicateData.name = duplicateData.name + " (Copy)";
    duplicateData.isActive = false;
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(duplicateData)
    });
    const json = await res.json();
    if (json.success) {
      setConfig(json.data);
      refreshData();
    }
  };

  const deleteSetup = async () => {
    if (allConfigs.length <= 1) {
      alert("Cannot delete the last setup.");
      return;
    }
    if (confirm("Are you sure you want to delete this setup?")) {
      const res = await fetch(`/api/config?id=${config._id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setConfig(null);
        refreshData();
      } else {
        alert("Failed to delete: " + json.error);
      }
    }
  };

  const setActiveSetup = async () => {
    await fetch(`/api/config?id=${config._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true })
    });
    refreshData();
  };

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      setAuthError("");
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (data.success) {
        setAuthenticated(true);
      } else {
        setAuthError(data.error || "Invalid password");
      }
    } catch (e) {
      setAuthError("Failed to connect to server");
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100">
        <div className="bg-white p-8 shadow-xl rounded-2xl w-96 text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <LayoutDashboard size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-6 text-slate-800">Admin Login</h1>
          {authError && (
            <div className="bg-red-50 text-red-600 p-2 rounded-lg mb-4 text-sm font-semibold border border-red-100">
              {authError}
            </div>
          )}
          <input 
            type="password" 
            className="border-2 border-slate-200 p-3 rounded-lg w-full mb-4 focus:border-blue-500 focus:outline-none transition"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLogin();
            }}
          />
          <button 
            className="bg-blue-600 text-white px-4 py-3 rounded-lg w-full font-bold hover:bg-blue-700 transition disabled:opacity-50"
            onClick={handleLogin}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? "Logging in..." : "Login"}
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
            className={`flex items-center gap-3 p-3 rounded-lg font-medium transition ${activeTab === "settings" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}
            onClick={() => setActiveTab("settings")}
          >
            <Shield size={20} /> Consent & Privacy
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
        <div className="h-auto min-h-[4rem] bg-white border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between px-8 py-3 shadow-sm z-0 gap-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <h2 className="text-lg font-semibold capitalize whitespace-nowrap">
              {activeTab === "flow" ? "Experiment Flow Builder" : activeTab === "questionnaire" ? "Questionnaire Builder" : activeTab === "settings" ? "Privacy & Consent Settings" : "Analytics Dashboard"}
            </h2>
            
            {/* Setup Selector */}
            {activeTab !== "analytics" && config && allConfigs.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1.5 shadow-inner">
                <select 
                  className="bg-transparent border-none outline-none text-sm font-semibold text-slate-700 py-1 pl-2 pr-2 cursor-pointer focus:ring-0 max-w-[150px]"
                  value={config._id}
                  onChange={(e) => {
                    const selected = allConfigs.find(c => c._id === e.target.value);
                    if (selected) setConfig(selected);
                  }}
                >
                  {allConfigs.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.isActive ? '🟢 ' : ''}{c.name}
                    </option>
                  ))}
                </select>
                {/* Show current flow name */}
                {config && (
                  <span className="ml-2 text-sm font-medium text-slate-800">
                    Current Flow: {config.name || "Unnamed"}
                  </span>
                )}
                
                <input 
                  type="text"
                  className="w-32 bg-white border border-slate-200 rounded px-2 py-1 text-sm outline-none focus:border-blue-500 transition"
                  value={config.name || ""}
                  onChange={(e) => setConfig({...config, name: e.target.value})}
                  placeholder="Rename setup..."
                />

                <div className="flex border-l border-slate-300 pl-2 gap-1 ml-1">
                  <button onClick={createSetup} title="New Blank Setup" className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded transition"><PlusCircle size={16}/></button>
                  <button onClick={duplicateSetup} title="Duplicate Setup" className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded transition"><Copy size={16}/></button>
                  <button onClick={deleteSetup} title="Delete Setup" className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded transition"><Trash2 size={16}/></button>
                </div>
              </div>
            )}
          </div>

          {(activeTab === "flow" || activeTab === "questionnaire" || activeTab === "settings") && config && (
            <div className="flex gap-2">
              {!config.isActive && (
                <button 
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 transition"
                  onClick={setActiveSetup}
                >
                  <Star size={18} /> Set as Active
                </button>
              )}
              {config.isActive && (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg font-semibold border border-green-200 cursor-default">
                  <CheckCircle2 size={18} /> Active Setup
                </div>
              )}
              <button 
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-white transition ${saved ? 'bg-green-500' : 'bg-blue-600 hover:bg-blue-700'}`}
                onClick={saveConfig}
              >
                {saved ? <><CheckCircle2 size={18}/> Saved!</> : "Save Changes"}
              </button>
            </div>
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
                  key={config._id}
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

          {/* PRIVACY & CONSENT SETTINGS */}
          {activeTab === "settings" && config && (
            <div className="max-w-4xl mx-auto pb-20 space-y-8 animate-fadeIn">
              <div>
                <p className="text-slate-500">
                  Configure the Data Privacy Disclaimer shown to participants before the experiment starts.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Edit Form */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-lg text-slate-800 border-b pb-2">Disclaimer Information</h3>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Course Name</label>
                    <input 
                      type="text" 
                      className="w-full border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-2.5 rounded-lg outline-none text-sm transition"
                      value={config.courseName || ""}
                      placeholder="e.g. Scientific Research Methods: Foundations & Techniques"
                      onChange={(e) => setConfig({...config, courseName: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">University Name</label>
                    <input 
                      type="text" 
                      className="w-full border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-2.5 rounded-lg outline-none text-sm transition"
                      value={config.universityName || ""}
                      placeholder="e.g. Bielefeld University"
                      onChange={(e) => setConfig({...config, universityName: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contact Email</label>
                    <input 
                      type="email" 
                      className="w-full border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-2.5 rounded-lg outline-none text-sm transition"
                      value={config.contactEmail || ""}
                      placeholder="e.g. mohamed.hassine@uni-bielefeld.de"
                      onChange={(e) => setConfig({...config, contactEmail: e.target.value})}
                    />
                  </div>
                </div>

                {/* Preview Box */}
                <div className="border border-dashed border-slate-200 rounded-xl p-6 bg-slate-50/50 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Shield size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">Live Preview for Participants</span>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs text-xs text-slate-600 space-y-3.5 select-none">
                      <div className="flex items-center gap-2 text-slate-900 font-bold border-b pb-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        Data Privacy Disclaimer (Preview)
                      </div>
                      
                      <p className="leading-relaxed">
                        <strong>Purpose:</strong> This data is collected purely for a university project in the <em>{config.courseName || "[Course Name]"}</em> course at <strong>{config.universityName || "[University Name]"}</strong>...
                      </p>
                      <p className="leading-relaxed">
                        <strong>Anonymity:</strong> We do not collect any PII (names, IPs, emails, exact locations). Mouse data is completely anonymized.
                      </p>
                      <p className="leading-relaxed">
                        <strong>Retention:</strong> The data will be stored securely, viewed only by the project team/instructor, and deleted after the project is graded.
                      </p>
                      <p className="leading-relaxed">
                        <strong>Contact:</strong> <span className="text-blue-600 font-semibold">{config.contactEmail || "[Your University Email]"}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-[11px] text-slate-400 mt-4 leading-normal">
                    * Click <b>Save Changes</b> in the top right to save these settings to the database.
                  </div>
                </div>
              </div>
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
                          <div className="flex items-center gap-1.5">
                            {p.finished ? (
                              <span className="text-[9px] bg-green-50 border border-green-200 text-green-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                Finished
                              </span>
                            ) : (
                              <span className="text-[9px] bg-amber-50 border border-amber-200 text-amber-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                Incomplete
                              </span>
                            )}
                            <span className="text-[9px] bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded capitalize font-semibold">
                              {p.input_device || "mouse"}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          Started: {new Date(p.created_at).toLocaleString()}
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
              <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden">
                {selectedParticipant && participantData ? (
                  <>
                    <div className="flex justify-between items-center border-b p-4 bg-slate-50">
                      <h3 className="font-bold text-xl text-slate-800">ID: {selectedParticipant}</h3>
                      <span className="bg-blue-100 text-blue-800 font-semibold px-3 py-1 rounded-full text-xs uppercase tracking-wide">
                        Device: {participantData.trials[0]?.pinfo?.input_device || "Mouse"}
                      </span>
                    </div>
                    
                    {/* Sub-Tabs */}
                    <div className="flex gap-1 p-2 bg-white border-b">
                      {["overview", "adaptation", "aftereffect", "strategy", "replay", "export"].map(tab => (
                        <button
                          key={tab}
                          onClick={() => setAnalyticsTab(tab)}
                          className={`px-4 py-2 text-xs font-bold capitalize rounded-md transition ${analyticsTab === tab ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    <div className="p-6 overflow-auto flex-1 bg-white">
                      
                      {/* OVERVIEW TAB */}
                      {analyticsTab === "overview" && (
                        <div className="flex flex-col gap-6 animate-fadeIn">
                           <div className="grid grid-cols-4 gap-4">
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                              <p className="text-xs text-slate-400 uppercase font-semibold">Total Trials</p>
                              <p className="text-2xl font-bold text-slate-800">{participantData.trials.length}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                              <p className="text-xs text-slate-400 uppercase font-semibold">Avg Movement Time</p>
                              <p className="text-2xl font-bold text-slate-800">
                                {Math.round(participantData.trials.reduce((acc, t) => acc + (t.movement_time_ms || 0), 0) / (participantData.trials.length || 1))} ms
                              </p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                              <p className="text-xs text-slate-400 uppercase font-semibold">Avg Reaction Time</p>
                              <p className="text-2xl font-bold text-slate-800">
                                {Math.round(participantData.trials.reduce((acc, t) => acc + (t.reaction_time_ms || 0), 0) / (participantData.trials.length || 1))} ms
                              </p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                              <p className="text-xs text-slate-400 uppercase font-semibold">Avg Directness</p>
                              <p className="text-2xl font-bold text-slate-800">
                                {(participantData.trials.reduce((acc, t) => acc + (t.straightness_ratio || 1.0), 0) / (participantData.trials.length || 1) * 100).toFixed(0)}%
                              </p>
                            </div>
                          </div>
                          
                          <h4 className="font-bold text-lg mb-2 text-slate-800 border-b pb-2">Questionnaire Answers</h4>
                          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                            <pre className="text-sm text-slate-700 whitespace-pre-wrap">
                              {JSON.stringify(participantData.questionnaire || {}, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                      
                      {/* ADAPTATION CURVE TAB */}
                      {analyticsTab === "adaptation" && (
                        <div className="flex flex-col gap-4 animate-fadeIn">
                           <div className="flex justify-between items-center">
                             <h4 className="font-bold text-sm text-slate-500 uppercase tracking-wide">Learning Curve (Adaptation Progress)</h4>
                             <select 
                               className="border border-slate-200 text-xs rounded p-2 bg-white"
                               value={selectedMetric}
                               onChange={e => setSelectedMetric(e.target.value)}
                             >
                               <option value="initial_direction_error_deg">Initial Direction Error (deg)</option>
                               <option value="movement_time_ms">Movement Time (ms)</option>
                               <option value="path_length_px">Path Length (px)</option>
                               <option value="straightness_ratio">Straightness Ratio</option>
                             </select>
                           </div>
                           <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50 p-4 flex justify-center">
                             <canvas ref={adaptationCanvasRef} width={750} height={250} className="border bg-white shadow-sm rounded-lg"></canvas>
                           </div>
                           <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100">
                             <strong>Tip:</strong> Look for a gradual exponential decay in error over time. A sudden drop might indicate the participant discovered an explicit strategy.
                           </div>
                        </div>
                      )}

                      {/* AFTEREFFECT TAB */}
                      {analyticsTab === "aftereffect" && (
                        <div className="flex flex-col gap-6 animate-fadeIn">
                          <h4 className="font-bold text-sm text-slate-500 uppercase tracking-wide">Aftereffect Analysis</h4>
                          <p className="text-sm text-slate-600">
                            Comparing the last 5 distorted mapping trials with the first 5 return-to-normal (identity) trials.
                          </p>
                          <div className="grid grid-cols-2 gap-6">
                            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                               <h5 className="font-bold mb-2">Late Adaptation</h5>
                               <ul className="text-sm space-y-1">
                                 {participantData.trials.filter(t => t.mapping_type !== "identity").slice(-5).map((t, i) => (
                                   <li key={i} className="flex justify-between border-b border-slate-200 pb-1">
                                     <span className="text-slate-500">Trial {t.trial_id}</span>
                                     <span className="font-bold">{t.initial_direction_error_deg?.toFixed(1)}° IDE</span>
                                   </li>
                                 ))}
                               </ul>
                            </div>
                            <div className="border border-slate-200 rounded-lg p-4 bg-blue-50">
                               <h5 className="font-bold mb-2 text-blue-800">Early Washout (Aftereffect)</h5>
                               <ul className="text-sm space-y-1">
                                 {participantData.trials.filter(t => t.mapping_type === "identity" && t.block_id?.toLowerCase().includes('washout')).slice(0, 5).map((t, i) => (
                                   <li key={i} className="flex justify-between border-b border-blue-200 pb-1 text-blue-900">
                                     <span>Trial {t.trial_id}</span>
                                     <span className="font-bold">{t.initial_direction_error_deg?.toFixed(1)}° IDE</span>
                                   </li>
                                 ))}
                               </ul>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* STRATEGY TAB */}
                      {analyticsTab === "strategy" && (
                        <div className="flex flex-col gap-4 animate-fadeIn">
                          <h4 className="font-bold text-sm text-slate-500 uppercase tracking-wide">Rule-based Strategy Exploration</h4>
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm overflow-auto max-h-96">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="border-b">
                                  <th className="pb-2">Trial</th>
                                  <th className="pb-2">Mapping</th>
                                  <th className="pb-2">IDE (°)</th>
                                  <th className="pb-2">Straightness</th>
                                  <th className="pb-2">Reversals</th>
                                  <th className="pb-2">Detected Strategy</th>
                                </tr>
                              </thead>
                              <tbody>
                                {participantData.trials.map(t => (
                                  <tr key={t._id} className="border-b border-slate-100 hover:bg-white">
                                    <td className="py-2">{t.trial_id}</td>
                                    <td className="py-2 text-slate-500">{t.mapping_type}</td>
                                    <td className="py-2">{t.initial_direction_error_deg?.toFixed(1)}</td>
                                    <td className="py-2">{(t.straightness_ratio || 1.0).toFixed(2)}</td>
                                    <td className="py-2">{t.num_direction_reversals}</td>
                                    <td className="py-2">
                                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                        t.strategy === 'direct' ? 'bg-green-100 text-green-800' :
                                        t.strategy === 'maladaptive correction' ? 'bg-red-100 text-red-800' :
                                        t.strategy === 'random exploration' ? 'bg-orange-100 text-orange-800' :
                                        t.strategy === 'hesitant/slow' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-blue-100 text-blue-800'
                                      }`}>
                                        {t.strategy}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* REPLAY TAB */}
                      {analyticsTab === "replay" && (
                        <div className="grid grid-cols-3 gap-6 animate-fadeIn">
                          <div className="col-span-2">
                            <h4 className="font-bold text-sm text-slate-500 uppercase tracking-wide mb-3">Continuous Trajectory Spaghetti Map</h4>
                            <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50 p-4 flex justify-center">
                              <canvas ref={canvasRef} width={800} height={600} className="border bg-white shadow-sm rounded-lg max-w-full h-auto"></canvas>
                            </div>
                          </div>
                          <div className="col-span-1 flex flex-col gap-4">
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">Select Trials to Inspect</label>
                                <select 
                                  className="border border-slate-200 text-xs rounded p-1 text-slate-600 bg-white shadow-sm outline-none"
                                  value={trialFilterType}
                                  onChange={e => setTrialFilterType(e.target.value)}
                                >
                                  <option value="all">All Types</option>
                                  <option value="reaching">Reaching</option>
                                  <option value="tracking">Tracking</option>
                                </select>
                              </div>
                              <div className="border border-slate-200 rounded-lg bg-slate-50 max-h-48 overflow-y-auto p-2 flex flex-col gap-1">
                                {participantData.trials
                                  .filter(t => trialFilterType === "all" || t.task_type === trialFilterType)
                                  .map((t) => {
                                    const trialKey = t._id;
                                    const isSelected = selectedTrialIds.includes(trialKey);
                                    const color = isSelected ? getHighlightColor(selectedTrialIds.indexOf(trialKey)) : "transparent";
                                    return (
                                      <label key={t._id} className="flex items-center gap-2 p-1 hover:bg-slate-100 rounded cursor-pointer text-sm">
                                        <input 
                                          type="checkbox" 
                                          className="rounded text-blue-500 focus:ring-blue-500"
                                          checked={isSelected}
                                          onChange={(e) => {
                                            if (e.target.checked) setSelectedTrialIds([...selectedTrialIds, trialKey]);
                                            else setSelectedTrialIds(selectedTrialIds.filter(id => id !== trialKey));
                                          }}
                                        />
                                        <div className="w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: color }}></div>
                                        <span className="text-slate-700">Trial {t.trial_id} <span className="text-slate-400 text-xs">({t.task_type || "reaching"})</span></span>
                                      </label>
                                    );
                                })}
                              </div>
                              <div className="flex gap-4 mt-2">
                                <button 
                                  className="text-xs text-blue-500 hover:underline" 
                                  onClick={() => {
                                    const filteredTrials = participantData.trials.filter(t => trialFilterType === "all" || t.task_type === trialFilterType);
                                    setSelectedTrialIds(filteredTrials.map(t => t._id));
                                  }}
                                >
                                  Select All
                                </button>
                                {selectedTrialIds.length > 0 && (
                                  <button className="text-xs text-blue-500 hover:underline" onClick={() => setSelectedTrialIds([])}>Clear Selection</button>
                                )}
                              </div>
                            </div>
                            
                            {/* Velocity Profile Canvas */}
                            <div>
                              <h5 className="font-bold text-xs text-slate-400 uppercase tracking-wide mb-2">Instantaneous Velocity Profile</h5>
                              <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50 p-2 flex justify-center">
                                <canvas ref={velocityCanvasRef} width={400} height={250} className="border bg-white shadow-sm rounded-lg max-w-full h-auto"></canvas>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* EXPORT TAB */}
                      {analyticsTab === "export" && (
                        <div className="flex flex-col gap-6 animate-fadeIn">
                           <h4 className="font-bold text-sm text-slate-500 uppercase tracking-wide mb-2">Export Data for External Analysis</h4>
                           <p className="text-sm text-slate-600 mb-4">
                             Download data in CSV format for R/Python analysis, or JSON format for full hierarchical metadata.
                           </p>
                           
                           <div className="grid grid-cols-2 gap-4">
                             <div className="border border-slate-200 rounded-lg p-6 bg-slate-50 flex flex-col gap-4 items-start">
                               <div>
                                 <h5 className="font-bold text-slate-800">Trial Summaries</h5>
                                 <p className="text-xs text-slate-500">Contains aggregated metrics per trial (reaction time, error, strategy)</p>
                               </div>
                               <div className="flex gap-2">
                                 <button onClick={() => downloadCSV(participantData.trials, `trials_${selectedParticipant}.csv`)} className="px-4 py-2 bg-blue-600 text-white rounded font-bold text-sm hover:bg-blue-700">Download CSV</button>
                                 <button onClick={() => downloadJSON(participantData.trials, `trials_${selectedParticipant}.json`)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded font-bold text-sm hover:bg-slate-300">Download JSON</button>
                               </div>
                             </div>

                             <div className="border border-slate-200 rounded-lg p-6 bg-slate-50 flex flex-col gap-4 items-start">
                               <div>
                                 <h5 className="font-bold text-slate-800">Raw Movements</h5>
                                 <p className="text-xs text-slate-500">100Hz time-series data of mouse and cursor positions</p>
                               </div>
                               <div className="flex gap-2">
                                 <button onClick={() => downloadCSV(participantData.movements, `movements_${selectedParticipant}.csv`)} className="px-4 py-2 bg-blue-600 text-white rounded font-bold text-sm hover:bg-blue-700">Download CSV</button>
                                 <button onClick={() => downloadJSON(participantData.movements, `movements_${selectedParticipant}.json`)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded font-bold text-sm hover:bg-slate-300">Download JSON</button>
                               </div>
                             </div>
                             
                             <div className="border border-slate-200 rounded-lg p-6 bg-slate-50 flex flex-col gap-4 items-start col-span-2">
                               <div>
                                 <h5 className="font-bold text-slate-800">Questionnaire</h5>
                                 <p className="text-xs text-slate-500">Participant answers</p>
                               </div>
                               <button onClick={() => downloadJSON(participantData.questionnaire, `questionnaire_${selectedParticipant}.json`)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded font-bold text-sm hover:bg-slate-300">Download JSON</button>
                             </div>
                           </div>
                        </div>
                      )}
                      
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col gap-6 justify-center p-8">
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
                            <tr className="border-b text-slate-400 font-bold uppercase tracking-wider text-[10px] pb-2">
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
