(() => {
  // DOM Elements
  const fileInput = document.getElementById('fileInput');
  const pasteBtn = document.getElementById('pasteBtn');
  const resumeText = document.getElementById('resumeText');
  const scoreBtn = document.getElementById('scoreBtn');
  const clearBtn = document.getElementById('clearBtn');
  const resultBox = document.getElementById('result');
  const scoreNumber = document.getElementById('scoreNumber');
  const scoreFill = document.getElementById('scoreFill');
  const suggestionsEl = document.getElementById('suggestions');
  const waBtn = document.getElementById('waBtn');
  const modeToggle = document.getElementById('modeToggle');

  // Debug Mode Toggle
  let debugMode = false;
  const debugToggle = document.createElement('button');
  debugToggle.textContent = "Toggle Debug Mode";
  debugToggle.className = "ghost";
  debugToggle.addEventListener('click', () => {
    debugMode = !debugMode;
    alert("Debug Mode " + (debugMode ? "ON" : "OFF"));
  });
  document.querySelector(".actions").appendChild(debugToggle);

  // WhatsApp link
  const waNumber = '+916005795693';
  const waMessage = encodeURIComponent("Hello, I would like a free review of my attached resume.");
  waBtn.href = `https://wa.me/${waNumber.replace(/\D/g,'')}?text=${waMessage}`;

  // Theme toggle persistence
  const current = localStorage.getItem('ats_mode') || 'day';
  document.body.classList.add(current);
  modeToggle.checked = current === 'night';
  modeToggle.addEventListener('change', () => {
    const mode = modeToggle.checked ? 'night' : 'day';
    document.body.classList.remove('day','night');
    document.body.classList.add(mode);
    localStorage.setItem('ats_mode', mode);
  });

  pasteBtn.addEventListener('click', ()=>{
    resumeText.value = `JOHN SMITH\nProfessional Summary:\nExperienced marketing manager with a proven track record of increasing campaign ROI.\n\nWork Experience:\n- Marketing Manager, ABC Ltd. (2019 - Present)\n  * Led team of 5 and grew sales by 45%`;
  });

  fileInput.addEventListener('change', async (e)=>{
    const f = e.target.files && e.target.files[0];
    if(!f) return;
    const name = f.name.toLowerCase();

    // --- DOCX Parsing ---
    if(name.endsWith('.docx')){
      const arrayBuffer = await f.arrayBuffer();
      const result = await window.mammoth.extractRawText({ arrayBuffer });
      resumeText.value = normalizeText(result.value);
      return;
    }

    // --- PDF Parsing ---
    if(name.endsWith('.pdf')){
      const pdfData = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      let rawText = '';
      for(let i=1; i <= pdf.numPages; i++){
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        rawText += textContent.items.map(item => item.str).join(' ') + '\n';
      }
      resumeText.value = normalizeText(rawText);
      return;
    }

    // --- Plain Text ---
    const txt = await f.text().catch(()=>'');
    resumeText.value = normalizeText(txt || resumeText.value);
  });

  clearBtn.addEventListener('click', ()=>{resumeText.value='';resultBox.classList.add('hidden');});

  scoreBtn.addEventListener('click', ()=>{
    const txt = resumeText.value.trim();
    if(!txt){alert('Please paste or upload your resume text first.');return}
    const scoreReport = evaluateResume(txt);
    showResult(scoreReport);
  });

  // --- TEXT NORMALIZATION ---
  function normalizeText(raw){
    return raw
      .replace(/\s{2,}/g, ' ')        // collapse multiple spaces
      .replace(/-\s+/g, '-')          // fix hyphen spacing
      .replace(/\n{3,}/g, '\n\n')     // normalize paragraph spacing
      .replace(/[^\S\r\n]+/g, ' ')    // remove weird invisible spaces
      .trim();
  }

  // --- RESUME SCORING FUNCTION ---
  function evaluateResume(text){
    let score = 100;
    const notes = [];
    const debug = [];

    const lower = text.toLowerCase();
    const lines = text.split('\n').map(l=>l.trim()).filter(Boolean);

    // 1) Forbidden formatting
    if(/<img\s|data:image\//i.test(text)){score -= 10; notes.push('Remove images.'); debug.push("Image check failed");}
    if(/\t/.test(text)){score -= 5; notes.push('Tabs detected — convert to single-column.'); debug.push("Tab characters found");}

    // 2) Times New Roman mention
    if(!/times new roman/i.test(text)){ score -= 2; notes.push('Use Times New Roman font.'); debug.push("Font mention missing"); }

    // 3) Paragraph spacing (forgiving)
    const sections = text.split(/\n{2,}/).filter(s=>s.trim().length>30);
    if(sections.length < 2){ score -= 2; notes.push('Add blank lines between sections.'); debug.push("Paragraph spacing low"); }

    // 4) Headings (upper or colon)
    const headings = lines.filter(l => l.length>3 && (l === l.toUpperCase() || /:$/.test(l)));
    if(headings.length < 2){ score -= 2; notes.push('Use bold/clear section headings.'); debug.push("Low heading count"); }

    // 5) UK English check
    const usToUk = { 'color':'colour','organize':'organise','organizing':'organising','analyze':'analyse','analyzing':'analysing','center':'centre','defense':'defence','license':'licence'};
    const usFound = Object.keys(usToUk).filter(w=>new RegExp(`\\b${w}\\b`,'i').test(text));
    if(usFound.length>0){ score -= 3; notes.push('US spellings: '+usFound.join(', ')); debug.push("US spellings detected"); }

    // 6) Spellcheck with Typo.js
    if(window.ukDict){
      const words = text.split(/\s+/);
      let missCount = 0;
      for(const w of words){
        const clean = w.replace(/[^a-zA-Z']/g,'');
        if(clean && !window.ukDict.check(clean)) missCount++;
      }
      if(missCount>0){
        const penalty = Math.min(5, Math.ceil(missCount/10));
        score -= penalty;
        notes.push(`${missCount} possible spelling issues detected.`);
        debug.push(`${missCount} words failed spellcheck`);
      }
    }

    // 7) Metrics check: require numbers or % to prove results
    const hasMetrics = /\d+[%₹$]*/.test(text);
    if(!hasMetrics){ score -= 10; notes.push('Add metrics (% growth, revenue, numbers) to quantify achievements.'); debug.push("No metrics found"); }

    // Floor score
    if(score < 0) score = 0;
    score = Math.round(score);

    // Suggestions
    const suggestions = [...notes];
    if(text.split(/[\.\!\?]/).length < 3) suggestions.push('Add a professional summary and bullet points.');

    return { score, suggestions, debug };
  }

  // --- SHOW RESULT ---
  function showResult({score, suggestions, debug}){
    resultBox.classList.remove('hidden');
    scoreNumber.textContent = score;
    scoreFill.style.width = score + '%';

    if(score >= 85) scoreFill.style.background = 'linear-gradient(90deg,#28a745,#2ea44f)';
    else if(score >= 60) scoreFill.style.background = 'linear-gradient(90deg,#ffc107,#ff8c00)';
    else scoreFill.style.background = 'linear-gradient(90deg,#ff6b6b,#d73a49)';

    let html = '<h4>Improvement suggestions</h4><ul>' + suggestions.map(s=>`<li>${escapeHtml(s)}</li>`).join('') + '</ul>';

    if(debugMode){
      html += `<div class="debug"><h4>Debug Details</h4><pre>${debug.join("\n") || "All checks passed ✅"}</pre></div>`;
    }

    suggestionsEl.innerHTML = html;
  }

  function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // --- Load Typo.js dictionary for UK English ---
  fetch("https://cdn.jsdelivr.net/npm/typo-js/dictionaries/en_GB/en_GB.aff")
    .then(res => res.text())
    .then(affData => fetch("https://cdn.jsdelivr.net/npm/typo-js/dictionaries/en_GB/en_GB.dic")
      .then(res => res.text())
      .then(dicData => {
        window.ukDict = new Typo("en_GB", affData, dicData);
      })
    );
})();
