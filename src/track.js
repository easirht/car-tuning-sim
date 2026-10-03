// Track: closed Catmull-Rom spline resampled every 10 m; curvature computed numerically.
const Track = (() => {
  const CP = [[15,82],[45,82],[75,82],[90,74],[94,58],[84,46],[92,34],[80,20],[62,16],[52,28],[58,42],[42,50],[30,36],[34,18],[16,14],[6,30],[10,50],[6,68]];
  const cr = (a,b,c,d,t) => [0,1].map(k => 0.5*(2*b[k] + (-a[k]+c[k])*t + (2*a[k]-5*b[k]+4*c[k]-d[k])*t*t + (-a[k]+3*b[k]-3*c[k]+d[k])*t*t*t));
  const n = CP.length, dense = [];
  for (let i=0;i<n;i++) for (let j=0;j<40;j++) dense.push(cr(CP[(i+n-1)%n],CP[i],CP[(i+1)%n],CP[(i+2)%n],j/40));
  const M = dense.length, cum = [0];
  for (let i=1;i<=M;i++){ const a=dense[i-1], b=dense[i%M]; cum.push(cum[i-1]+Math.hypot(b[0]-a[0],b[1]-a[1])); }
  const L = cum[M], TOTAL = 5000, DS = 10, N = TOTAL/DS, pts = [];
  let k = 0;
  for (let i=0;i<N;i++){ const s=i*L/N; while(cum[k+1]<s) k++; const f=(s-cum[k])/(cum[k+1]-cum[k]), a=dense[k], b=dense[(k+1)%M]; pts.push([a[0]+(b[0]-a[0])*f, a[1]+(b[1]-a[1])*f]); }
  const wrap = a => { while(a>Math.PI)a-=2*Math.PI; while(a<-Math.PI)a+=2*Math.PI; return a; };
  const hd = pts.map((p,i)=>{ const q=pts[(i+1)%N]; return Math.atan2(q[1]-p[1],q[0]-p[0]); });
  const raw = hd.map((h,i)=>Math.abs(wrap(h-hd[(i+N-1)%N]))/DS);
  const kappa = raw.map((_,i)=>{ let s=0; for(let j=-3;j<=3;j++) s+=raw[(i+j+N)%N]; return Math.min(0.06, s/7); });
  const type = k => k>0.02?'Hairpin':k>0.008?'Medium corner':k>0.002?'High-speed corner':'Straight';
  const sections = [];
  kappa.forEach((k,i)=>{ const t=type(k), s=sections[sections.length-1];
    if (s && s.corner_type===t) { s.length+=DS; s.curvature=Math.max(s.curvature,k); } else sections.push({corner_type:t,length:DS,curvature:k}); });
  return { N, DS, pts, kappa, sections, total: TOTAL };
})();
