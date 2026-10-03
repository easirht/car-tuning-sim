// Simplified vehicle model + quasi-steady-state lap simulation.
const CAR = { m:800, rho:1.2, A:2.0, g:9.81, R:0.33, Tpk:700, rpmMax:9000 };
const PARAMS = [
  {key:'tire_pressure', name:'Tire Pressure',        min:1.6, max:2.6, step:0.01, def:2.0, unit:'bar',  desc:'Sweet spot for grip; too low or high loses the contact patch.'},
  {key:'suspension',    name:'Suspension Stiffness', min:20,  max:80,  step:1,    def:50,  unit:'N/mm', desc:'Soft helps slow corners; stiff helps high-speed aero stability.'},
  {key:'downforce',     name:'Aerodynamic Downforce',min:0,   max:100, step:1,    def:40,  unit:'%',    desc:'More cornering grip, but more drag and lower top speed.'},
  {key:'brake_bias',    name:'Brake Bias (front)',   min:50,  max:70,  step:0.5,  def:56,  unit:'%',    desc:'Best bias shifts forward with downforce; wrong bias costs braking.'},
  {key:'gear_ratio',    name:'Gear Ratio',           min:2.5, max:5.0, step:0.05, def:3.5, unit:':1',   desc:'Low = higher top speed; high = stronger acceleration.'}
];

function simulateLap(s) {
  const {m,rho,A,g,R,Tpk,rpmMax} = CAR, N = Track.N, ds = Track.DS, K = Track.kappa;
  const d = s.downforce/100, Cl = 0.4+3*d, Cd = 0.6+0.8*d;
  const kdf = 0.5*rho*Cl*A*(0.9+0.2*(s.suspension-20)/60);   // F_down = kdf * v^2
  const kdr = 0.5*rho*Cd*A;                                   // F_drag = kdr * v^2
  const mu0 = 1.7 - 1.2*(s.tire_pressure-2.1)**2;             // F_tire = mu * F_normal
  const ratio = s.gear_ratio, vcap = rpmMax*Math.PI/30*R/ratio;
  const muC = new Float64Array(N), vc = new Float64Array(N);
  for (let i=0;i<N;i++) {
    const k = Math.max(K[i],1e-5), sOpt = 60-25*Math.min(1,k/0.02);
    muC[i] = mu0*(1-0.12*((s.suspension-sOpt)/30)**2);
    const den = m*k - muC[i]*kdf;
    vc[i] = Math.min(vcap, den<=0 ? vcap : Math.sqrt(muC[i]*m*g/den));
  }
  const bOpt = 55+8*d, eff = Math.max(0.4, 1-0.0025*(s.brake_bias-bOpt)**2);
  const fc = (v,i) => { const ay=v*v*K[i], am=muC[i]*(g+kdf*v*v/m); return Math.sqrt(Math.max(0.03,1-(ay/am)**2)); }; // friction circle
  const v = Float64Array.from(vc);
  for (let n=2*N;n>=0;n--) { const j=n%N, p=(j+N-1)%N, w=v[j];                       // braking pass
    const dec = (mu0*(m*g+kdf*w*w)*fc(w,j)*eff + kdr*w*w)/m;
    v[p] = Math.min(v[p], Math.sqrt(w*w+2*dec*ds)); }
  const drive = w => { const rpm = Math.max(w*ratio/R*30/Math.PI, 4500);
    return Tpk*Math.max(0.1,1-0.5*((rpm-6500)/5000)**2)*ratio/R*0.9; };
  for (let n=0;n<2*N;n++) { const j=n%N, nx=(j+1)%N, w=v[j];                         // acceleration pass
    const F = Math.min(drive(w), 0.6*mu0*(m*g+kdf*w*w)*fc(w,j));
    v[nx] = Math.min(v[nx], Math.sqrt(Math.max(9, w*w+2*(F-kdr*w*w)/m*ds))); }
  let T=0,E=0,vmax=0,vmin=1e9,gl=0,gb=0; const t = new Float64Array(N+1);
  for (let i=0;i<N;i++) { const nx=(i+1)%N, a=(v[nx]**2-v[i]**2)/(2*ds), vm=(v[i]+v[nx])/2;
    T += ds/vm; t[i+1]=T; E += Math.max(0,m*a+kdr*vm*vm)*ds;
    vmax=Math.max(vmax,v[i]); vmin=Math.min(vmin,v[i]); gl=Math.max(gl,v[i]**2*K[i]/g); gb=Math.max(gb,-a/g); }
  const stability = Math.max(0, Math.min(100, 100-4*Math.abs(s.brake_bias-bOpt)-60*Math.abs(s.tire_pressure-2.1)-0.3*Math.abs(s.suspension-50)));
  return { lapTime:T, score:T+Math.max(0,60-stability)*0.05, avg:Track.total/T*3.6, vmax:vmax*3.6, vmin:vmin*3.6,
           grip:mu0, brakeG:gb, latG:gl, fuel:E/0.3/32e6, stability, v, t };
}
