const canvas = document.getElementById('dot-grid');
const context = canvas.getContext('2d');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let dots = [], width = 0, height = 0, frame = null;
let previousFrame = 0;
const pointer = { x: -1000, y: -1000 };
const ripples = [];
const rippleDuration = 1500;
function render() {
  context.clearRect(0, 0, width, height);
  const now = performance.now();
  const step = Math.min((now - previousFrame) / 16.667 || 1, 2);
  previousFrame = now;
  while (ripples.length && now - ripples[0].start > rippleDuration) ripples.shift();
  let moving = ripples.length > 0;
  for (const dot of dots) {
    const dx = dot.homeX - pointer.x, dy = dot.homeY - pointer.y;
    const distance = Math.hypot(dx, dy);
    const influence = Math.max(0, 1 - distance / 145);
    const active = motionPreference.matches ? 0 : influence;
    // Different phases and strengths let each dot respond independently.
    const push = active * active * (34 + dot.strength * 18);
    const driftX = Math.sin(now * .0018 + dot.phase) * active * 9;
    const driftY = Math.cos(now * .0015 + dot.phase * 1.7) * active * 9;
    if (active > .01) moving = true;
    let rippleX = 0, rippleY = 0, rippleLight = 0;
    for (const ripple of ripples) {
      const age = now - ripple.start;
      const rx = dot.homeX - ripple.x, ry = dot.homeY - ripple.y;
      const radius = Math.hypot(rx, ry);
      const wave = (radius - age * .8) / 42;
      const envelope = Math.exp(-wave * wave) * (1 - age / rippleDuration);
      const displacement = Math.sin(wave * 2) * envelope * 8;
      rippleX += rx / (radius || 1) * displacement;
      rippleY += ry / (radius || 1) * displacement;
      rippleLight += envelope;
    }
    const directionX = distance > .01 ? dx / distance : Math.cos(dot.phase);
    const directionY = distance > .01 ? dy / distance : Math.sin(dot.phase);
    const targetX = dot.homeX + directionX * push + driftX + rippleX;
    const targetY = dot.homeY + directionY * push + driftY + rippleY;
    dot.vx = (dot.vx + (targetX - dot.x) * .035 * step) * Math.pow(.80, step);
    dot.vy = (dot.vy + (targetY - dot.y) * .035 * step) * Math.pow(.80, step);
    dot.x += dot.vx * step;
    dot.y += dot.vy * step;
    if (Math.abs(targetX-dot.x) + Math.abs(targetY-dot.y) + Math.abs(dot.vx) + Math.abs(dot.vy) > .05) moving = true;
    context.beginPath();
    context.arc(dot.x, dot.y, 1 + influence * .65 + Math.min(rippleLight, 1) * .3, 0, Math.PI * 2);
    context.fillStyle = `rgba(255,255,255,${Math.min(1, .17 + influence * .49 + rippleLight * .25)})`;
    context.fill();
  }
  frame = moving ? requestAnimationFrame(render) : null;
}
function schedule() { if (frame === null) { previousFrame = performance.now(); frame = requestAnimationFrame(render); } }
function resize() {
  width = innerWidth; height = innerHeight;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = width * ratio; canvas.height = height * ratio;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  dots = [];
  for (let y = 14; y < height; y += 28) {
    for (let x = 14; x < width; x += 28) dots.push({homeX:x, homeY:y, x, y, vx:0, vy:0, phase:Math.random()*Math.PI*2, strength:Math.random()});
  }
  schedule();
}
window.addEventListener('pointermove', event => {
  if (event.pointerType === 'touch') return;
  pointer.x = event.clientX; pointer.y = event.clientY; schedule();
}, { passive: true });
// Click ripple effect
/*
window.addEventListener('click', event => {
  if (motionPreference.matches || event.detail === 0) return;
  // Bound the number of overlapping waves during rapid clicking.
  if (ripples.length >= 8) ripples.shift();
  ripples.push({ x: event.clientX, y: event.clientY, start: performance.now() });
  schedule();
}, { passive: true });
*/
function reset() { pointer.x = -1000; pointer.y = -1000; schedule(); }
document.documentElement.addEventListener('pointerleave', reset);
window.addEventListener('blur', reset);
window.addEventListener('resize', resize);
motionPreference.addEventListener('change', schedule);
resize();


const typedName = document.getElementById('typed-name');
const fullName = typedName.textContent;
let typingTimer;
let nameCycle;
function stopNameAnimation() {
  clearTimeout(typingTimer);
  clearInterval(nameCycle);
  typedName.textContent = fullName;
}
function retypeName() {
  let count = fullName.length;
  function erase() {
    typedName.textContent = fullName.slice(0, --count);
    if (count > 0) typingTimer = setTimeout(erase, 65);
    else typingTimer = setTimeout(type, 350);
  }
  function type() {
    typedName.textContent = fullName.slice(0, ++count);
    if (count < fullName.length) typingTimer = setTimeout(type, 110);
  }
  erase();
}
function startNameAnimation() {
  stopNameAnimation();
  if (!motionPreference.matches && !document.hidden) nameCycle = setInterval(retypeName, 15000);
}
motionPreference.addEventListener('change', startNameAnimation);
document.addEventListener('visibilitychange', startNameAnimation);
startNameAnimation();

// A glossy companion with spring dragging and softly changing flight.
const cat = document.getElementById('ascii-cat');
let catX = Math.max(0, innerWidth - 150), catY = Math.max(0, innerHeight - 180);
let catVX = -.3, catVY = -.15, catFrame = null, catLast = 0;
let catDrag = null;
function clampCat() {
  const maxX = Math.max(0, innerWidth - cat.offsetWidth);
  const maxY = Math.max(0, innerHeight - cat.offsetHeight);
  if (catX < 0 || catX > maxX) catVX *= -.7;
  if (catY < 0 || catY > maxY) catVY *= -.7;
  catX = Math.max(0, Math.min(catX, maxX));
  catY = Math.max(0, Math.min(catY, maxY));
}
function paintCat() {
  const tilt = motionPreference.matches ? 0 : Math.max(-7, Math.min(7, catVX * 1.5));
  cat.style.transform = `translate3d(${catX}px, ${catY}px, 0) rotate(${tilt}deg)`;
}
function floatCat(now) {
  const step = Math.min((now - catLast) / 16.667 || 1, 2);
  catLast = now;
  if (catDrag) {
    if (motionPreference.matches) {
      catX = catDrag.targetX; catY = catDrag.targetY; catVX = catVY = 0;
    } else {
      catVX = (catVX + (catDrag.targetX - catX) * .065 * step) * Math.pow(.67, step);
      catVY = (catVY + (catDrag.targetY - catY) * .065 * step) * Math.pow(.67, step);
      catX += catVX * step; catY += catVY * step;
    }
  } else if (!motionPreference.matches) {
    const desiredX = Math.sin(now * .00023) * .42;
    const desiredY = Math.cos(now * .00031) * .32;
    catVX += (desiredX - catVX) * .012 * step;
    catVY += (desiredY - catVY) * .012 * step;
    // Gentle edge forces steer the bubble away before it hits the viewport.
    const right = innerWidth - cat.offsetWidth, bottom = innerHeight - cat.offsetHeight;
    if (catX < 28) catVX += .025 * step;
    if (catX > right - 28) catVX -= .025 * step;
    if (catY < 28) catVY += .025 * step;
    if (catY > bottom - 28) catVY -= .025 * step;
    catVX = Math.max(-4, Math.min(4, catVX));
    catVY = Math.max(-4, Math.min(4, catVY));
    catX += catVX * step; catY += catVY * step;
  }
  clampCat(); paintCat();
  catFrame = !document.hidden && (catDrag || !motionPreference.matches) ? requestAnimationFrame(floatCat) : null;
}
function syncCatMotion() {
  cancelAnimationFrame(catFrame); catFrame = null;
  if (!document.hidden && (catDrag || !motionPreference.matches)) {
    catLast = performance.now(); catFrame = requestAnimationFrame(floatCat);
  }
}
cat.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  catDrag = { id: event.pointerId, x: event.clientX - catX, y: event.clientY - catY, targetX: catX, targetY: catY };
  cat.setPointerCapture(event.pointerId);
  cat.classList.add('dragging'); syncCatMotion(); event.preventDefault();
});
cat.addEventListener('pointermove', event => {
  if (!catDrag || event.pointerId !== catDrag.id) return;
  catDrag.targetX = Math.max(0, Math.min(event.clientX - catDrag.x, innerWidth - cat.offsetWidth));
  catDrag.targetY = Math.max(0, Math.min(event.clientY - catDrag.y, innerHeight - cat.offsetHeight));
});
function releaseCat(event) {
  if (!catDrag || event.pointerId !== catDrag.id) return;
  catDrag = null; cat.classList.remove('dragging'); syncCatMotion();
}
cat.addEventListener('pointerup', releaseCat);
cat.addEventListener('pointercancel', releaseCat);
cat.addEventListener('lostpointercapture', releaseCat);
cat.addEventListener('keydown', event => {
  const delta = { ArrowLeft: [-15,0], ArrowRight: [15,0], ArrowUp: [0,-15], ArrowDown: [0,15] }[event.key];
  if (!delta) return;
  event.preventDefault(); catX += delta[0]; catY += delta[1]; clampCat(); paintCat();
});
window.addEventListener('resize', () => { clampCat(); paintCat(); });
document.addEventListener('visibilitychange', syncCatMotion);
motionPreference.addEventListener('change', syncCatMotion);
clampCat(); paintCat(); syncCatMotion();
