const video = document.getElementById('inputVideo');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');
const stage = document.getElementById('cameraStage');
const placeholder = document.getElementById('cameraPlaceholder');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const systemStatus = document.getElementById('systemStatus');
const cameraStat = document.getElementById('cameraStat');
const cameraSub = document.getElementById('cameraSub');
const trackingBadge = document.getElementById('trackingBadge');
const gestureName = document.getElementById('gestureName');
const gestureMeaning = document.getElementById('gestureMeaning');
const resultSymbol = document.getElementById('resultSymbol');
const confidence = document.getElementById('confidence');
const sentenceText = document.getElementById('sentenceText');
const feedback = document.getElementById('feedback');
const detectionCount = document.getElementById('detectionCount');

let hands = null, camera = null, running = false, lastGesture = '', stableFrames = 0;
let lastAdded = '', lastAddedAt = 0, count = 0, sentence = [];
const gestureInfo = {
  'Open palm': {meaning:'Hello', symbol:'✋'},
  'Closed fist': {meaning:'Thank you', symbol:'✊'},
  'Index finger up': {meaning:'One / attention', symbol:'☝️'},
  'Two fingers up': {meaning:'Peace', symbol:'✌️'},
  'Thumbs up': {meaning:'Yes / good', symbol:'👍'}
};

function fingerUp(lm, tip, pip, mcp) {
  // Hand landmarks are mirrored for the preview. For fingers, compare y coordinates.
  return lm[tip].y < lm[pip].y && lm[pip].y < lm[mcp].y + 0.02;
}
function classify(lm) {
  const index = fingerUp(lm, 8, 6, 5);
  const middle = fingerUp(lm, 12, 10, 9);
  const ring = fingerUp(lm, 16, 14, 13);
  const pinky = fingerUp(lm, 20, 18, 17);
  // Thumb direction is evaluated vertically for a simple thumbs-up approximation.
  const thumbUp = lm[4].y < lm[3].y - 0.045 && lm[4].y < lm[2].y;
  const extended = [index, middle, ring, pinky].filter(Boolean).length;
  if (extended === 4) return 'Open palm';
  if (extended === 0 && !thumbUp) return 'Closed fist';
  if (index && middle && !ring && !pinky) return 'Two fingers up';
  if (index && !middle && !ring && !pinky) return 'Index finger up';
  if (thumbUp && extended === 0) return 'Thumbs up';
  return null;
}
function drawLandmarks(lm) {
  const w = canvas.width, h = canvas.height;
  const connections = (window.HAND_CONNECTIONS || []);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#65e5c1';
  connections.forEach(pair => {
    const a = lm[pair[0]], b = lm[pair[1]];
    if (!a || !b) return;
    ctx.beginPath(); ctx.moveTo(a.x*w, a.y*h); ctx.lineTo(b.x*w, b.y*h); ctx.stroke();
  });
  lm.forEach(p => {
    ctx.beginPath(); ctx.arc(p.x*w, p.y*h, 4, 0, Math.PI*2);
    ctx.fillStyle = '#f7fbff'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#6558e8'; ctx.stroke();
  });
}
async function logRecognition(name, meaning) {
  try {
    await fetch('/api/recognition', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({gesture:name, meaning})
    });
  } catch (e) { /* local display still works if logging fails */ }
}
function setCurrent(name, confidenceText='Tracking') {
  if (!name || !gestureInfo[name]) {
    gestureName.textContent = 'Gesture not recognized';
    gestureMeaning.textContent = 'Try one of the five hand shapes shown below.';
    resultSymbol.textContent = '⌁'; confidence.textContent = '—';
    return;
  }
  const info = gestureInfo[name];
  gestureName.textContent = name;
  gestureMeaning.textContent = `Suggested message: “${info.meaning}”`;
  resultSymbol.textContent = info.symbol;
  confidence.textContent = confidenceText;
  if (name === lastAdded && Date.now() - lastAddedAt < 1800) return;
  if (name === lastGesture) stableFrames++; else { lastGesture = name; stableFrames = 1; }
  // Require several consecutive frames to reduce flickering false detections.
  if (stableFrames >= 12 && (name !== lastAdded || Date.now() - lastAddedAt > 2200)) {
    sentence.push(info.meaning);
    sentence = sentence.slice(-30);
    sentenceText.textContent = sentence.join(' ');
    if (sentence.length === 1) sentenceText.style.color = '#53576d';
    lastAdded = name; lastAddedAt = Date.now(); count++;
    detectionCount.textContent = count;
    feedback.textContent = `Added “${info.meaning}” to your message.`;
    logRecognition(name, info.meaning);
  }
}
function onResults(results) {
  if (!running) return;
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (results.image) ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
  // The canvas and preview are mirrored together by CSS, so landmarks use normal coordinates.
  if (results.multiHandLandmarks && results.multiHandLandmarks.length) {
    drawLandmarks(results.multiHandLandmarks[0]);
    const found = classify(results.multiHandLandmarks[0]);
    trackingBadge.textContent = '● HAND DETECTED';
    setCurrent(found);
  } else {
    trackingBadge.textContent = '● SEARCHING FOR HAND';
    gestureName.textContent = 'No hand detected';
    gestureMeaning.textContent = 'Place one hand in view of the camera.';
    resultSymbol.textContent = '⌁'; confidence.textContent = '—';
    lastGesture = ''; stableFrames = 0;
  }
}
async function startCamera() {
  if (running) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    feedback.textContent = 'Camera access needs localhost or HTTPS. Open the app at http://127.0.0.1:5000.';
    return;
  }
  startBtn.disabled = true; feedback.textContent = 'Loading hand-tracking model…';
  try {
    if (!window.Hands || !window.Camera) throw new Error('MediaPipe did not load. Check your internet connection and refresh.');
    hands = new Hands({locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
    hands.setOptions({maxNumHands:1, modelComplexity:1, minDetectionConfidence:0.65, minTrackingConfidence:0.6});
    hands.onResults(onResults);
    camera = new Camera(video, {
      onFrame: async () => { if (hands && running) await hands.send({image:video}); },
      width: 640, height: 480
    });
    await camera.start();
    running = true;
    stage.classList.add('active'); placeholder.style.display = 'none';
    startBtn.textContent = '● Camera running'; stopBtn.disabled = false;
    systemStatus.textContent = 'Tracking active'; cameraStat.textContent = 'Active';
    cameraSub.textContent = 'Hand tracking enabled'; feedback.textContent = 'Show a supported gesture to begin.';
    trackingBadge.textContent = '● CAMERA ACTIVE';
  } catch (err) {
    running = false; startBtn.disabled = false;
    feedback.textContent = err.message || 'Could not start camera. Check browser permission.';
    systemStatus.textContent = 'Camera unavailable'; cameraStat.textContent = 'Unavailable';
    if (camera && camera.stop) camera.stop();
  }
}
function stopCamera() {
  running = false;
  if (camera && camera.stop) camera.stop();
  if (hands && hands.close) hands.close();
  hands = null; camera = null;
  if (video.srcObject) video.srcObject.getTracks().forEach(track => track.stop());
  video.srcObject = null;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  stage.classList.remove('active'); placeholder.style.display = 'block';
  startBtn.disabled = false; startBtn.textContent = '▶ Start camera'; stopBtn.disabled = true;
  systemStatus.textContent = 'System ready'; cameraStat.textContent = 'Not started'; cameraSub.textContent = 'Permission required';
  trackingBadge.textContent = '● WAITING FOR CAMERA'; gestureName.textContent = 'Waiting for input';
  gestureMeaning.textContent = 'Start the camera and show one of the supported hand shapes.';
  resultSymbol.textContent = '✳'; confidence.textContent = '—'; feedback.textContent = 'Camera stopped.';
}
startBtn.addEventListener('click', startCamera);
stopBtn.addEventListener('click', stopCamera);
document.getElementById('clearSentence').addEventListener('click', () => {
  sentence = []; sentenceText.textContent = 'Your recognized gestures will appear here…';
  sentenceText.style.color = '#9a9daf'; lastAdded = ''; feedback.textContent = 'Message cleared.';
});
document.getElementById('speakBtn').addEventListener('click', () => {
  if (!sentence.length) { feedback.textContent = 'Recognize a gesture first.'; return; }
  if (!('speechSynthesis' in window)) { feedback.textContent = 'Speech output is not supported in this browser.'; return; }
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(sentence.join(' '));
  utterance.rate = 0.9; speechSynthesis.speak(utterance);
});
document.getElementById('copyBtn').addEventListener('click', async () => {
  if (!sentence.length) { feedback.textContent = 'Recognize a gesture first.'; return; }
  try { await navigator.clipboard.writeText(sentence.join(' ')); feedback.textContent = 'Message copied to clipboard.'; }
  catch(e) { feedback.textContent = 'Clipboard access was blocked by the browser.'; }
});
window.addEventListener('beforeunload', stopCamera);
