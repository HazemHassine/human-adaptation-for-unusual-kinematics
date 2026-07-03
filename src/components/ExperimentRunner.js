"use client";

import React, { useState, useEffect } from "react";
import CanvasTask from "./CanvasTask";
import { Shield, Info, Lock, EyeOff, Mail, Check, Star, Zap, Target } from "lucide-react";
import confetti from "canvas-confetti";

export default function ExperimentRunner({ devMode }) {
  const [phase, setPhase] = useState("LOADING"); // LOADING, START, INSTRUCTIONS, TASK, BLOCK_BREAK, QUESTIONNAIRE, END
  const [blocks, setBlocks] = useState([]);
  const [questionnaire, setQuestionnaire] = useState([]);
  const [participant, setParticipant] = useState({ participant_id: "", session_id: "", input_device: "mouse" });
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [blockStats, setBlockStats] = useState({ accuracy: 0, avgSpeed: 0, score: 0 });
  const [disclaimerConfig, setDisclaimerConfig] = useState({
    courseName: "Scientific Research Methods: Foundations & Techniques",
    universityName: "Bielefeld University",
    contactEmail: "mohamed.hassine@uni-bielefeld.de"
  });

  useEffect(() => {
    fetch("/api/config")
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setBlocks(json.data.blocks);
          setQuestionnaire(json.data.questionnaire);
          if (json.data.courseName) {
            setDisclaimerConfig({
              courseName: json.data.courseName,
              universityName: json.data.universityName,
              contactEmail: json.data.contactEmail
            });
          }
          setPhase("START");
        } else {
          setErrorMsg(json.error || "Failed to load config.");
        }
      })
      .catch(err => {
        setErrorMsg(err.message);
      });
  }, []);

  useEffect(() => {
    setParticipant(prev => {
      let rawId = prev.participant_id;
      if (rawId.startsWith("dev_")) {
        rawId = rawId.substring(4);
      }
      if (!rawId) {
        const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        let randomStr = "";
        for (let i = 0; i < 6; i++) {
          randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        rawId = `part_${randomStr}`;
      }
      return {
        ...prev,
        participant_id: devMode ? `dev_${rawId}` : rawId
      };
    });
  }, [devMode]);

  useEffect(() => {
    if (phase === "BLOCK_BREAK" || phase === "END") {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
      });
    }
  }, [phase]);
  
  const handleStart = async (e) => {
    e.preventDefault();
    const sessionId = "sess_" + Date.now();
    const partData = {
      participant_id: participant.participant_id || "Anonymous",
      session_id: sessionId,
      condition_order: "rotation_first",
      input_device: participant.input_device || "mouse",
    };
    
    setParticipant(partData);

    await fetch("/api/participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partData)
    });

    setPhase("INSTRUCTIONS");
  };

  const handleTaskComplete = (movements, trialLogs) => {
    // Add participant info to logs
    const mappedMovements = movements.map(m => ({ ...m, participant_id: participant.participant_id, session_id: participant.session_id }));
    const mappedTrials = trialLogs.map(t => ({ 
      ...t, 
      participant_id: participant.participant_id, 
      session_id: participant.session_id,
      block_id: blocks[currentBlockIndex].id,
      mapping_type: blocks[currentBlockIndex].mapping,
      condition: blocks[currentBlockIndex].condition
    }));

    // Calculate block stats for gamification
    if (trialLogs.length > 0) {
      const avgSpeed = Math.round(trialLogs.reduce((acc, t) => acc + (t.reaction_time_ms || 0), 0) / trialLogs.length);
      const avgStraightness = trialLogs.reduce((acc, t) => acc + (t.straightness_ratio || 0), 0) / trialLogs.length;
      const accuracy = Math.round(avgStraightness * 100);
      const score = Math.round(accuracy * 10) + Math.round(10000 / (avgSpeed + 1));
      setBlockStats({ accuracy: isNaN(accuracy) ? 0 : accuracy, avgSpeed: isNaN(avgSpeed) ? 0 : avgSpeed, score: isNaN(score) ? 0 : score });
    }

    // Send data asynchronously in the background so it doesn't block the UI transition
    if (mappedMovements.length > 0) {
      fetch("/api/movements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mappedMovements) }).catch(console.error);
    }
    if (mappedTrials.length > 0) {
      fetch("/api/trials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mappedTrials) }).catch(console.error);
    }

    if (currentBlockIndex < blocks.length - 1) {
      setPhase("BLOCK_BREAK");
    } else {
      setPhase("QUESTIONNAIRE");
    }
  };

  if (phase === "LOADING") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-black">
        {errorMsg ? (
          <div className="bg-red-100 text-red-700 p-6 rounded shadow-md max-w-md text-center">
            <h2 className="font-bold text-lg mb-2">Database Connection Error</h2>
            <p>{errorMsg}</p>
            <p className="mt-4 text-sm">Please ensure you have configured your <b>MONGODB_URI</b> in <code>.env.local</code> or that a local MongoDB instance is running on port 27017.</p>
          </div>
        ) : (
          <div>
            <div className="bg-white p-6 rounded shadow-md animate-pulse text-gray-700" style={{ animationDuration: "500ms" }}>Loading configuration...</div>
          </div>
        )}
      </div>
    );
  }

  if (phase === "START") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800 font-sans selection:bg-blue-100">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-4xl overflow-hidden flex flex-col md:flex-row">
          
          {/* Left Column: Data Privacy Disclaimer */}
          <div className="md:w-7/12 p-8 bg-slate-50/50 border-r border-slate-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 shadow-xs">
                  <Shield size={22} />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Data Privacy Disclaimer</h2>
              </div>
              
              <div className="space-y-4 text-xs md:text-sm text-slate-600">
                {/* Anonymity */}
                <div className="flex gap-3">
                  <div className="mt-0.5 text-blue-600 shrink-0">
                    <EyeOff size={16} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-0.5">Complete Anonymity</h3>
                    <p className="leading-relaxed">
                      We do <strong>not</strong> collect any Personal Identifiable Information (PII) like names, IP addresses, emails, or exact locations. All data is completely anonymized. It is impossible to link the mouse tracking data back to you personally.
                    </p>
                  </div>
                </div>

                {/* Purpose */}
                <div className="flex gap-3">
                  <div className="mt-0.5 text-blue-600 shrink-0">
                    <Info size={16} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-0.5">Purpose of the Study</h3>
                    <p className="leading-relaxed">
                      This data is collected purely for a university project in the <em>{disclaimerConfig.courseName}</em> course at <strong>{disclaimerConfig.universityName}</strong> to analyze motor adaptation strategies.
                    </p>
                  </div>
                </div>

                {/* Data Handling */}
                <div className="flex gap-3">
                  <div className="mt-0.5 text-blue-600 shrink-0">
                    <Lock size={16} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-0.5">Secure Data Handling</h3>
                    <p className="leading-relaxed">
                      The data will be stored securely in our database, viewed only by the project team/course instructor, and deleted after the project is graded.
                    </p>
                  </div>
                </div>

                {/* Right to Withdraw */}
                <div className="flex gap-3">
                  <div className="mt-0.5 text-blue-600 shrink-0">
                    <svg className="w-[16px] h-[16px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-0.5">Voluntary Participation & Withdrawal</h3>
                    <p className="leading-relaxed">
                      Participation is completely voluntary. You can stop the experiment at any time by closing the tab. No data will be saved if you quit early.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex items-start gap-2.5 text-[11px] text-slate-400 leading-normal">
              <Mail size={14} className="text-slate-400 shrink-0 mt-0.5" />
              <span>
                If you have any questions, you can contact the project student team at:{" "}
                <a href={`mailto:${disclaimerConfig.contactEmail}`} className="text-blue-600 hover:underline font-semibold whitespace-nowrap">
                  {disclaimerConfig.contactEmail}
                </a>
              </span>
            </div>
          </div>

          {/* Right Column: Start Form & Consent */}
          <div className="md:w-5/12 p-8 flex flex-col justify-center bg-white">
            <h1 className="text-xl font-bold text-slate-900 mb-1">Mouse Kinematics Study</h1>
            <p className="text-xs text-slate-400 mb-6">Select your input device and accept the consent terms to start.</p>

            <form onSubmit={handleStart} className="space-y-4">

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Input Device</label>
                <select 
                  className="w-full border border-slate-200 focus:border-blue-500 focus:ring-3 focus:ring-blue-50/50 p-2.5 rounded-xl text-slate-900 bg-white outline-none transition font-medium text-sm"
                  value={participant.input_device}
                  onChange={e => setParticipant({...participant, input_device: e.target.value})}
                >
                  <option value="mouse">Mouse</option>
                  <option value="trackpad">Trackpad</option>
                </select>
              </div>

              {/* Consent Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer group">
                  <div className="relative flex items-center mt-0.5">
                    <input 
                      type="checkbox" 
                      className="peer sr-only"
                      checked={consentChecked}
                      onChange={() => setConsentChecked(!consentChecked)}
                      required
                    />
                    <div className="w-[18px] h-[18px] border border-slate-300 peer-checked:border-blue-600 peer-checked:bg-blue-600 rounded flex items-center justify-center transition group-hover:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                      {consentChecked && <Check size={12} className="text-white stroke-[3.5]" />}
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 leading-normal select-none group-hover:text-slate-500 transition">
                    I agree to participate in this study. I understand that my interaction data (mouse movements, response times) will be collected anonymously and used solely for academic purposes. I can close the browser at any time to withdraw.
                  </span>
                </label>
              </div>

              <button 
                type="submit" 
                disabled={!consentChecked}
                className={`w-full p-3 rounded-xl font-bold text-sm shadow-xs transition-all duration-200 select-none ${
                  consentChecked 
                    ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer hover:shadow-md active:scale-[0.98]" 
                    : "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none"
                }`}
              >
                Start Experiment
              </button>
            </form>
          </div>
          
        </div>
      </div>
    );
  }

  if (phase === "INSTRUCTIONS") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 text-slate-800">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 max-w-2xl w-full">
          <h2 className="text-2xl font-bold mb-6 text-slate-900 border-b pb-4 flex items-center gap-2">
            <Target className="text-blue-600" /> How to Play
          </h2>
          
          <div className="space-y-6 text-slate-600">
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 mt-1">1</div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Lock Your Cursor</h3>
                <p>When the task starts, you will see a canvas. <strong>Click anywhere on it</strong> to lock your mouse cursor inside the game window. You can press <kbd className="bg-slate-100 border border-slate-200 px-1 rounded mx-1">ESC</kbd> at any time if you need to pause or unlock your mouse.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 mt-1">2</div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Start the Trial</h3>
                <p>Move your red cursor into the <strong>black starting circle</strong> in the very center. Hold it there until a blue target circle appears on the edge of the screen.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 mt-1">3</div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Shoot for the Target!</h3>
                <p>Move your cursor directly into the blue target as fast and as straight as you can. Sometimes the cursor might behave unpredictably (like a mirror or rotated controls) — try your best to adapt!</p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
            <button 
              onClick={() => setPhase("TASK")} 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition transform hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              I Understand, Let's Go! <Zap size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "TASK") {
    const block = blocks[currentBlockIndex];
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <CanvasTask key={block.id} block={block} devMode={devMode} seed={participant.session_id} onComplete={handleTaskComplete} />
      </div>
    );
  }

  if (phase === "BLOCK_BREAK") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-blue-50">
            <Star size={40} className="fill-current text-yellow-400 stroke-yellow-500" />
          </div>
          <h2 className="text-3xl font-black mb-2 text-slate-900 tracking-tight">Block Completed!</h2>
          <p className="mb-6 text-slate-500 font-medium">
            Great job! You have conquered this block.
          </p>

          <div className="bg-slate-50 rounded-xl p-4 flex justify-between gap-4 mb-8 border border-slate-100">
            <div className="flex flex-col items-center flex-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Accuracy</span>
              <span className="text-2xl font-black text-blue-600">{blockStats.accuracy}%</span>
            </div>
            <div className="w-px bg-slate-200"></div>
            <div className="flex flex-col items-center flex-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Avg Speed</span>
              <span className="text-2xl font-black text-emerald-600">{blockStats.avgSpeed}ms</span>
            </div>
            <div className="w-px bg-slate-200"></div>
            <div className="flex flex-col items-center flex-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Score</span>
              <span className="text-2xl font-black text-purple-600">{blockStats.score}</span>
            </div>
          </div>

          <button 
            onClick={() => {
              setCurrentBlockIndex(i => i + 1);
              setPhase("TASK");
            }} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold text-lg shadow-md transition transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Start Next Block
          </button>
        </div>
      </div>
    );
  }

  if (phase === "QUESTIONNAIRE") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 text-black">
        <div className="bg-white p-8 rounded shadow-md max-w-lg w-full">
          <h2 className="text-xl font-bold mb-4">Post-Experiment Questionnaire</h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const data = new FormData(e.target);
            const formAnswers = {};
            questionnaire.forEach(q => {
              formAnswers[q.id] = data.get(q.id);
            });
            await fetch("/api/questionnaires", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                participant_id: participant.participant_id,
                session_id: participant.session_id,
                condition: "both",
                ...formAnswers
              })
            });
            setPhase("END");
          }} className="flex flex-col gap-4">
            {questionnaire.map((q) => (
              <label key={q.id} className="flex flex-col">
                {q.question}
                {q.type === "text" && <textarea name={q.id} className="border p-2 rounded mt-1" required></textarea>}
                {q.type === "select" && (
                  <select name={q.id} className="border p-2 rounded mt-1" required>
                    {q.options.map((opt, idx) => <option key={idx} value={opt}>{opt}</option>)}
                  </select>
                )}
              </label>
            ))}
            <button type="submit" className="bg-blue-600 text-white p-2 rounded">Submit</button>
          </form>
        </div>
      </div>
    );
  }

  if (phase === "END") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800 font-sans">
        <div className="bg-white p-10 rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-emerald-500 to-purple-500"></div>
          <h2 className="text-4xl font-black mb-4 text-slate-900">Thank You! 🎉</h2>
          <p className="text-lg text-slate-600 mb-6 font-medium">
            You've successfully completed the entire experiment.
          </p>
          <p className="text-sm text-slate-500 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
            Your participation provides invaluable data for our motor learning research. You may now close this browser tab. Have a wonderful day!
          </p>
        </div>
      </div>
    );
  }

  return null;
}
