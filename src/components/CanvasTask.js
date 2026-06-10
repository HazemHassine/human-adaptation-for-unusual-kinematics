"use client";

import React, { useState, useEffect, useRef } from "react";

export default function CanvasTask({ block, devMode, onComplete }) {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState("start_circle"); // start_circle, moving
  const [target, setTarget] = useState(null);
  const [trialCount, setTrialCount] = useState(0);
  
  // Track movement
  const cursorRef = useRef({ x: 400, y: 300 });
  const startCircle = { x: 400, y: 300, radius: 20 };
  
  // Save movement logs
  const movements = useRef([]);
  // Save trial logs
  const trialLogs = useRef([]);
  
  const [timestampStart, setTimestampStart] = useState(0);
  const trialStartTime = useRef(0);

  // Constants
  const TARGET_DISTANCE = 150;
  const DIRECTIONS = [0, 45, 90, 135, 180, 225, 270, 315];
  
  // We'll generate a random target
  const spawnTarget = () => {
    const angleDeg = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    const angleRad = (angleDeg * Math.PI) / 180;
    setTarget({
      x: 400 + TARGET_DISTANCE * Math.cos(angleRad),
      y: 300 - TARGET_DISTANCE * Math.sin(angleRad), // y inverted in canvas
      radius: 15,
      angleDeg
    });
    trialStartTime.current = performance.now();
  };

  useEffect(() => {
    setTimestampStart(performance.now());
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    let animationFrameId;
    
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw Start Circle
      ctx.beginPath();
      ctx.arc(startCircle.x, startCircle.y, startCircle.radius, 0, 2 * Math.PI);
      ctx.strokeStyle = "black";
      ctx.stroke();

      // Draw Target
      if (target) {
        ctx.beginPath();
        ctx.arc(target.x, target.y, target.radius, 0, 2 * Math.PI);
        ctx.fillStyle = "blue";
        ctx.fill();
      }

      // Draw Cursor
      ctx.beginPath();
      ctx.arc(cursorRef.current.x, cursorRef.current.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "red";
      ctx.fill();

      // Draw Debug Info if Dev Mode
      if (devMode) {
        ctx.fillStyle = "black";
        ctx.font = "14px Arial";
        ctx.fillText(`Mapping: ${block.mapping}`, 10, 20);
        ctx.fillText(`Trial: ${trialCount} / ${block.trials}`, 10, 40);
        
        // Draw path trace
        if (movements.current.length > 0) {
          ctx.beginPath();
          ctx.moveTo(movements.current[0].cursor_x, movements.current[0].cursor_y);
          for (let i = 1; i < movements.current.length; i++) {
             // Only draw path for current trial
             if (movements.current[i].trial_id === trialCount) {
               ctx.lineTo(movements.current[i].cursor_x, movements.current[i].cursor_y);
             } else if (movements.current[i].trial_id > trialCount) {
               break;
             }
          }
          ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
          ctx.stroke();
        }
      }

      // Hit detection
      if (target) {
        const dist = Math.hypot(cursorRef.current.x - target.x, cursorRef.current.y - target.y);
        if (dist < target.radius) {
          // Success
          trialLogs.current.push({
            trial_id: trialCount,
            target_angle_deg: target.angleDeg,
            target_distance_px: TARGET_DISTANCE,
            success: 1,
            movement_time_ms: performance.now() - trialStartTime.current
          });
          setTrialCount(c => c + 1);
          setTarget(null);
          setPhase("start_circle");
          cursorRef.current = { x: 400, y: 300 }; // reset to center visually to speed up
        }
      } else if (phase === "start_circle") {
        const dist = Math.hypot(cursorRef.current.x - startCircle.x, cursorRef.current.y - startCircle.y);
        if (dist < startCircle.radius) {
          // wait inside
          setPhase("moving");
          spawnTarget();
        }
      }
      
      animationFrameId = requestAnimationFrame(render);
    };
    
    render();
    
    return () => cancelAnimationFrame(animationFrameId);
  }, [target, phase, trialCount]);

  useEffect(() => {
    if (trialCount >= block.trials) {
      onComplete(movements.current, trialLogs.current);
    }
  }, [trialCount]);

  // Handle Mouse Movement Transformation
  useEffect(() => {
    const handleMouseMove = (e) => {
      const { movementX: dx, movementY: dy } = e;
      
      let cursorDx = dx;
      let cursorDy = dy;
      
      if (block.mapping === "rotation_45") {
        const rad = (45 * Math.PI) / 180;
        cursorDx = Math.cos(rad) * dx - Math.sin(rad) * dy;
        cursorDy = Math.sin(rad) * dx + Math.cos(rad) * dy;
      } else if (block.mapping === "rotation_60") {
        const rad = (60 * Math.PI) / 180;
        cursorDx = Math.cos(rad) * dx - Math.sin(rad) * dy;
        cursorDy = Math.sin(rad) * dx + Math.cos(rad) * dy;
      } else if (block.mapping === "mirror_horizontal") {
        cursorDx = -dx;
        cursorDy = dy;
      }

      cursorRef.current.x += cursorDx;
      cursorRef.current.y += cursorDy;

      // Clamp to canvas
      cursorRef.current.x = Math.max(0, Math.min(800, cursorRef.current.x));
      cursorRef.current.y = Math.max(0, Math.min(600, cursorRef.current.y));

      // Log movement continuously
      movements.current.push({
        block_id: block.id,
        mapping_type: block.mapping,
        trial_id: trialCount,
        timestamp_ms: performance.now() - timestampStart,
        mouse_dx: dx,
        mouse_dy: dy,
        cursor_x: cursorRef.current.x,
        cursor_y: cursorRef.current.y,
        event: phase
      });
    };

    // Need pointer lock or just relative movements over the canvas
    const canvas = canvasRef.current;
    
    const requestPointerLock = () => {
      canvas.requestPointerLock();
    };

    const lockChangeAlert = () => {
      if (document.pointerLockElement === canvas) {
        document.addEventListener("mousemove", handleMouseMove, false);
      } else {
        document.removeEventListener("mousemove", handleMouseMove, false);
      }
    };

    document.addEventListener("pointerlockchange", lockChangeAlert, false);
    canvas.addEventListener("click", requestPointerLock);

    return () => {
      document.removeEventListener("pointerlockchange", lockChangeAlert, false);
      document.removeEventListener("mousemove", handleMouseMove, false);
      canvas.removeEventListener("click", requestPointerLock);
    };
  }, [block, phase, trialCount, timestampStart]);

  return (
    <div className="flex flex-col items-center">
      <p className="mb-4 text-gray-700">Block: {block.id} ({trialCount} / {block.trials} trials)</p>
      <p className="mb-4 text-sm text-gray-500">Click the canvas to lock mouse and start moving. Press ESC to unlock.</p>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="border border-gray-400 bg-gray-50 cursor-none"
      />
    </div>
  );
}
