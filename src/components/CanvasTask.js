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
  const movementOnsetTime = useRef(0); // Time when cursor leaves start circle
  const idePosition = useRef(null); // Cursor position at 150ms after onset
  const squaredDeviations = useRef([]); // To calculate RMSE
  const trialPathLength = useRef(0);
  const directionReversals = useRef(0);
  const lastDelta = useRef(null);
  const lastVelocityTime = useRef(0);

  // Constants
  const TARGET_DISTANCE = 150;
  const DIRECTIONS = [0, 45, 90, 135, 180, 225, 270, 315];

  // Resolve dynamic block configurations (with robust legacy fallback)
  const mappingType = block.mapping_type || "identity";
  const mappingParams = block.mapping_params || {
    rotation_angle: 0,
    mirror_axis: "none",
    shear_factor: 0,
    gain_factor: 1.0,
    position_coefficient: 0
  };
  
  // Legacy config string adapter
  let resolvedMappingType = mappingType;
  let resolvedParams = { ...mappingParams };
  if (!block.mapping_type && block.mapping) {
    if (block.mapping.startsWith("rotation_")) {
      resolvedMappingType = "rotation";
      resolvedParams.rotation_angle = parseInt(block.mapping.split("_")[1], 10) || 45;
    } else if (block.mapping === "mirror_horizontal") {
      resolvedMappingType = "mirror";
      resolvedParams.mirror_axis = "horizontal";
    } else if (block.mapping === "identity") {
      resolvedMappingType = "identity";
    }
  }
  const taskType = block.task_type || "reaching";
  
  // Calculate shortest distance from cursor to path
  const getDistanceToPath = (cursorX, cursorY, targetObj) => {
    if (!targetObj || !targetObj.pathStyle || targetObj.pathStyle === "none") return 0;
    
    const angleRad = (targetObj.angleDeg * Math.PI) / 180;
    const dx_c = cursorX - 400;
    const dy_c = 300 - cursorY; // Invert Y for standard math orientation
    
    // Transform cursor to local coordinates (lx, ly)
    // where lx runs along the straight line from center to target
    const lx = dx_c * Math.cos(angleRad) + dy_c * Math.sin(angleRad);
    const ly = -dx_c * Math.sin(angleRad) + dy_c * Math.cos(angleRad);
    
    // Clamp local X to the line segment length
    const lxClamped = Math.max(0, Math.min(TARGET_DISTANCE, lx));
    
    let lyIdeal = 0;
    if (targetObj.pathStyle === "sine") {
      const A = 30; // Amplitude
      const f = 1.5; // Frequency (1.5 cycles)
      lyIdeal = A * Math.sin((2 * Math.PI * f * lxClamped) / TARGET_DISTANCE);
    }
    
    // Euclidean distance in local space (isomorphic to global space)
    return Math.hypot(lx - lxClamped, ly - lyIdeal);
  };

  // Generate a random target and pre-calculate path guides
  const spawnTarget = () => {
    const angleDeg = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    const angleRad = (angleDeg * Math.PI) / 180;
    const tx = 400 + TARGET_DISTANCE * Math.cos(angleRad);
    const ty = 300 - TARGET_DISTANCE * Math.sin(angleRad); // canvas y inverted
    
    const pathStyle = taskType === "tracking" ? (trialCount % 2 === 0 ? "straight" : "sine") : "none";
    
    // Generate ideal path points (51 points from center to target)
    const pathPoints = [];
    const A = 30; // Amplitude for sine
    const f = 1.5; // Frequency
    for (let i = 0; i <= 50; i++) {
      const t = i / 50;
      const lx = t * TARGET_DISTANCE;
      let ly = 0;
      if (pathStyle === "sine") {
        ly = A * Math.sin((2 * Math.PI * f * lx) / TARGET_DISTANCE);
      }
      const gx = 400 + lx * Math.cos(angleRad) - ly * Math.sin(angleRad);
      const gy = 300 - (lx * Math.sin(angleRad) + ly * Math.cos(angleRad));
      pathPoints.push({ x: gx, y: gy });
    }
    
    setTarget({
      x: tx,
      y: ty,
      radius: 15,
      angleDeg,
      pathStyle,
      pathPoints
    });
    
    trialStartTime.current = performance.now();
    movementOnsetTime.current = 0;
    idePosition.current = null;
    squaredDeviations.current = [];
    trialPathLength.current = 0;
    directionReversals.current = 0;
    lastDelta.current = null;
    lastVelocityTime.current = performance.now();
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
      ctx.strokeStyle = "#4b5563"; // Dark gray
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw path guide if tracking task
      if (target && target.pathStyle !== "none" && target.pathPoints.length > 0) {
        ctx.beginPath();
        ctx.moveTo(target.pathPoints[0].x, target.pathPoints[0].y);
        for (let i = 1; i < target.pathPoints.length; i++) {
          ctx.lineTo(target.pathPoints[i].x, target.pathPoints[i].y);
        }
        ctx.strokeStyle = "rgba(99, 102, 241, 0.4)"; // Faint indigo path
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      // Draw Target
      if (target) {
        ctx.beginPath();
        ctx.arc(target.x, target.y, target.radius, 0, 2 * Math.PI);
        ctx.fillStyle = "#2563eb"; // Blue
        ctx.fill();
      }

      // Draw path trace of participant for tracking trials
      if (taskType === "tracking" && movements.current.length > 0) {
        ctx.beginPath();
        let first = true;
        for (let i = movements.current.length - 1; i >= 0; i--) {
          const m = movements.current[i];
          if (m.trial_id !== trialCount) break;
          if (m.event === "moving") {
            if (first) {
              ctx.moveTo(m.cursor_x, m.cursor_y);
              first = false;
            } else {
              ctx.lineTo(m.cursor_x, m.cursor_y);
            }
          }
        }
        ctx.strokeStyle = "rgba(239, 68, 68, 0.3)"; // Red trail
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw Cursor
      ctx.beginPath();
      ctx.arc(cursorRef.current.x, cursorRef.current.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "#ef4444"; // Red
      ctx.fill();

      // Draw Debug Info if Dev Mode
      if (devMode) {
        ctx.fillStyle = "#1f2937";
        ctx.font = "14px monospace";
        ctx.fillText(`Mapping: ${resolvedMappingType}`, 10, 20);
        if (resolvedMappingType === "rotation") {
          ctx.fillText(`Angle: ${resolvedParams.rotation_angle}°`, 10, 40);
        } else if (resolvedMappingType === "mirror") {
          ctx.fillText(`Mirror Axis: ${resolvedParams.mirror_axis}`, 10, 40);
        }
        ctx.fillText(`Task Type: ${taskType}`, 10, 60);
        ctx.fillText(`Trial: ${trialCount} / ${block.trials}`, 10, 80);
      }

      // Hit detection and transition
      if (target) {
        // Calculate deviations if we are moving and tracking is active
        if (phase === "moving") {
          const d = getDistanceToPath(cursorRef.current.x, cursorRef.current.y, target);
          squaredDeviations.current.push(d * d);
        }

        const dist = Math.hypot(cursorRef.current.x - target.x, cursorRef.current.y - target.y);
        if (dist < target.radius) {
          // Calculate movement duration metrics
          const now = performance.now();
          const totalTrialTime = now - trialStartTime.current;
          const reactionTime = movementOnsetTime.current > 0 ? (movementOnsetTime.current - trialStartTime.current) : totalTrialTime;
          const movementTime = movementOnsetTime.current > 0 ? (now - movementOnsetTime.current) : 0;
          
          // Calculate RMSE
          const rmse = squaredDeviations.current.length > 0 
            ? Math.sqrt(squaredDeviations.current.reduce((a, b) => a + b, 0) / squaredDeviations.current.length) 
            : 0;

          // Calculate IDE (Initial Direction Error)
          let initialDirectionError = null;
          if (idePosition.current) {
            const ux = idePosition.current.x - 400;
            const uy = 300 - idePosition.current.y; // Standard math coordinates
            const vx = target.x - 400;
            const vy = 300 - target.y;
            
            const thetaU = Math.atan2(uy, ux);
            const thetaV = Math.atan2(vy, vx);
            let diffDeg = ((thetaU - thetaV) * 180) / Math.PI;
            while (diffDeg > 180) diffDeg -= 360;
            while (diffDeg < -180) diffDeg += 360;
            initialDirectionError = Math.abs(diffDeg);
          }

          // Calculate straightness ratio (straight distance 150px / actual cursor path length)
          const straightness = trialPathLength.current > 0 
            ? (TARGET_DISTANCE / trialPathLength.current) 
            : 1.0;

          trialLogs.current.push({
            trial_id: trialCount,
            target_angle_deg: target.angleDeg,
            target_distance_px: TARGET_DISTANCE,
            success: 1,
            reaction_time_ms: reactionTime,
            movement_time_ms: movementTime,
            initial_direction_error_deg: initialDirectionError,
            endpoint_error_px: dist,
            path_length_px: trialPathLength.current,
            straightness_ratio: Math.min(1.0, straightness),
            num_direction_reversals: directionReversals.current,
            task_type: taskType,
            tracking_rmse_px: taskType === "tracking" ? rmse : undefined,
            ideal_path_points: target.pathPoints
          });

          setTrialCount(c => c + 1);
          setTarget(null);
          setPhase("start_circle");
          cursorRef.current = { x: 400, y: 300 }; // Reset center
        }
      } else if (phase === "start_circle") {
        const dist = Math.hypot(cursorRef.current.x - startCircle.x, cursorRef.current.y - startCircle.y);
        if (dist < startCircle.radius) {
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
      
      // Apply resolved transformation
      if (resolvedMappingType === "rotation") {
        const rad = (resolvedParams.rotation_angle * Math.PI) / 180;
        cursorDx = Math.cos(rad) * dx - Math.sin(rad) * dy;
        cursorDy = Math.sin(rad) * dx + Math.cos(rad) * dy;
      } else if (resolvedMappingType === "mirror") {
        const axis = resolvedParams.mirror_axis;
        if (axis === "horizontal") {
          cursorDx = -dx;
        } else if (axis === "vertical") {
          cursorDy = -dy;
        } else if (axis === "both") {
          cursorDx = -dx;
          cursorDy = -dy;
        }
      } else if (resolvedMappingType === "shear") {
        cursorDx = dx + resolvedParams.shear_factor * dy;
        cursorDy = dy;
      } else if (resolvedMappingType === "gain_anisotropy") {
        cursorDx = dx;
        cursorDy = resolvedParams.gain_factor * dy;
      } else if (resolvedMappingType === "position_dependent") {
        const rx = cursorRef.current.x - 400;
        const ry = cursorRef.current.y - 300;
        const dist = Math.hypot(rx, ry);
        const effAngle = resolvedParams.rotation_angle + resolvedParams.position_coefficient * dist;
        const rad = (effAngle * Math.PI) / 180;
        cursorDx = Math.cos(rad) * dx - Math.sin(rad) * dy;
        cursorDy = Math.sin(rad) * dx + Math.cos(rad) * dy;
      }

      // Check for movement onset (leaving start circle)
      const distFromStart = Math.hypot(cursorRef.current.x - 400, cursorRef.current.y - 300);
      if (phase === "moving" && movementOnsetTime.current === 0 && distFromStart > startCircle.radius) {
        movementOnsetTime.current = performance.now();
      }

      // Record cursor coordinates at 150ms post-onset for IDE calculation
      if (movementOnsetTime.current > 0 && !idePosition.current) {
        const elapsed = performance.now() - movementOnsetTime.current;
        if (elapsed >= 150) {
          idePosition.current = { x: cursorRef.current.x, y: cursorRef.current.y };
        }
      }

      // Accumulate path length during execution
      if (movementOnsetTime.current > 0) {
        trialPathLength.current += Math.hypot(cursorDx, cursorDy);
      }

      // Calculate direction reversals
      if (target && movementOnsetTime.current > 0) {
        const vx = target.x - 400;
        const vy = target.y - 300;
        const len = Math.hypot(vx, vy);
        const proj = (cursorDx * vx + cursorDy * vy) / len; // Projection along target vector
        
        if (lastDelta.current !== null) {
          if (Math.sign(proj) !== Math.sign(lastDelta.current) && Math.abs(proj) > 0.5 && Math.abs(lastDelta.current) > 0.5) {
            directionReversals.current += 1;
          }
        }
        if (Math.abs(proj) > 0.1) {
          lastDelta.current = proj;
        }
      }

      cursorRef.current.x += cursorDx;
      cursorRef.current.y += cursorDy;

      // Clamp cursor to canvas boundaries
      cursorRef.current.x = Math.max(0, Math.min(800, cursorRef.current.x));
      cursorRef.current.y = Math.max(0, Math.min(600, cursorRef.current.y));

      // Calculate instantaneous velocities
      const now = performance.now();
      const dt = now - lastVelocityTime.current;
      lastVelocityTime.current = now;

      let mouseVx = 0;
      let mouseVy = 0;
      let cursorVx = 0;
      let cursorVy = 0;
      if (dt > 0) {
        mouseVx = dx / dt;
        mouseVy = dy / dt;
        cursorVx = cursorDx / dt;
        cursorVy = cursorDy / dt;
      }

      // Log movement continuously
      movements.current.push({
        block_id: block.id,
        mapping_type: resolvedMappingType,
        trial_id: trialCount,
        timestamp_ms: performance.now() - timestampStart,
        mouse_x: e.clientX, // raw window coordinate approximation
        mouse_y: e.clientY,
        mouse_dx: dx,
        mouse_dy: dy,
        cursor_x: cursorRef.current.x,
        cursor_y: cursorRef.current.y,
        mouse_vx: mouseVx,
        mouse_vy: mouseVy,
        cursor_vx: cursorVx,
        cursor_vy: cursorVy,
        target_x: target ? target.x : undefined,
        target_y: target ? target.y : undefined,
        event: phase
      });
    };

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
  }, [block, phase, trialCount, timestampStart, target, resolvedMappingType, resolvedParams]);

  return (
    <div className="flex flex-col items-center">
      <p className="mb-2 text-gray-700 font-semibold">
        Block: {block.id} ({trialCount} / {block.trials} trials)
      </p>
      <p className="mb-2 text-sm text-gray-600 capitalize">
        Task: {taskType} | Mapping: {resolvedMappingType} 
        {resolvedMappingType === "rotation" ? ` (${resolvedParams.rotation_angle}°)` : ""}
      </p>
      <p className="mb-4 text-xs text-gray-500">
        Click the canvas to lock cursor and start. Press ESC to unlock.
      </p>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="border border-gray-400 bg-gray-50 cursor-none shadow-md rounded-lg"
      />
    </div>
  );
}
