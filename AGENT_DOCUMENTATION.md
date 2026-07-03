# Scientific Research Methods: Motor Adaptation Web Experiment
## Deep Technical Documentation & Architecture Guide

This document provides a highly detailed technical roadmap designed to assist Agentic AI and developers in understanding the structural paradigms, data pipelines, database models, and kinematic algorithms employed in this repository.

---

## 1. Core Architecture & Repository Structure
The project runs on **Next.js 14+ (App Router)** utilizing server-side Route Handlers (`src/app/api`) and heavily client-side rendered experimental interfaces (`"use client"`). 

**Key Directories:**
- `src/app/api/`: Contains all backend RESTful API endpoints for config generation, data ingestion (movements/trials), and analytical querying.
- `src/components/`: Houses the complex React components, most notably `ExperimentRunner.js` (State Machine) and `CanvasTask.js` (Kinematics Engine).
- `src/app/admin/`: Contains `page.js` which houses the highly interactive Analytics Dashboard and Flow Builder.
- `src/models/`: Contains the Mongoose schemas connecting Node.js to MongoDB.

---

## 2. Database Architecture (MongoDB + Mongoose)
The data layer separates high-frequency time-series data from discrete event data. **Recent updates have heavily expanded these schemas to track complex advanced kinematics and noisy perturbations.**

### A. `Config` (`src/models/Config.js`)
Defines the experimental flow. It supports advanced experiment design features:
- **Block Types**: Practice, Baseline, Adaptation, Aftereffect, Questionnaire.
- **Target Dynamics**: Randomized target distances, random cardinal/range target angles.
- **Path Dynamics**: Introduces `sine` wave tracking parameters (`wave_amplitude`, `wave_frequency`, `wave_frequency_noise`) alongside standard straight paths.
- **Perturbation Noise**: Introduces `rotation_noise_deg` for stochastic rotation experiments alongside static `base_rotation_angle_deg`.
- **Metadata**: Stores `courseName`, `universityName`, and `contactEmail`.

### B. `Participant` (`src/models/Participant.js`)
Tracks the individual user session. PII is **strictly forbidden**.
- `session_id` (String): Unique identifier (e.g., `part_xxxxxx`).
- `input_device` (String): e.g., "mouse", "trackpad".

### C. `Trial` (`src/models/Trial.js`)
Stores the summary metrics computed at the exact moment a target is successfully reached or tracked.
- **Identifiers**: `participant_id`, `session_id`, `block_id`, `trial_id`. 
  - *Crucial AI Note: `trial_id` is an index relative to the `block_id`. To uniquely identify a trial across a session, always use the composite key: `${block_id}_${trial_id}`.*
- **Configuration Context**: `task_type`, `path_type`, `base_rotation_angle_deg`, `applied_rotation_angle_deg`, `rotation_noise_deg`.
- **Advanced Performance Metrics**: 
  - *Temporal*: `reaction_time_ms`, `movement_time_ms`, `total_trial_time_ms`.
  - *Error/Accuracy*: `initial_direction_error_deg`, `mean_absolute_error_deg`, `endpoint_error_px`, `final_error_px`, `tracking_rmse_px`.
  - *Spatial/Efficiency*: `path_length_px`, `ideal_distance_px`, `straightness_ratio`, `max_distance_from_ideal_path_px`, `mean_distance_to_target_px`, `area_under_distance_curve`.
  - *Learning Scores*: `early_exploration_score`, `correction_efficiency_score`, `mean_velocity_toward_target`.

### D. `Movement` (`src/models/Movement.js`)
The time-series telemetry data logged continuously at ~60Hz while the participant interacts with the canvas.
- **Identifiers**: Inherits `participant_id`, `session_id`, `block_id`, `trial_id`.
- **Raw & Normalized Telemetry**: `mouse_x/y` and `cursor_x/y`, now accompanied by normalized counterparts (`_norm`) to account for varying screen sizes.
- **Velocities & Vectors**: 
  - `cursor_speed`, `cursor_speed_norm`.
  - Computes exact vectors relative to the goal: `velocity_toward_target`, `velocity_perpendicular_to_target`, `angular_error_to_target_deg`.
  - Live distance tracking: `distance_to_target_px`, `distance_to_target_norm`.
- **Context**: `target_x`, `target_y`, `event` (e.g., "moving", "start_circle").

### E. `Questionnaire` (`src/models/Questionnaire.js`)
Flexible JSON schema capturing post-experiment surveys. Recently expanded to track cognitive adaptation awareness (`q_adaptation_difficulty`, `q_strategy_noticed`).

---

## 3. The Experiment Engine & Kinematics Mathematics

### A. The State Machine (`ExperimentRunner.js`)
- Iterates `currentBlockIndex`. When a block completes, it unmounts and remounts `CanvasTask.js` to ensure clean internal state resets. This is why `trial_id` resets per block.
- Evaluates the JSON structure which defines `blocks` and dynamically applies sine-wave generation or stochastic noise.

### B. The Kinematics Engine (`CanvasTask.js`)
This component avoids React re-renders during the gameplay loop to maintain 60fps. State is managed via `useRef`.
- **The Event Listener (`handleMouseMove`)**: 
  - Captures `e.movementX` and `e.movementY`.
  - Applies transformations:
    - **`rotation`**: Applies a 2D rotation matrix combining `base_rotation` and random `noise`.
    - **`gain` & `mirror`**: Multiplies `dx` and `dy` by scalar values or inverts axes.
- **The Render Loop (`requestAnimationFrame`)**: 
  - Clears the canvas.
  - Draws the start circle, target, and cursor. Evaluates complex `sine` wave tracking paths.
  - Dynamically calculates the extensive vectors (`velocity_toward_target`, `angular_error_to_target_deg`) and saves to the `movements` array.
  - Performs hit detection, compiling the discrete Trial metrics.

---

## 4. Admin Analytics & Data Visualization (`src/app/admin/page.js`)
The Admin panel relies on the `/api/analytics` endpoint.
- **The Spaghetti Map (`drawHeatmap`)**: 
  - Iterates over `participantData.movements`, filtering strictly for `m.event === "moving"`. Breaks paths via `ctx.beginPath()` on non-moving events.
  - Overlays selected paths using the multi-select array `selectedTrialIds` which stores strings in the format `blockId_trialId`.
- **Velocity Profiles (`drawVelocityProfile`)**:
  - Plots `timestamp_ms` against computed speeds. Dynamically colored to match the heatmap.

---

## 5. Development Constraints
- **Do not introduce heavy calculations into the `requestAnimationFrame` loop** inside `CanvasTask.js`. Ensure telemetry is pushed to an array and processed asynchronously or at trial completion.
- **Data Mutation**: Never attempt to modify `participant_id` generation to include PII (names, IP addresses).
- **Coordinate Normalization**: Always respect the new `_norm` variables in `Movement` when conducting multi-device analytics to avoid screen-size bias.
