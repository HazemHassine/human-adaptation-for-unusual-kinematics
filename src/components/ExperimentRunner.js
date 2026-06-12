"use client";

import React, { useState, useEffect } from "react";
import CanvasTask from "./CanvasTask";

export default function ExperimentRunner({ devMode }) {
  const [phase, setPhase] = useState("LOADING"); // LOADING, START, INSTRUCTIONS, TASK, QUESTIONNAIRE, END
  const [blocks, setBlocks] = useState([]);
  const [questionnaire, setQuestionnaire] = useState([]);
  const [participant, setParticipant] = useState({ participant_id: "", session_id: "", input_device: "mouse" });
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/config")
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setBlocks(json.data.blocks);
          setQuestionnaire(json.data.questionnaire);
          setPhase("START");
        } else {
          setErrorMsg(json.error || "Failed to load config.");
        }
      })
      .catch(err => {
        setErrorMsg(err.message);
      });
  }, []);
  
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

  const handleTaskComplete = async (movements, trialLogs) => {
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

    // Send data
    if (mappedMovements.length > 0) {
      await fetch("/api/movements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mappedMovements) });
    }
    if (mappedTrials.length > 0) {
      await fetch("/api/trials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mappedTrials) });
    }

    if (currentBlockIndex < blocks.length - 1) {
      setCurrentBlockIndex(i => i + 1);
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
          <div className="bg-white p-6 rounded shadow-md">Loading configuration...</div>
        )}
      </div>
    );
  }

  if (phase === "START") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-black">Mouse Kinematics Study</h1>
          <p className="mb-4 text-gray-600">Please enter your anonymous participant code.</p>
          <form onSubmit={handleStart} className="flex flex-col gap-4">
            <input 
              type="text" 
              placeholder="Participant ID" 
              className="border p-2 rounded text-black"
              value={participant.participant_id}
              onChange={e => setParticipant({...participant, participant_id: e.target.value})}
              required
            />
            <div className="flex flex-col gap-1 text-left">
              <label className="text-sm font-semibold text-gray-700">Input Device</label>
              <select 
                className="border p-2 rounded text-black bg-white"
                value={participant.input_device}
                onChange={e => setParticipant({...participant, input_device: e.target.value})}
              >
                <option value="mouse">Mouse</option>
                <option value="trackpad">Trackpad</option>
              </select>
            </div>
            <button type="submit" className="bg-blue-600 text-white p-2 rounded">Start Experiment</button>
          </form>
        </div>
      </div>
    );
  }

  if (phase === "INSTRUCTIONS") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 text-black">
        <div className="bg-white p-8 rounded shadow-md max-w-lg text-center">
          <h2 className="text-xl font-bold mb-4">Instructions</h2>
          <p className="mb-4 text-gray-700 text-left">
            In this task, you will use your mouse to move a red cursor into a blue target circle.
            The target will only appear once you move into the black start circle in the center.
            Sometimes the mouse will behave differently. Try your best to reach the targets as quickly as possible.
          </p>
          <button onClick={() => setPhase("TASK")} className="bg-blue-600 text-white p-2 rounded px-6">I Understand</button>
        </div>
      </div>
    );
  }

  if (phase === "TASK") {
    const block = blocks[currentBlockIndex];
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <CanvasTask key={block.id} block={block} devMode={devMode} onComplete={handleTaskComplete} />
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-black">
        <div className="bg-white p-8 rounded shadow-md max-w-md text-center">
          <h2 className="text-xl font-bold mb-4">Thank You!</h2>
          <p>The experiment is complete and your data has been saved securely.</p>
        </div>
      </div>
    );
  }

  return null;
}
