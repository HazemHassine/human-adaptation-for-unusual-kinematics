"use client";

import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function CanvasTask({ block, devMode, seed, onComplete }) {
  const { t } = useLanguage();
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState("start_circle"); // start_circle, moving
  const [target, setTarget] = useState(null);
  const [trialCount, setTrialCount] = useState(0);
  
  // Track movement
  const cursorRef = useRef({ x: 400, y: 300 });
  const startCircle = useRef({ x: 400, y: 300, radius: 20 });
  
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
  const appliedRotationAngle = useRef(0);

  // Deterministic PRNG
  const prngRef = useRef(null);
  if (!prngRef.current) {
    let a = 1337;
    if (seed) {
      for(let i = 0; i < seed.length; i++) {
        a = (a + seed.charCodeAt(i)) ^ (a << 13) ^ (a >>> 17);
      }
    }
    prngRef.current = function() {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const random = () => prngRef.current();

  // Constants
  const RANDOMIZE_TARGET_DISTANCE = block.randomize_target_distance === true;
  const MIN_TARGET_DIST = block.min_target_distance_px !== undefined ? block.min_target_distance_px : 100;
  const MAX_TARGET_DIST = block.max_target_distance_px !== undefined ? block.max_target_distance_px : 250;
  const DEFAULT_TARGET_DISTANCE = block.target_distance_px !== undefined ? block.target_distance_px : 150;
  
  const TARGET_ANGLE_MODE = block.target_angle_mode || (block.randomize_target_angle ? "random_range" : "random_cardinal");
  const FIXED_TARGET_ANGLE = block.fixed_target_angle_deg !== undefined ? block.fixed_target_angle_deg : 0;
  const MIN_TARGET_ANGLE = block.min_target_angle_deg !== undefined ? block.min_target_angle_deg : 0;
  const MAX_TARGET_ANGLE = block.max_target_angle_deg !== undefined ? block.max_target_angle_deg : 360;

  const TARGET_SAFE_MARGIN = block.target_safe_margin_px || 15;
  const REQUIRE_RETURN_TO_START = block.require_return_to_start !== false;
  const WAVE_AMPLITUDE = block.wave_amplitude !== undefined ? block.wave_amplitude : 30;
  
  const BASE_WAVE_FREQ = block.wave_frequency !== undefined ? block.wave_frequency : 1.5;
  const MIN_WAVE_FREQ = block.min_wave_frequency !== undefined ? block.min_wave_frequency : BASE_WAVE_FREQ;
  const MAX_WAVE_FREQ = block.max_wave_frequency !== undefined ? block.max_wave_frequency : BASE_WAVE_FREQ;
  const WAVE_FREQ_NOISE = block.wave_frequency_noise || 0;

  const PATH_TYPE = block.path_type || "none";
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
      resolvedParams.base_rotation_angle_deg = parseInt(block.mapping.split("_")[1], 10) || 45;
    } else if (block.mapping === "mirror_horizontal") {
      resolvedMappingType = "mirror";
      resolvedParams.mirror_axis = "horizontal";
    } else if (block.mapping === "identity") {
      resolvedMappingType = "identity";
    }
  }
  const taskType = block.task_type || "reaching";
  
  // Initialize applied angle
  if (trialCount === 0 && appliedRotationAngle.current === 0) {
    appliedRotationAngle.current = resolvedParams.base_rotation_angle_deg !== undefined ? resolvedParams.base_rotation_angle_deg : (resolvedParams.rotation_angle || 0);
  }
  
  // Calculate shortest distance from cursor to path
  const getDistanceToPath = (cursorX, cursorY, targetObj) => {
    if (!targetObj || !targetObj.pathStyle || targetObj.pathStyle === "none") return 0;
    
    const angleRad = (targetObj.angleDeg * Math.PI) / 180;
    const dx_c = cursorX - startCircle.current.x;
    const dy_c = startCircle.current.y - cursorY; // Invert Y for standard math orientation
    
    // Transform cursor to local coordinates (lx, ly)
    // where lx runs along the straight line from center to target
    const lx = dx_c * Math.cos(angleRad) + dy_c * Math.sin(angleRad);
    const ly = -dx_c * Math.sin(angleRad) + dy_c * Math.cos(angleRad);
    
    // Clamp local X to the line segment length
    const targetDist = targetObj.distance || DEFAULT_TARGET_DISTANCE;
    const lxClamped = Math.max(0, Math.min(targetDist, lx));
    
    let lyIdeal = 0;
    if (targetObj.pathStyle === "sine") {
      const trialFreq = targetObj.waveFrequency !== undefined ? targetObj.waveFrequency : BASE_WAVE_FREQ;
      lyIdeal = WAVE_AMPLITUDE * Math.sin((2 * Math.PI * trialFreq * lxClamped) / targetDist);
    }
    
    // Euclidean distance in local space (isomorphic to global space)
    return Math.hypot(lx - lxClamped, ly - lyIdeal);
  };

  // Generate a random target and pre-calculate path guides
  const spawnTarget = () => {
    let tx, ty, angleDeg, angleRad, finalDist;
    const maxAttempts = 1000;
    let attempt = 0;
    let found = false;
    const targetRadius = 15;
    const cursorRadius = 5;
    const padding = TARGET_SAFE_MARGIN + targetRadius + cursorRadius;

    if (RANDOMIZE_TARGET_DISTANCE || TARGET_ANGLE_MODE === "random_range" || TARGET_ANGLE_MODE === "fixed_cardinal") {
      while (attempt < maxAttempts && !found) {
        // Pick an angle
        if (TARGET_ANGLE_MODE === "random_range") {
          angleDeg = MIN_TARGET_ANGLE + random() * (MAX_TARGET_ANGLE - MIN_TARGET_ANGLE);
        } else if (TARGET_ANGLE_MODE === "fixed_cardinal") {
          angleDeg = FIXED_TARGET_ANGLE;
        } else {
          angleDeg = DIRECTIONS[Math.floor(random() * DIRECTIONS.length)];
        }
        angleRad = (angleDeg * Math.PI) / 180;
        
        // Randomly pick distance
        let r;
        if (RANDOMIZE_TARGET_DISTANCE) {
          r = MIN_TARGET_DIST + random() * (MAX_TARGET_DIST - MIN_TARGET_DIST);
        } else {
          r = DEFAULT_TARGET_DISTANCE;
        }
        
        const testTx = startCircle.current.x + r * Math.cos(angleRad);
        const testTy = startCircle.current.y - r * Math.sin(angleRad); // canvas y inverted
        
        // Check bounds
        if (
          testTx >= padding &&
          testTx <= 800 - padding &&
          testTy >= padding &&
          testTy <= 600 - padding
        ) {
          tx = testTx;
          ty = testTy;
          finalDist = r;
          found = true;
        }
        attempt++;
      }
    }
    
    if (!found) {
      // Fallback or non-randomized
      angleDeg = DIRECTIONS[Math.floor(random() * DIRECTIONS.length)];
      angleRad = (angleDeg * Math.PI) / 180;
      finalDist = DEFAULT_TARGET_DISTANCE;
      tx = startCircle.current.x + finalDist * Math.cos(angleRad);
      ty = startCircle.current.y - finalDist * Math.sin(angleRad);
      
      // Safety clamp just in case
      tx = Math.max(padding, Math.min(800 - padding, tx));
      ty = Math.max(padding, Math.min(600 - padding, ty));
      
      // Recalculate true distance and angle if clamped
      const dx = tx - startCircle.current.x;
      const dy = startCircle.current.y - ty;
      finalDist = Math.hypot(dx, dy);
      angleRad = Math.atan2(dy, dx);
      angleDeg = (angleRad * 180) / Math.PI;
    }
    
    // Update rotation noise for this trial
    const baseAngle = resolvedParams.base_rotation_angle_deg !== undefined ? resolvedParams.base_rotation_angle_deg : (resolvedParams.rotation_angle || 0);
    const noise = resolvedParams.rotation_noise_deg || 0;
    appliedRotationAngle.current = baseAngle + (random() * 2 - 1) * noise;

    const pathStyle = PATH_TYPE !== "none" ? PATH_TYPE : (taskType === "tracking" ? (trialCount % 2 === 0 ? "straight" : "sine") : "none");
    
    let currentWaveFreq = BASE_WAVE_FREQ;
    if (MIN_WAVE_FREQ !== MAX_WAVE_FREQ || WAVE_FREQ_NOISE > 0) {
      let baseFreq = MIN_WAVE_FREQ + random() * (MAX_WAVE_FREQ - MIN_WAVE_FREQ);
      baseFreq += (random() * 2 - 1) * WAVE_FREQ_NOISE;
      currentWaveFreq = Math.max(MIN_WAVE_FREQ, Math.min(MAX_WAVE_FREQ, baseFreq));
    }
    // Generate ideal path points (51 points from center to target)
    // To ensure the sine wave always perfectly hits the center of the target circle, 
    // the wave frequency must be a multiple of 0.5 (half-cycles).
    currentWaveFreq = Math.max(0.5, Math.round(currentWaveFreq * 2) / 2);

    const pathPoints = [];
    for (let i = 0; i <= 50; i++) {
      const t = i / 50;
      const lx = t * finalDist;
      let ly = 0;
      if (pathStyle === "sine") {
        ly = WAVE_AMPLITUDE * Math.sin((2 * Math.PI * currentWaveFreq * lx) / finalDist);
      }
      const gx = startCircle.current.x + lx * Math.cos(angleRad) - ly * Math.sin(angleRad);
      const gy = startCircle.current.y - (lx * Math.sin(angleRad) + ly * Math.cos(angleRad));
      pathPoints.push({ x: gx, y: gy });
    }
    
    setTarget({
      x: tx,
      y: ty,
      radius: targetRadius,
      angleDeg,
      distance: finalDist,
      pathStyle,
      pathPoints,
      waveFrequency: currentWaveFreq
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
      ctx.arc(startCircle.current.x, startCircle.current.y, startCircle.current.radius, 0, 2 * Math.PI);
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
          ctx.fillText(`Base: ${resolvedParams.base_rotation_angle_deg || resolvedParams.rotation_angle || 0}° | Applied: ${appliedRotationAngle.current.toFixed(1)}°`, 10, 40);
        } else if (resolvedMappingType === "mirror") {
          ctx.fillText(`Mirror Axis: ${resolvedParams.mirror_axis}`, 10, 40);
        }
        ctx.fillText(`Task Type: ${taskType}`, 10, 60);
        ctx.fillText(`Trial: ${Math.min(trialCount + 1, block.trials)} / ${block.trials}`, 10, 80);
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
            const ux = idePosition.current.x - startCircle.current.x;
            const uy = startCircle.current.y - idePosition.current.y; // Standard math coordinates
            const vx = target.x - startCircle.current.x;
            const vy = startCircle.current.y - target.y;
            
            const thetaU = Math.atan2(uy, ux);
            const thetaV = Math.atan2(vy, vx);
            let diffDeg = ((thetaU - thetaV) * 180) / Math.PI;
            while (diffDeg > 180) diffDeg -= 360;
            while (diffDeg < -180) diffDeg += 360;
            initialDirectionError = Math.abs(diffDeg);
          }

          // Calculate straightness ratio (straight distance / actual cursor path length)
          const straightness = trialPathLength.current > 0 
            ? ((target.distance || DEFAULT_TARGET_DISTANCE) / trialPathLength.current) 
            : 1.0;

          // New Trial Aggregations
          const trialMoves = movements.current.filter(m => m.trial_id === trialCount && m.event === "moving");
          let sumAbsError = 0, sumDistTarget = 0, areaCurve = 0, sumVelToward = 0;
          let earlyArea = 0, correctionArea = 0;
          
          trialMoves.forEach(m => {
            if (m.angular_error_to_target_deg != null && !isNaN(m.angular_error_to_target_deg)) sumAbsError += Math.abs(m.angular_error_to_target_deg);
            if (m.distance_to_target_px != null) sumDistTarget += m.distance_to_target_px;
            if (m.distance_to_target_px != null && m.dt_ms != null) areaCurve += (m.distance_to_target_px * m.dt_ms);
            if (m.velocity_toward_target != null && !isNaN(m.velocity_toward_target)) sumVelToward += m.velocity_toward_target;
          });
          
          const max_distance_from_ideal_path_px = squaredDeviations.current.length > 0 ? Math.sqrt(Math.max(...squaredDeviations.current)) : 0;
          
          if (trialMoves.length > 0) {
            const firstT = trialMoves[0].timestamp_ms;
            trialMoves.forEach(m => {
               const tRel = m.timestamp_ms - firstT;
               if (m.distance_to_target_px != null && m.dt_ms != null) {
                  if (tRel < movementTime * 0.3) {
                     earlyArea += (m.distance_to_target_px * m.dt_ms);
                  } else {
                     correctionArea += (m.distance_to_target_px * m.dt_ms);
                  }
               }
            });
          }

          // Push target_reached event
          movements.current.push({
            block_id: block.id,
            mapping_type: resolvedMappingType,
            trial_id: trialCount,
            timestamp_ms: performance.now() - timestampStart,
            absolute_timestamp: Date.now(),
            dt_ms: 0,
            canvas_width_px: 800,
            canvas_height_px: 600,
            cursor_x: cursorRef.current.x,
            cursor_y: cursorRef.current.y,
            target_x: target.x,
            target_y: target.y,
            event: "target_reached"
          });

          trialLogs.current.push({
            trial_id: trialCount,
            block_type: block.block_type || "adaptation",
            target_angle_deg: target.angleDeg,
            target_distance_px: target.distance || DEFAULT_TARGET_DISTANCE,
            normalized_target_distance: (target.distance || DEFAULT_TARGET_DISTANCE) / Math.hypot(800, 600),
            target_x: target.x,
            target_y: target.y,
            start_x: startCircle.current.x,
            start_y: startCircle.current.y,
            total_trial_time_ms: totalTrialTime,
            success: 1,
            reaction_time_ms: reactionTime,
            movement_time_ms: movementTime,
            initial_direction_error_deg: initialDirectionError,
            mean_absolute_error_deg: trialMoves.length ? sumAbsError / trialMoves.length : null,
            endpoint_error_px: dist,
            final_error_px: dist,
            path_length_px: trialPathLength.current,
            ideal_distance_px: target.distance || DEFAULT_TARGET_DISTANCE,
            max_distance_from_ideal_path_px,
            mean_distance_to_target_px: trialMoves.length ? sumDistTarget / trialMoves.length : null,
            area_under_distance_curve: areaCurve,
            mean_velocity_toward_target: trialMoves.length ? sumVelToward / trialMoves.length : null,
            early_exploration_score: earlyArea,
            correction_efficiency_score: correctionArea > 0 ? (1 / correctionArea) : 0,
            straightness_ratio: Math.min(1.0, straightness),
            num_direction_reversals: directionReversals.current,
            task_type: taskType,
            tracking_rmse_px: taskType === "tracking" ? rmse : undefined,
            ideal_path_points: target.pathPoints
          });

          setTrialCount(c => c + 1);
          if (trialCount + 1 >= block.trials) {
            setTarget(null);
            return; // Stop the render loop immediately on the final trial
          }

          if (REQUIRE_RETURN_TO_START) {
            setTarget(null);
            setPhase("start_circle");
            cursorRef.current = { x: 400, y: 300 }; // Reset center teleport
            startCircle.current = { x: 400, y: 300, radius: 20 };
          } else {
            // Immediately start next trial from current position
            startCircle.current = { x: target.x, y: target.y, radius: 20 };
            setPhase("moving");
            spawnTarget();
          }
        }
      } else if (phase === "start_circle") {
        const dist = Math.hypot(cursorRef.current.x - startCircle.current.x, cursorRef.current.y - startCircle.current.y);
        if (dist < startCircle.current.radius) {
          // Add target_spawned event
          movements.current.push({
            block_id: block.id,
            mapping_type: resolvedMappingType,
            trial_id: trialCount,
            timestamp_ms: performance.now() - timestampStart,
            absolute_timestamp: Date.now(),
            dt_ms: 0,
            canvas_width_px: 800,
            canvas_height_px: 600,
            cursor_x: cursorRef.current.x,
            cursor_y: cursorRef.current.y,
            event: "target_spawned"
          });
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
      if (document.pointerLockElement === canvasRef.current) {
        document.exitPointerLock();
      }
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
        const rad = (appliedRotationAngle.current * Math.PI) / 180;
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
        const rx = cursorRef.current.x - startCircle.current.x;
        const ry = cursorRef.current.y - startCircle.current.y;
        const dist = Math.hypot(rx, ry);
        const effAngle = appliedRotationAngle.current + resolvedParams.position_coefficient * dist;
        const rad = (effAngle * Math.PI) / 180;
        cursorDx = Math.cos(rad) * dx - Math.sin(rad) * dy;
        cursorDy = Math.sin(rad) * dx + Math.cos(rad) * dy;
      }

      // Check for movement onset (leaving start circle)
      const distFromStart = Math.hypot(cursorRef.current.x - startCircle.current.x, cursorRef.current.y - startCircle.current.y);
      if (phase === "moving" && movementOnsetTime.current === 0 && distFromStart > startCircle.current.radius) {
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
        const vx = target.x - startCircle.current.x;
        const vy = target.y - startCircle.current.y;
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

      const canvasDiag = Math.hypot(800, 600);
      let distToTarget = null, distToTargetNorm = null;
      let vecTargetX = null, vecTargetY = null;
      let velToward = null, velPerp = null, angError = null;
      
      if (target) {
        vecTargetX = target.x - cursorRef.current.x;
        vecTargetY = target.y - cursorRef.current.y;
        distToTarget = Math.hypot(vecTargetX, vecTargetY);
        distToTargetNorm = distToTarget / canvasDiag;
        
        if (distToTarget > 0) {
          const dirX = vecTargetX / distToTarget;
          const dirY = vecTargetY / distToTarget;
          velToward = cursorVx * dirX + cursorVy * dirY;
          velPerp = cursorVx * (-dirY) + cursorVy * dirX;
        }
        
        const angleCursor = Math.atan2(cursorVy, cursorVx);
        const angleTarget = Math.atan2(vecTargetY, vecTargetX);
        let diff = ((angleCursor - angleTarget) * 180) / Math.PI;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        angError = diff;
      }

      // Log movement continuously
      movements.current.push({
        block_id: block.id,
        mapping_type: resolvedMappingType,
        trial_id: trialCount,
        timestamp_ms: performance.now() - timestampStart,
        absolute_timestamp: Date.now(),
        dt_ms: dt,
        canvas_width_px: 800,
        canvas_height_px: 600,
        mouse_x: e.clientX,
        mouse_y: e.clientY,
        mouse_x_norm: e.clientX / 800,
        mouse_y_norm: e.clientY / 600,
        mouse_dx: dx,
        mouse_dy: dy,
        mouse_delta_norm: Math.hypot(dx, dy) / canvasDiag,
        cursor_x: cursorRef.current.x,
        cursor_y: cursorRef.current.y,
        cursor_x_norm: cursorRef.current.x / 800,
        cursor_y_norm: cursorRef.current.y / 600,
        cursor_dx: cursorDx,
        cursor_dy: cursorDy,
        cursor_delta_norm: Math.hypot(cursorDx, cursorDy) / canvasDiag,
        mouse_vx: mouseVx,
        mouse_vy: mouseVy,
        cursor_vx: cursorVx,
        cursor_vy: cursorVy,
        cursor_speed: Math.hypot(cursorVx, cursorVy),
        cursor_speed_norm: Math.hypot(cursorVx, cursorVy) / canvasDiag,
        target_x: target ? target.x : undefined,
        target_y: target ? target.y : undefined,
        target_x_norm: target ? target.x / 800 : undefined,
        target_y_norm: target ? target.y / 600 : undefined,
        start_x_norm: startCircle.x / 800,
        start_y_norm: startCircle.y / 600,
        distance_to_target_px: distToTarget,
        distance_to_target_norm: distToTargetNorm,
        vector_to_target_x: vecTargetX,
        vector_to_target_y: vecTargetY,
        velocity_toward_target: velToward,
        velocity_perpendicular_to_target: velPerp,
        angular_error_to_target_deg: angError,
        event: phase
      });
    };

    const canvas = canvasRef.current;
    
    const requestPointerLock = async () => {
      try {
        const promise = canvas.requestPointerLock();
        if (promise) {
          await promise;
        }
      } catch (err) {
        console.warn("Pointer lock could not be acquired:", err);
      }
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
      <div className="w-[800px] flex justify-between items-end mb-4">
        <div>
          <p className="text-xl font-bold text-slate-800">
            {taskType === "reaching" ? t("taskReaching") : t("taskPathTracking")}
          </p>
          <p className="text-sm font-semibold text-slate-500">
            {t("trialXofY", { current: Math.min(trialCount + 1, block.trials), total: block.trials })}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium shadow-sm">
          {t("clickCanvasToStart")}
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="border border-gray-400 bg-gray-50 cursor-none shadow-md rounded-lg"
      />
    </div>
  );
}
