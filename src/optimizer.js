// AI tuning assistant: Bayesian optimization (Gaussian-process surrogate + Expected Improvement).
const Opt = (() => {
  const norm = s => PARAMS.map(p => (s[p.key]-p.min)/(p.max-p.min));
  const denorm = x => { const s={}; PARAMS.forEach((p,i)=>{ const v=p.min+Math.min(1,Math.max(0,x[i]))*(p.max-p.min); s[p.key]=+(Math.round(v/p.step)*p.step).toFixed(3); }); return s; };
  const rnd = () => denorm(PARAMS.map(()=>Math.random()));
  const kern = (a,b) => { let d=0; for(let i=0;i<a.length;i++) d+=(a[i]-b[i])**2; return Math.exp(-d/(2*0.3*0.3)); };
  const phi = z => Math.exp(-z*z/2)/Math.sqrt(2*Math.PI);
  const Phi = z => { const t=1/(1+0.2316419*Math.abs(z)), p=phi(z)*t*(0.31938153+t*(-0.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429)))); return z>0?1-p:p; };
  function suggest(hist) {
    if (hist.length < 5) return rnd();
    const X = hist.map(h=>norm(h.setup)), n = X.length, ys = hist.map(h=>h.score);
    const mu = ys.reduce((a,b)=>a+b)/n, sd = Math.sqrt(ys.reduce((a,b)=>a+(b-mu)**2,0)/n)||1, y = ys.map(v=>(v-mu)/sd);
    const L = Array.from({length:n},()=>new Float64Array(n));
    for (let i=0;i<n;i++) for (let j=0;j<=i;j++) { let s=kern(X[i],X[j])+(i===j?1e-4:0); for(let k=0;k<j;k++) s-=L[i][k]*L[j][k]; L[i][j]= i===j?Math.sqrt(Math.max(s,1e-10)):s/L[j][j]; }
    const fwd = b => { const x=new Float64Array(n); for(let i=0;i<n;i++){ let s=b[i]; for(let k=0;k<i;k++) s-=L[i][k]*x[k]; x[i]=s/L[i][i]; } return x; };
    const bwd = b => { const x=new Float64Array(n); for(let i=n-1;i>=0;i--){ let s=b[i]; for(let k=i+1;k<n;k++) s-=L[k][i]*x[k]; x[i]=s/L[i][i]; } return x; };
    const alpha = bwd(fwd(y)), best = Math.min(...y), bi = y.indexOf(best);
    let top=null, topEI=-1;
    for (let c=0;c<2500;c++) {
      const x = c<2000 ? PARAMS.map(()=>Math.random()) : X[bi].map(v=>Math.min(1,Math.max(0,v+(Math.random()-0.5)*0.2)));
      const ks = X.map(xi=>kern(x,xi)), m = ks.reduce((a,k,i)=>a+k*alpha[i],0), w = fwd(ks);
      const s = Math.sqrt(Math.max(1e-9, 1-w.reduce((a,v)=>a+v*v,0))), z=(best-m-0.01)/s, ei=(best-m-0.01)*Phi(z)+s*phi(z);
      if (ei>topEI) { topEI=ei; top=x; }
    }
    return denorm(top);
  }
  return { suggest, rnd };
})();
