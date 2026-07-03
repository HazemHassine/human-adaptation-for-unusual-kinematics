# Motor Adaptation Web Experiment

This is a web-based experimental platform designed to study human motor adaptation. It tests how people adapt to altered kinematics (like rotated, mirrored, or scaled mouse movements) while performing reaching and tracking tasks.

The project consists of two main parts:
1. **Participant Portal**: The actual web experiment where users interact with an HTML5 Canvas to hit targets or track sine waves while their cursor movements are manipulated.
2. **Admin Dashboard**: A secure portal for researchers to design experimental blocks, define perturbation math, and analyze recorded kinematics in real-time (with tools like a spaghetti map and velocity profile charts).

## Tech Stack
- Next.js (App Router)
- React
- Tailwind CSS
- MongoDB & Mongoose (for continuous kinematic telemetry and discrete trial logging)

## Setup & Running Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   You will need a MongoDB instance running. Create a `.env.local` file in the root directory and add your connection string:
   ```env
   MONGODB_URI=mongodb://localhost:27017/motor-adaptation
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   - Participant Experiment: [http://localhost:3000](http://localhost:3000)
   - Admin Dashboard: [http://localhost:3000/admin](http://localhost:3000/admin)

## Project Structure
- `src/components/CanvasTask.js`: The core 60fps kinematics engine where the math and rendering happens.
- `src/components/ExperimentRunner.js`: The state machine orchestrating the flow of the blocks.
- `src/app/admin/page.js`: The visual analytics dashboard and experiment flow builder.
- `src/models/`: MongoDB schemas (`Config`, `Movement`, `Trial`, `Participant`, `Questionnaire`).
- `src/app/api/`: Next.js Route Handlers connecting the frontend to the database.

## Architecture Documentation
If you are looking for a deeper dive into the database schema, mathematical transformations, or constraints regarding the `requestAnimationFrame` loops, check out the `AGENT_DOCUMENTATION.md` file in the root directory.
