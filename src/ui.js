(() => {
  const $ = id => document.getElementById(id);
  const setup = {}; PARAMS.forEach(p => setup[p.key] = p.def);
  const hist = []; let best = null, cur = null, anim = null, busy = false;
  const cv = $('track'), cx = cv.getContext('2d'), W = cv.width, H = cv.height;
  const xs = Track.pts.map(p=>p[0]), ys = Track.pts.map(p=>p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), sc = Math.min((W-60)/(Math.max(...xs)-x0), (H-60)/(Math.max(...ys)-y0));
  const P = i => { const p = Track.pts[i%Track.N]; return [30+(p[0]-x0)*sc, 30+(p[1]-y0)*sc]; };

  PARAMS.forEach(p => {
    const d = document.createElement('div'); d.className = 'ctl';
    d.innerHTML = `<div class="row"><b>${p.name}</b><span id="v_${p.key}"></span></div><input type="range" id="s_${p.key}" min="${p.min}" max="${p.max}" step="${p.step}"><div class="rng">Range: ${p.min} – ${p.max} ${p.unit}</div><div class="desc">${p.desc}</div>`;
    $('sliders').appendChild(d);
    d.querySelector('input').oninput = e => { setup[p.key] = +e.target.value; sync(); };
  });
  function sync() { PARAMS.forEach(p => { $('s_'+p.key).value = setup[p.key]; $('v_'+p.key).textContent = (+setup[p.key]).toFixed(p.step<0.1?2:p.step<1?1:0)+' '+p.unit; }); }

  function drawTrack(r, idx) {
    cx.clearRect(0,0,W,H); cx.lineCap = cx.lineJoin = 'round';
    cx.strokeStyle = '#2a3140'; cx.lineWidth = 16; cx.beginPath();
    for (let i=0;i<=Track.N;i++) { const [x,y]=P(i); i?cx.lineTo(x,y):cx.moveTo(x,y); } cx.stroke();
    if (r) { const lo = r.vmin, hi = r.vmax; cx.lineWidth = 8;
      for (let i=0;i<Track.N;i++) { const [a,b]=P(i), [c,d]=P(i+1); cx.strokeStyle = `hsl(${120*(r.v[i]*3.6-lo)/(hi-lo)},80%,50%)`; cx.beginPath(); cx.moveTo(a,b); cx.lineTo(c,d); cx.stroke(); } }
    const [sx,sy] = P(0); cx.fillStyle = '#fff'; cx.fillRect(sx-9,sy-2,18,4);
    if (idx != null) { const [x,y]=P(idx), [x2,y2]=P(idx+3), a=Math.atan2(y2-y,x2-x);
      cx.save(); cx.translate(x,y); cx.rotate(a); cx.fillStyle = '#ff5a36'; cx.strokeStyle = '#fff'; cx.lineWidth = 2;
      cx.beginPath(); cx.moveTo(10,0); cx.lineTo(-8,-6); cx.lineTo(-8,6); cx.closePath(); cx.fill(); cx.stroke(); cx.restore(); }
  }
  function show(r) {
    const items = [['Lap time',r.lapTime.toFixed(2)+' s','lap'],['Best lap',best.lap.toFixed(2)+' s'],['Avg speed',r.avg.toFixed(0)+' km/h'],['Max speed',r.vmax.toFixed(0)+' km/h'],
      ['Min speed',r.vmin.toFixed(0)+' km/h'],['Tire grip μ',r.grip.toFixed(2)],['Peak braking',r.brakeG.toFixed(2)+' g'],['Peak cornering',r.latG.toFixed(2)+' g'],['Fuel / lap',r.fuel.toFixed(2)+' L'],['Stability',r.stability.toFixed(0)+' / 100']];
    $('res').innerHTML = items.map(i=>`<div class="m" ${i[2]?'id="lap"':''}><small>${i[0]}</small><b>${i[1]}</b></div>`).join('');
    $('note').textContent = r.stability < 60 ? 'Low stability: a time penalty is applied to your score.' : '';
  }
  function record(src) {
    const r = simulateLap(setup); cur = r;
    const h = {setup:{...setup}, score:r.score, lap:r.lapTime, src}; hist.push(h);
    if (!best || h.score < best.score) best = h;
    show(r); chart(); return r;
  }
  function play(r) {
    cancelAnimationFrame(anim); let t0 = null, k = 0; const SPEED = 6;
    const step = ts => { if (t0 == null) t0 = ts; const t = (ts-t0)/1000*SPEED;
      if (t >= r.lapTime) { drawTrack(r, 0); $('live').textContent = 'Lap complete'; $('prog').textContent = '100%'; return; }
      while (r.t[k+1] < t) k++; drawTrack(r, k);
      $('live').textContent = Math.round(r.v[k]*3.6)+' km/h'; $('prog').textContent = Math.round(100*k/Track.N)+'%';
      anim = requestAnimationFrame(step); };
    anim = requestAnimationFrame(step);
  }
  function chart() {
    const c = $('chart'), g = c.getContext('2d'), w = c.width, h = c.height; g.clearRect(0,0,w,h);
    if (!hist.length) return;
    const sc = hist.map(x=>x.score), lo = Math.min(...sc)-0.5, hi = Math.max(...sc)+0.5, n = Math.max(hist.length, 10);
    const X = i => 40+(w-55)*i/(n-1), Y = v => h-25-(h-40)*(v-lo)/(hi-lo);
    g.fillStyle = '#8b94a5'; g.font = '11px sans-serif'; g.fillText(hi.toFixed(1)+' s',2,14); g.fillText(lo.toFixed(1)+' s',2,h-25); g.fillText('run #',w-40,h-6);
    hist.forEach((x,i)=>{ g.fillStyle = x.src==='AI'?'#3ddc97':'#8b94a5'; g.beginPath(); g.arc(X(i),Y(x.score),3,0,7); g.fill(); });
    let b = Infinity; g.strokeStyle = '#ff5a36'; g.lineWidth = 2; g.beginPath();
    hist.forEach((x,i)=>{ b = Math.min(b,x.score); i?g.lineTo(X(i),Y(b)):g.moveTo(X(i),Y(b)); }); g.stroke();
  }
  function apply(s) { Object.assign(setup, s); sync(); }
  $('run').onclick = () => play(record('You'));
  $('sug').onclick = () => { apply(Opt.suggest(hist)); play(record('AI')); };
  $('reset').onclick = () => { PARAMS.forEach(p => setup[p.key] = p.def); sync(); };
  $('auto').onclick = () => {
    if (busy) return; busy = true; $('auto').disabled = true; let i = 0;
    const loop = () => { apply(Opt.suggest(hist)); record('AI'); $('live').textContent = `AI tuning… run ${++i}/30`;
      if (i < 30) setTimeout(loop, 40); else { apply(best.setup); play(record('AI')); busy = false; $('auto').disabled = false; } };
    loop();
  };
  sync(); drawTrack(null);
})();
