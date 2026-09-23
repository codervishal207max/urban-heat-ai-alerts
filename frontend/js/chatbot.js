// // ============================================================
// // Urban Heat AI v2 — HeatBot Chatbot
// // Keyword-based, Hindi+English, logs all chats to database
// // ============================================================

// const CHATBOT_KB = [
//   { keys:['uhi','urban heat island','heat island','kya hai','what is uhi'],
//     answer:`🌡️ <b>Urban Heat Island (UHI)</b> ek phenomenon hai jisme cities apne surrounding rural areas se significantly zyada garam hote hain.<br><br><b>Main reasons:</b><br>• Concrete &amp; asphalt jo heat absorb karta hai<br>• Air conditioning se nikla waste heat<br>• Kam trees &amp; vegetation<br>• Dark surfaces jo sunlight reflect nahi karte<br><br>Delhi mein UHI intensity <b>4–10°C</b> tak hoti hai rural areas se compare karke.` },
//   { keys:['lst','land surface temperature','temperature','temp','garam','heat data'],
//     answer:`📊 <b>Land Surface Temperature (LST)</b> satellite se measure hoti hai.<br><br>• Avg LST varies by city (Delhi ~39°C, Bangalore ~32°C)<br>• Max LST: hottest zones <b>45–47°C</b> tak<br>• Danger threshold: <b>40°C</b> se upar serious health risk<br><br>Map pe LST layer enable karo to see real-time zone-wise distribution!` },
//   { keys:['alert','heat alert','warning','danger','khatre','emergency'],
//     answer:`🚨 <b>Heat Alert Levels:</b><br><br>🔴 <b>EXTREME</b> (LST &gt; 44°C) — Emergency cooling centers deploy karo<br>🟠 <b>HIGH</b> (LST 40–44°C) — Vulnerable populations at risk<br>🟡 <b>MODERATE</b> (LST 36–40°C) — Limit outdoor activity 12–15:00<br>🟢 <b>LOW</b> (&lt; 36°C) — Normal precautions<br><br>Sidebar mein <b>Heat Alerts</b> panel mein zone-wise live alerts dekho!` },
//   { keys:['health','hospital','death','mortality','sick','bemar','vulnerable','sehat'],
//     answer:`🏥 <b>Health Impacts of Urban Heat:</b><br><br>• Heat stroke risk: <b>180%</b> higher in extreme zones<br>• Respiratory disease: <b>45%</b> increase<br>• Child mortality: <b>2×</b> in summer peak<br>• Elderly 65+ most vulnerable group<br><br>HVI (Heat Vulnerability Index) &gt; 0.7 wale areas mein emergency response deploy karni chahiye.` },
//   { keys:['ndvi','vegetation','green cover','tree','plant','ped','hariyali'],
//     answer:`🌿 <b>NDVI (Vegetation Index)</b> 0–1 scale pe:<br><br>• <b>0.6+</b> = Dense forest (−3°C cooling effect)<br>• <b>0.4–0.6</b> = Good green cover<br>• <b>0.2–0.4</b> = Sparse vegetation<br>• <b>&lt;0.2</b> = Barren/Urban — high heat risk<br><br>Each 0.1 NDVI increase reduces local LST by ~<b>1.2°C</b>. Map pe NDVI layer toggle karo!` },
//   { keys:['cooling','solution','reduce heat','recommend','suggestion','kaise','fix','kya kare'],
//     answer:`🌳 <b>Top Cooling Solutions:</b><br><br>1. 🌳 <b>Green Cover +20%</b> — −2.5°C avg LST<br>2. 🏠 <b>Cool Roofs</b> — White/reflective surfaces, −1.8°C<br>3. 🛣️ <b>Cool Pavements</b> — Permeable surfaces, −1.2°C<br>4. 💧 <b>Water Bodies</b> — Lakes + fountains, −3.1°C<br>5. ⚡ <b>Cooling Centers</b> — Emergency AC shelters near hotspot zones<br><br>Sidebar Simulation panel se koi bhi scenario model karo!` },
//   { keys:['climate change','global warming','climate','carbon','emission','greenhouse','jalawayu'],
//     answer:`🌍 <b>Climate Change Impact on Indian Cities:</b><br><br>By 2050 projections:<br>• Avg temp: <b>+2.5°C</b> additional rise<br>• Extreme heat days: <b>30 → 80 days/year</b><br>• UHI intensity: <b>+1.8°C</b> compounding<br>• Monsoon disruption affecting NDVI city-wide<br><br>🚨 Delhi, Ahmedabad &amp; Jaipur mein <b>EXTREME</b> climate risk hai. Immediate action needed!` },
//   { keys:['backend','api','server','fastapi','connected','offline','demo'],
//     answer:`⚙️ <b>Backend Status:</b><br><br>Yeh platform FastAPI backend se connected hai.<br><br>• Backend <b>online</b> ho to: live ML-computed data milta hai<br>• Backend <b>offline</b> ho to: intelligent demo data use hota hai<br><br><b>Backend start karne ke liye:</b><br><code>pip install -r requirements.txt</code><br><code>python -m backend.main</code><br><br>Phir <a href="http://localhost:8000" style="color:#38bdf8">http://localhost:8000</a> open karo!` },
//   { keys:['delhi','ncr','new delhi'],
//     answer:`🏛️ <b>Delhi NCR Heat Analysis:</b><br>• Avg LST: <b>39.2°C</b> | Max: <b>46.8°C</b><br>• High Risk Zones: <b>213</b><br>• Population at Risk: <b>1.2M</b><br>• Climate Risk: <b>EXTREME</b><br><br>Hotspots: Okhla industrial, Shahdara, dense Central Delhi colonies.` },
//   { keys:['mumbai','bombay'],
//     answer:`🌊 <b>Mumbai Heat Analysis:</b><br>• Avg LST: <b>34.5°C</b> | Max: <b>41.2°C</b><br>• High Risk Zones: <b>156</b><br>• Sea breeze partially reduces UHI near coast<br><br>Hotspots: Kurla East, Bhandup, Dharavi — dense areas with low vegetation.` },
//   { keys:['bangalore','bengaluru'],
//     answer:`🌿 <b>Bangalore Heat Analysis:</b><br>• Avg LST: <b>32.1°C</b> | Max: <b>38.6°C</b><br>• <b>Lowest heat risk</b> among major metros!<br>• Higher green cover than most cities<br><br>⚠️ Rapid urbanization in Whitefield &amp; E.City removing green cover fast.` },
//   { keys:['jaipur','rajasthan'],
//     answer:`🌹 <b>Jaipur Heat Analysis:</b><br>• Avg LST: <b>40.1°C</b> | Max: <b>46.2°C</b><br>• High Risk Zones: <b>201</b> — EXTREME climate risk<br><br>Desert climate + rapid urbanization = one of India's most heat-stressed cities. Traditional step-wells (baolis) could restore evaporative cooling!` },
//   { keys:['simulation','simulate','what if','scenario','kya hoga'],
//     answer:`🧪 <b>Simulation Tool:</b><br><br>1. Left sidebar → <b>Simulation</b> panel<br>2. Choose scenario (Green Cover, Cool Roofs, etc.)<br>3. Set coverage % with slider<br>4. Click <b>Run Simulation</b><br><br>📊 Results show: LST reduction, lives saved/yr, people benefited &amp; economic savings!<br><br>Backend online ho to ML-based simulation milta hai!` },
//   { keys:['database','activity','log','history','record'],
//     answer:`🗄️ <b>Activity Database:</b><br><br>Sab kuch automatically log hota hai:<br>• City switches • Layer toggles • Simulations<br>• Chatbot chats (yeh bhi!) • Heat alerts<br><br><a href="database.html" style="color:#38bdf8">🔗 Database page</a> pe jaao — CSV export bhi hai!` },
//   { keys:['hotspot','worst','sabse garam','highest temp','extreme zone'],
//     answer:`📍 <b>UHI Hotspots:</b><br><br>Map pe <b>UHI Hotspots</b> layer enable karo.<br>Typical hotspot locations:<br>• 🏭 Industrial zones (factories, power plants)<br>• 🏪 Dense commercial markets<br>• 🏘️ Dark-roof slum clusters<br>• 🛣️ Highways &amp; parking lots<br><br>Threshold: UHI intensity &gt; <b>2.0°C</b> = hotspot zone.` },
//   { keys:['help','kya puch','features','guide','use kaise','topics','what can'],
//     answer:`📚 <b>I can help with:</b><br><br>🌡️ <b>heat</b> / <b>lst</b> — Temperature data<br>⚠️ <b>alert</b> — Heat warnings<br>🏥 <b>health</b> — Risk &amp; mortality<br>🌿 <b>ndvi</b> — Vegetation index<br>🌳 <b>recommend</b> — Cooling solutions<br>🌍 <b>climate</b> — Future projections<br>🧪 <b>simulation</b> — What-if scenarios<br>🗄️ <b>database</b> — Activity logs<br>⚙️ <b>backend</b> — API &amp; server info<br>🏙️ City names — Delhi, Mumbai…<br><br>Type karo, main help karunga! 😊` }
// ];

// function getBotReply(msg) {
//   const q = msg.toLowerCase();
//   for (const item of CHATBOT_KB) {
//     if (item.keys.some(k => q.includes(k))) return item.answer;
//   }
//   return `🤔 "<b>${msg.slice(0,40)}</b>" ke baare mein specific answer nahi mila.<br><br>Type <b>help</b> — sab topics dekhne ke liye<br>Type <b>alert</b> — heat warnings<br>Type <b>recommend</b> — cooling solutions<br>Type <b>backend</b> — API connection info`;
// }

// function appendMsg(role, html) {
//   const box = document.getElementById('chatbot-messages');
//   if (!box) return;
//   const div = document.createElement('div');
//   div.className = 'chat-msg ' + role;
//   div.innerHTML = '<span class="chat-avatar">'+(role==='bot'?'🌡️':'👤')+'</span>'
//     +'<div class="chat-bubble">'+html.replace(/\n/g,'<br>')+'</div>';
//   div.style.opacity = '0';
//   box.appendChild(div);
//   requestAnimationFrame(() => { div.style.transition='opacity 0.35s'; div.style.opacity='1'; });
//   box.scrollTop = box.scrollHeight;
// }

// function showTyping() {
//   const box = document.getElementById('chatbot-messages');
//   const div = document.createElement('div');
//   div.className = 'chat-msg bot typing-msg';
//   div.innerHTML = '<span class="chat-avatar">🌡️</span><div class="chat-bubble"><span class="typing-dots"><span></span><span></span><span></span></span></div>';
//   box.appendChild(div); box.scrollTop = box.scrollHeight;
//   return div;
// }

// function saveChatLog(userMsg, botHtml, source) {
//   const city = window.currentCity || 'unknown';
//   const plainReply = botHtml.replace(/<[^>]+>/g, '');
//   // Fire-and-forget to backend SQLite; don't block the chat UI on it.
//   fetch((typeof API_BASE !== 'undefined' ? API_BASE : '') + '/activity/chat', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ city, user_msg: userMsg, bot_reply: plainReply, source: source || 'keyword' })
//   }).catch(() => { /* offline — localStorage below still has it */ });

//   try {
//     const hist = JSON.parse(localStorage.getItem('uhai_chat_history') || '[]');
//     hist.push({ timestamp:Date.now(), city, userMsg, botReply: plainReply });
//     localStorage.setItem('uhai_chat_history', JSON.stringify(hist.slice(-500)));
//   } catch(e) {}
//   if (typeof logActivity==='function') logActivity('chat','Chat: '+userMsg.slice(0,60),'bot replied');
// }

// // ---- Try the Groq-backed LLM first; fall back to local keyword bot ----
// async function getLLMReply(msg) {
//   try {
//     const controller = new AbortController();
//     const timer = setTimeout(() => controller.abort(), 8000);
//     const res = await fetch((typeof API_BASE !== 'undefined' ? API_BASE : '') + '/chat/ask', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ message: msg, city: window.currentCity || 'delhi' }),
//       signal: controller.signal
//     });
//     clearTimeout(timer);
//     if (!res.ok) return null;
//     const data = await res.json();
//     if (!data.ok || !data.reply) return null;
//     // Convert plain-text/markdown-ish LLM reply to simple HTML for the chat bubble
//     const html = data.reply
//       .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
//       .replace(/\*\*(.+?)\*\*/g,'<b>$1</b>')
//       .replace(/\n/g,'<br>');
//     return { html: '🤖 ' + html, source: 'llm', model: data.model };
//   } catch (e) {
//     return null; // network/timeout — fall back
//   }
// }

// async function sendChat(msg) {
//   msg = msg.trim(); if (!msg) return;
//   const inp = document.getElementById('chatbot-input'); if (inp) inp.value='';
//   appendMsg('user', msg);
//   const typing = showTyping();
//   const llm = await getLLMReply(msg);
//   typing.remove();
//   if (llm) {
//     appendMsg('bot', llm.html);
//     saveChatLog(msg, llm.html, 'llm');
//   } else {
//     const r = getBotReply(msg);
//     appendMsg('bot', r);
//     saveChatLog(msg, r, 'keyword');
//   }
// }

// function initChatbot() {
//   const fab   = document.getElementById('chatbot-fab');
//   const panel = document.getElementById('chatbot-panel');
//   const close = document.getElementById('chatbot-close');
//   const send  = document.getElementById('chatbot-send');
//   const input = document.getElementById('chatbot-input');
//   const dot   = document.getElementById('chatbot-dot');
//   if (!fab||!panel) return;
//   fab.addEventListener('click', () => {
//     panel.classList.toggle('open');
//     if (panel.classList.contains('open')) {
//       if (dot) dot.style.display='none';
//       setTimeout(()=>input&&input.focus(),250);
//       if (typeof logActivity==='function') logActivity('chat','Opened chatbot','');
//     }
//   });
//   close.addEventListener('click', ()=>panel.classList.remove('open'));
//   send.addEventListener('click',  ()=>sendChat(input.value));
//   input.addEventListener('keydown', e=>{ if(e.key==='Enter') sendChat(input.value); });
//   document.querySelectorAll('.suggestion-chip').forEach(c=>c.addEventListener('click',()=>sendChat(c.textContent)));
//   setTimeout(()=>{ if(dot&&!panel.classList.contains('open')) dot.style.display='block'; },5000);
// }

// document.addEventListener('DOMContentLoaded', initChatbot);

// ============================================================
// Urban Heat AI v2 — HeatBot Chatbot
// Keyword bot (offline fallback) + Groq LLM + Wikipedia grounding +
// Hugging Face image generation. Logs all chats to database.
// ============================================================


// ============================================================
// Urban Heat AI v2 — HeatBot Chatbot
// Keyword bot (offline fallback) + Groq LLM + Wikipedia grounding +
// Hugging Face image generation. Logs all chats to database.
// ============================================================

const CHATBOT_KB = [
  { keys:['uhi','urban heat island','heat island','kya hai','what is uhi'],
    answer:`🌡️ <b>Urban Heat Island (UHI)</b> ek phenomenon hai jisme cities apne surrounding rural areas se significantly zyada garam hote hain.<br><br><b>Main reasons:</b><br>• Concrete &amp; asphalt jo heat absorb karta hai<br>• Air conditioning se nikla waste heat<br>• Kam trees &amp; vegetation<br>• Dark surfaces jo sunlight reflect nahi karte<br><br>Delhi mein UHI intensity <b>4–10°C</b> tak hoti hai rural areas se compare karke.` },
  { keys:['lst','land surface temperature','temperature','temp','garam','heat data'],
    answer:`📊 <b>Land Surface Temperature (LST)</b> satellite se measure hoti hai.<br><br>• Avg LST varies by city (Delhi ~39°C, Bangalore ~32°C)<br>• Max LST: hottest zones <b>45–47°C</b> tak<br>• Danger threshold: <b>40°C</b> se upar serious health risk<br><br>Map pe LST layer enable karo to see real-time zone-wise distribution!` },
  { keys:['alert','heat alert','warning','danger','khatre','emergency'],
    answer:`🚨 <b>Heat Alert Levels:</b><br><br>🔴 <b>EXTREME</b> (LST &gt; 44°C) — Emergency cooling centers deploy karo<br>🟠 <b>HIGH</b> (LST 40–44°C) — Vulnerable populations at risk<br>🟡 <b>MODERATE</b> (LST 36–40°C) — Limit outdoor activity 12–15:00<br>🟢 <b>LOW</b> (&lt; 36°C) — Normal precautions<br><br>Sidebar mein <b>Heat Alerts</b> panel mein zone-wise live alerts dekho!` },
  { keys:['health','hospital','death','mortality','sick','bemar','vulnerable','sehat'],
    answer:`🏥 <b>Health Impacts of Urban Heat:</b><br><br>• Heat stroke risk: <b>180%</b> higher in extreme zones<br>• Respiratory disease: <b>45%</b> increase<br>• Child mortality: <b>2×</b> in summer peak<br>• Elderly 65+ most vulnerable group<br><br>HVI (Heat Vulnerability Index) &gt; 0.7 wale areas mein emergency response deploy karni chahiye.` },
  { keys:['ndvi','vegetation','green cover','tree','plant','ped','hariyali'],
    answer:`🌿 <b>NDVI (Vegetation Index)</b> 0–1 scale pe:<br><br>• <b>0.6+</b> = Dense forest (−3°C cooling effect)<br>• <b>0.4–0.6</b> = Good green cover<br>• <b>0.2–0.4</b> = Sparse vegetation<br>• <b>&lt;0.2</b> = Barren/Urban — high heat risk<br><br>Each 0.1 NDVI increase reduces local LST by ~<b>1.2°C</b>. Map pe NDVI layer toggle karo!` },
  { keys:['cooling','solution','reduce heat','recommend','suggestion','kaise','fix','kya kare'],
    answer:`🌳 <b>Top Cooling Solutions:</b><br><br>1. 🌳 <b>Green Cover +20%</b> — −2.5°C avg LST<br>2. 🏠 <b>Cool Roofs</b> — White/reflective surfaces, −1.8°C<br>3. 🛣️ <b>Cool Pavements</b> — Permeable surfaces, −1.2°C<br>4. 💧 <b>Water Bodies</b> — Lakes + fountains, −3.1°C<br>5. ⚡ <b>Cooling Centers</b> — Emergency AC shelters near hotspot zones<br><br>Sidebar Simulation panel se koi bhi scenario model karo!` },
  { keys:['climate change','global warming','climate','carbon','emission','greenhouse','jalawayu'],
    answer:`🌍 <b>Climate Change Impact on Indian Cities:</b><br><br>By 2050 projections:<br>• Avg temp: <b>+2.5°C</b> additional rise<br>• Extreme heat days: <b>30 → 80 days/year</b><br>• UHI intensity: <b>+1.8°C</b> compounding<br>• Monsoon disruption affecting NDVI city-wide<br><br>🚨 Delhi, Ahmedabad &amp; Jaipur mein <b>EXTREME</b> climate risk hai. Immediate action needed!` },
  { keys:['backend','api','server','fastapi','connected','offline','demo'],
    answer:`⚙️ <b>Backend Status:</b><br><br>Yeh platform FastAPI backend se connected hai.<br><br>• Backend <b>online</b> ho to: live ML-computed data milta hai<br>• Backend <b>offline</b> ho to: intelligent demo data use hota hai<br><br><b>Backend start karne ke liye:</b><br><code>pip install -r requirements.txt</code><br><code>python -m backend.main</code><br><br>Phir <a href="http://localhost:8000" style="color:#38bdf8">http://localhost:8000</a> open karo!` },
  { keys:['delhi','ncr','new delhi'],
    answer:`🏛️ <b>Delhi NCR Heat Analysis:</b><br>• Avg LST: <b>39.2°C</b> | Max: <b>46.8°C</b><br>• High Risk Zones: <b>213</b><br>• Population at Risk: <b>1.2M</b><br>• Climate Risk: <b>EXTREME</b><br><br>Hotspots: Okhla industrial, Shahdara, dense Central Delhi colonies.` },
  { keys:['mumbai','bombay'],
    answer:`🌊 <b>Mumbai Heat Analysis:</b><br>• Avg LST: <b>34.5°C</b> | Max: <b>41.2°C</b><br>• High Risk Zones: <b>156</b><br>• Sea breeze partially reduces UHI near coast<br><br>Hotspots: Kurla East, Bhandup, Dharavi — dense areas with low vegetation.` },
  { keys:['bangalore','bengaluru'],
    answer:`🌿 <b>Bangalore Heat Analysis:</b><br>• Avg LST: <b>32.1°C</b> | Max: <b>38.6°C</b><br>• <b>Lowest heat risk</b> among major metros!<br>• Higher green cover than most cities<br><br>⚠️ Rapid urbanization in Whitefield &amp; E.City removing green cover fast.` },
  { keys:['jaipur','rajasthan'],
    answer:`🌹 <b>Jaipur Heat Analysis:</b><br>• Avg LST: <b>40.1°C</b> | Max: <b>46.2°C</b><br>• High Risk Zones: <b>201</b> — EXTREME climate risk<br><br>Desert climate + rapid urbanization = one of India's most heat-stressed cities. Traditional step-wells (baolis) could restore evaporative cooling!` },
  { keys:['simulation','simulate','what if','scenario','kya hoga'],
    answer:`🧪 <b>Simulation Tool:</b><br><br>1. Left sidebar → <b>Simulation</b> panel<br>2. Choose scenario (Green Cover, Cool Roofs, etc.)<br>3. Set coverage % with slider<br>4. Click <b>Run Simulation</b><br><br>📊 Results show: LST reduction, lives saved/yr, people benefited &amp; economic savings!<br><br>Backend online ho to ML-based simulation milta hai!` },
  { keys:['database','activity','log','history','record'],
    answer:`🗄️ <b>Activity Database:</b><br><br>Sab kuch automatically log hota hai:<br>• City switches • Layer toggles • Simulations<br>• Chatbot chats (yeh bhi!) • Heat alerts<br><br><a href="database.html" style="color:#38bdf8">🔗 Database page</a> pe jaao — CSV export bhi hai!` },
  { keys:['hotspot','worst','sabse garam','highest temp','extreme zone'],
    answer:`📍 <b>UHI Hotspots:</b><br><br>Map pe <b>UHI Hotspots</b> layer enable karo.<br>Typical hotspot locations:<br>• 🏭 Industrial zones (factories, power plants)<br>• 🏪 Dense commercial markets<br>• 🏘️ Dark-roof slum clusters<br>• 🛣️ Highways &amp; parking lots<br><br>Threshold: UHI intensity &gt; <b>2.0°C</b> = hotspot zone.` },
  { keys:['help','kya puch','features','guide','use kaise','topics','what can'],
    answer:`📚 <b>I can help with:</b><br><br>🌡️ <b>heat</b> / <b>lst</b> — Temperature data<br>⚠️ <b>alert</b> — Heat warnings<br>🏥 <b>health</b> — Risk &amp; mortality<br>🌿 <b>ndvi</b> — Vegetation index<br>🌳 <b>recommend</b> — Cooling solutions<br>🌍 <b>climate</b> — Future projections<br>🧪 <b>simulation</b> — What-if scenarios<br>🗄️ <b>database</b> — Activity logs<br>⚙️ <b>backend</b> — API &amp; server info<br>🎨 <b>generate image of...</b> — AI image<br>📖 <b>wikipedia ...</b> — Live facts<br>🏙️ City names — Delhi, Mumbai…<br><br>Type karo, main help karunga! 😊` }
];

function getBotReply(msg) {
  const q = msg.toLowerCase();
  for (const item of CHATBOT_KB) {
    if (item.keys.some(k => q.includes(k))) return item.answer;
  }
  return `🤔 "<b>${msg.slice(0,40)}</b>" ke baare mein specific answer nahi mila.<br><br>Type <b>help</b> — sab topics dekhne ke liye<br>Type <b>alert</b> — heat warnings<br>Type <b>recommend</b> — cooling solutions<br>Type <b>generate image of a green city</b> — AI image bana sakta hoon<br>Type <b>wikipedia heat wave</b> — live facts</b>`;
}

function appendMsg(role, html) {
  const box = document.getElementById('chatbot-messages');
  if (!box) return null;
  const div = document.createElement('div');
  div.className = 'chat-msg ' + role;
  div.innerHTML = '<span class="chat-avatar">'+(role==='bot'?'🌡️':'👤')+'</span>'
    +'<div class="chat-bubble">'+html.replace(/\n/g,'<br>')+'</div>';
  div.style.opacity = '0';
  box.appendChild(div);
  requestAnimationFrame(() => { div.style.transition='opacity 0.35s'; div.style.opacity='1'; });
  box.scrollTop = box.scrollHeight;
  return div;
}

function appendImageMsg(base64, prompt, model) {
  const box = document.getElementById('chatbot-messages');
  if (!box) return;
  const div = document.createElement('div');
  div.className = 'chat-msg bot';
  div.innerHTML = '<span class="chat-avatar">🎨</span>'
    + '<div class="chat-bubble chat-bubble-image">'
    +   '<img class="chat-generated-img" src="data:image/png;base64,'+base64+'" alt="'+(prompt||'Generated image').replace(/"/g,'')+'">'
    +   '<div class="chat-img-caption">🎨 "'+ (prompt||'') +'" <span class="chat-img-model">· '+ (model||'AI') +'</span></div>'
    + '</div>';
  div.style.opacity = '0';
  box.appendChild(div);
  requestAnimationFrame(() => { div.style.transition='opacity 0.35s'; div.style.opacity='1'; });
  box.scrollTop = box.scrollHeight;
}

function showTyping(label) {
  const box = document.getElementById('chatbot-messages');
  const div = document.createElement('div');
  div.className = 'chat-msg bot typing-msg';
  div.innerHTML = '<span class="chat-avatar">🌡️</span><div class="chat-bubble"><span class="typing-dots"><span></span><span></span><span></span></span>'
    + (label ? '<span class="typing-label">'+label+'</span>' : '') + '</div>';
  box.appendChild(div); box.scrollTop = box.scrollHeight;
  return div;
}

function saveChatLog(userMsg, botText, source) {
  const city = window.currentCity || 'unknown';
  const plainReply = String(botText).replace(/<[^>]+>/g, '');
  fetch((typeof API_BASE !== 'undefined' ? API_BASE : '') + '/activity/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ city, user_msg: userMsg, bot_reply: plainReply, source: source || 'keyword' })
  }).catch(() => { /* offline — localStorage below still has it */ });

  try {
    const hist = JSON.parse(localStorage.getItem('uhai_chat_history') || '[]');
    hist.push({ timestamp:Date.now(), city, userMsg, botReply: plainReply });
    localStorage.setItem('uhai_chat_history', JSON.stringify(hist.slice(-500)));
  } catch(e) {}
  if (typeof logActivity==='function') logActivity('chat','Chat: '+userMsg.slice(0,60),'bot replied');
}

// ---- Try the backend first (Groq LLM / Wikipedia / HF image); fall back to local keyword bot ----
async function getSmartReply(msg) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000); // image gen can be slower
    const res = await fetch((typeof API_BASE !== 'undefined' ? API_BASE : '') + '/chat/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, city: window.currentCity || 'delhi' }),
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.ok) return null;

    if (data.type === 'image' && data.image_base64) {
      return { kind: 'image', base64: data.image_base64, prompt: data.prompt, model: data.model };
    }

    if (data.type === 'text' && data.reply) {
      const html = data.reply
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/\*\*(.+?)\*\*/g,'<b>$1</b>')
        .replace(/\n/g,'<br>');
      const sourceTag = data.wiki_source ? ' <span class="chat-source-tag">📖 Wikipedia</span>'
        : (data.model && data.model !== 'system' ? ' <span class="chat-source-tag">🤖 AI</span>' : '');
      return { kind: 'text', html: html + sourceTag, model: data.model };
    }
    return null;
  } catch (e) {
    return null; // network/timeout — fall back
  }
}

async function sendChat(msg) {
  msg = msg.trim(); if (!msg) return;
  const inp = document.getElementById('chatbot-input'); if (inp) inp.value='';
  appendMsg('user', msg);

  const isImageReq = /generate image|create image|make an image|draw|image banao|photo banao|picture banao|tasveer banao|chitra banao/i.test(msg);
  const typing = showTyping(isImageReq ? '🎨 Generating image…' : null);

  const smart = await getSmartReply(msg);
  typing.remove();

  if (smart && smart.kind === 'image') {
    appendImageMsg(smart.base64, smart.prompt, smart.model);
    saveChatLog(msg, '[image generated: ' + (smart.prompt||'') + ']', 'huggingface');
  } else if (smart && smart.kind === 'text') {
    appendMsg('bot', smart.html);
    saveChatLog(msg, smart.html, 'llm');
  } else {
    const r = getBotReply(msg);
    appendMsg('bot', r);
    saveChatLog(msg, r, 'keyword');
  }
}

function initChatbot() {
  const fab   = document.getElementById('chatbot-fab');
  const panel = document.getElementById('chatbot-panel');
  const close = document.getElementById('chatbot-close');
  const send  = document.getElementById('chatbot-send');
  const input = document.getElementById('chatbot-input');
  const dot   = document.getElementById('chatbot-dot');
  if (!fab||!panel) return;
  fab.addEventListener('click', () => {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) {
      if (dot) dot.style.display='none';
      setTimeout(()=>input&&input.focus(),250);
      if (typeof logActivity==='function') logActivity('chat','Opened chatbot','');
    }
  });
  close.addEventListener('click', ()=>panel.classList.remove('open'));
  send.addEventListener('click',  ()=>sendChat(input.value));
  input.addEventListener('keydown', e=>{ if(e.key==='Enter') sendChat(input.value); });
  document.querySelectorAll('.suggestion-chip').forEach(c=>c.addEventListener('click',()=>sendChat(c.dataset.msg || c.textContent)));
  setTimeout(()=>{ if(dot&&!panel.classList.contains('open')) dot.style.display='block'; },5000);
}

document.addEventListener('DOMContentLoaded', initChatbot); 