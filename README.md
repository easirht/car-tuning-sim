# AI Car Tuning Simulator

**[▶ Live demo](https://easirht.github.io/car-tuning-sim/)**

A lightweight, browser-based engineering simulation. Tune a virtual race car's setup by hand, then let an **AI tuning assistant** (Bayesian optimization) learn from previous laps and find faster setups. Runs entirely in the browser: no backend, no GPU, no build step.

<!-- Add a screenshot or GIF: save it as docs/demo.png and uncomment the next line -->
<!-- ![Demo](docs/demo.png) -->

## Features

- Top-down animated track, colored by speed (red = slow corner, green = fast)
- 5 tunable parameters: tire pressure, suspension stiffness, aerodynamic downforce, brake bias, gear ratio
- Lap results: lap time, average/max/min speed, tire grip, peak braking and cornering g, fuel use, stability
- **AI Suggest** (one recommended setup) and **AI Auto-Tune** (30 optimization runs)
- Learning-curve chart showing the best lap score improving run by run

## How it works

### Vehicle model (`src/physics.js`)

| Effect | Equation |
|---|---|
| Aerodynamic drag | `F_drag = ½ · ρ · Cd · A · v²` |
| Downforce | `F_down = ½ · ρ · Cl · A · v²` |
| Tire force | `F_tire = μ · F_normal`, with `F_normal = m·g + F_down` |
| Max cornering speed | `v = √(μ·m·g / (m·κ − μ·k_down))`, where `κ` is track curvature |
| Gearing | Top speed from `v = ω_max · R / ratio`; drive force from an engine torque curve × ratio |

Trade-offs built in so there is no "max everything" answer:

- **Downforce** raises Cl (more cornering grip) but also raises Cd (less top speed).
- **Tire pressure** has a grip sweet spot near 2.1 bar.
- **Suspension** has a different optimum per corner type: softer for slow corners, stiffer for high-speed ones.
- **Brake bias** has an optimum that shifts forward with downforce.
- **Gear ratio** trades acceleration against top speed.
- A friction circle shares grip between cornering and braking/acceleration.

### Lap-time simulation

The track is split into 10 m sections. For each section the simulator finds the maximum cornering speed, then runs a **backward pass** (braking limits) and a **forward pass** (acceleration limits). `Lap time = Σ section time`. A lap is cheap to compute, so many setups can be evaluated in seconds.

### Track (`src/track.js`)

A closed Catmull-Rom spline resampled every 10 m (~5 km). Curvature is computed numerically from the geometry, and sections are classified as straight, high-speed corner, medium corner or hairpin.

### AI tuning assistant (`src/optimizer.js`)

Bayesian optimization written from scratch in plain JavaScript:

1. Every lap (manual or AI) is stored as `(setup → lap score)`.
2. A **Gaussian-process surrogate** (RBF kernel, Cholesky solve) is fitted to the history.
3. It predicts the lap score and its uncertainty for thousands of candidate setups.
4. The next setup is the one with the highest **Expected Improvement**, balancing exploring unknown setups against exploiting good ones.

The score is `lap time + a penalty if stability drops below 60`, so the AI cannot win with a fast but undriveable car.

## Results

Setup trade-offs (default setup, one parameter changed at a time):

| Parameter | Values tried | Lap time |
|---|---|---|
| Downforce | 0 / 40 / 80 / 100 % | 88.0 / 80.4 / 82.1 / 84.0 s |
| Gear ratio | 2.5 / 3.0 / 3.5 / 4.0 / 5.0 | 91.1 / 84.3 / 80.4 / 78.5 / 86.4 s |

Both parameters have a clear sweet spot, so the optimizer has real trade-offs to resolve.

**AI vs random search** (mean best lap score over independent 30-run trials, from a 10-trial headless test; the in-app comparison runs 20 trials, so exact numbers vary slightly):

| After run | Bayesian optimization | Random search |
|---|---|---|
| 10 | 78.90 s | 80.19 s |
| 20 | 77.87 s | 79.33 s |
| 30 | 77.75 s | 78.63 s |

Random search is competitive for the first few runs; the surrogate model pulls ahead once it has enough history. Use the **Run comparison** button in the app to reproduce this chart.

## Run locally

No install needed. Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 8000
# open http://localhost:8000
```

## Project structure

```text
car-tuning-sim/
├── index.html          # page + styles
└── src/
    ├── track.js        # spline track, curvature, sections
    ├── physics.js      # car model + simulateLap(setup)
    ├── optimizer.js    # Bayesian optimization (AI tuner)
    └── ui.js           # sliders, canvas, animation, chart
```

## Simplifications

This is an engineering demo, not a high-fidelity simulator: single-gear model, quasi-steady-state speed passes, no tire temperature or wear, no weight transfer dynamics. The aim is a model small and fast enough for an optimizer to explore, while keeping the real trade-offs between setup parameters.

## Ideas for next steps

- Random search vs Bayesian optimization comparison chart
- Tire wear and temperature
- Racing-line overlay and multiple tracks
- Genetic-algorithm option and setup export/import

## License

MIT
