// ============================================================
// Urban Heat AI v2 — Background Effects & Counter Animations
// ============================================================

(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  function Particle() {
    this.x = Math.random()*W; this.y = Math.random()*H;
    this.r = Math.random()*1.5+0.4;
    this.dx = (Math.random()-0.5)*0.25; this.dy = (Math.random()-0.5)*0.25;
    this.alpha = Math.random()*0.4+0.1;
  }
  for (let i=0;i<90;i++) particles.push(new Particle());

  function draw() {
    ctx.clearRect(0,0,W,H);
    particles.forEach(p=>{
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle='rgba(251,146,60,'+p.alpha+')'; ctx.fill();
      p.x+=p.dx; p.y+=p.dy;
      if(p.x<0||p.x>W) p.dx*=-1; if(p.y<0||p.y>H) p.dy*=-1;
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

document.addEventListener('DOMContentLoaded', ()=>{
  // Scroll reveal
  const els = document.querySelectorAll('.reveal');
  if (els.length) {
    const obs = new IntersectionObserver(entries=>{
      entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('visible'); });
    },{threshold:0.12});
    els.forEach(el=>obs.observe(el));
  }
  // Counter animations (home page)
  document.querySelectorAll('[data-count]').forEach(el=>{
    const final=parseFloat(el.dataset.count), decimals=parseInt(el.dataset.decimals||'0'),
          suffix=el.dataset.suffix||'', finalText=el.dataset.final||(final+suffix);
    let start=null, duration=1800;
    function step(ts){
      if(!start) start=ts;
      const p=Math.min((ts-start)/duration,1), ease=1-Math.pow(1-p,3);
      el.textContent=(decimals?((final*ease).toFixed(decimals)):(Math.floor(final*ease)))+suffix;
      if(p<1) requestAnimationFrame(step); else el.textContent=finalText;
    }
    setTimeout(()=>requestAnimationFrame(step),300);
  });
});
