(() => {
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

  const allowedSymbols = [',', '.', '|', '$', '-', '(', ')', "'", '_', '@', '~'];
  const waNumber = '+916005795693';
  const waMessage = encodeURIComponent("Hello, I would like a free review of my attached resume.");
  waBtn.href = `https://wa.me/${waNumber.replace(/\D/g,'')}?text=${waMessage}`;

  // Mode toggle
  const current = localStorage.getItem('ats_mode') || 'day';
  document.body.classList.remove('day','night');
  document.body.classList.add(current);
  modeToggle.checked = current === 'night';
  modeToggle.addEventListener('change', ()=>{
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
    if(name.endsWith('.pdf')){
      alert('PDF detected: please paste the text or upload a .txt/.docx file.');
      return;
    }
    const txt = await f.text().catch(()=>'');
    resumeText.value = txt || resumeText.value;
  });

  clearBtn.addEventListener('click', ()=>{resumeText.value='';resultBox.classList.add('hidden');});

  scoreBtn.addEventListener('click', ()=>{
    const txt = resumeText.value.trim();
    if(!txt){alert('Please paste or upload your resume text first.');return}
    const scoreReport = evaluateResume(txt);
    showResult(scoreReport);
  });

  function evaluateResume(text){
    let score = 100;
    const notes = [];
    const lower = text.toLowerCase();

    // Image, table, column checks
    if(/<img\s|data:image\//i.test(text) || /https?:\/\/.+\.(png|jpe?g|gif|svg)/i.test(text)){
      score -= 18; notes.push('Detected image references — images reduce ATS compatibility.');
    }
    if(/<table\b|\btable\b/i.test(text)){
      score -= 16; notes.push('Detected table markup or the word "table" — tables often confuse ATS.');
    }
    if(/\t/.test(text) || (text.split('\n').filter(l=>l.includes('  ')).length > 10)){
      score -= 12; notes.push('Possible bi-column or tabular formatting detected. Use single-column flow.');
    }

    if(!/times new roman/i.test(text)){
      score -= 6; notes.push('Times New Roman not mentioned — ensure your final document uses Times New Roman.');
    }

    const sections = text.split(/\n{2,}/).filter(s=>s.trim().length>20);
    if(sections.length < 3){ score -= 8; notes.push('Add clear paragraph spacing between sections (one blank line).'); }

    const lines = text.split('\n').map(l=>l.trim()).filter(Boolean);
    const headings = lines.filter(l => l.length>3 && (l === l.toUpperCase() || /:$/.test(l) ));
    if(headings.length < 2){ score -= 6; notes.push('Few section headlines detected as bold — use bold for section headers.'); }

    const specialChars = text.replace(/[A-Za-z0-9\s\.,\|\$\-\(\)\'\_\@\~]/g,'');
    const otherSpecialCount = specialChars.length;
    if(otherSpecialCount > 0){
      const penalty = Math.min(15, Math.floor(otherSpecialCount/2));
      score -= penalty; notes.push(`${otherSpecialCount} disallowed special characters detected — remove symbols other than allowed set.`);
    }

    const usToUk = { 'color':'colour','organize':'organise','organizing':'organising','analyze':'analyse','analyzing':'analysing','center':'centre','defense':'defence','license':'licence'};
    const usFound = Object.keys(usToUk).filter(w=>new RegExp(`\\b${w}\\b`,'i').test(text));
    if(usFound.length>0){ score -= 8; notes.push('US English spellings detected: '+usFound.slice(0,6).join(', ')+'. Use UK English.'); }

    const doubleSpaces = (text.match(/ {2,}/g) || []).length;
    if(doubleSpaces>0){ score -= Math.min(5,doubleSpaces); notes.push('Double spaces detected — use single spaces after punctuation.'); }

    const sentences = text.split(/[\\.\\?\\!]+\\s/).filter(Boolean);
    const longSentences = sentences.filter(s=>s.split(' ').length > 40).length;
    if(longSentences>0){ score -= Math.min(8, longSentences*2); notes.push('Very long sentences detected — keep sentences concise.'); }

    // Typo.js UK spellcheck
    if(window.Typo){
      const dictionary = new Typo('en_GB');
      const words = text.match(/[A-Za-z']+/g) || [];
      const misspelled = [];
      for (const word of words) {
        if (!dictionary.check(word)) misspelled.push(word);
      }
      if(misspelled.length > 0){
        const penalty = Math.min(20, Math.ceil(misspelled.length/5));
        score -= penalty;
        notes.push(`${misspelled.length} possible spelling errors (UK): e.g., ${misspelled.slice(0,5).join(', ')}.`);
      }
    }

    if(score < 0) score = 0;
    score = Math.round(score);

    const suggestions = [...notes];
    if(sentences.length < 3) suggestions.push('Add a short professional summary and 2–4 bullet points per role.');

    const premiumTips = [
      'Start every sentence in work experience with an action verb.',
      'Write your professional summary using the STAR approach (Situation, Task, Action, Result).'
    ];

    return { score, suggestions, premiumTips };
  }

  function showResult({score, suggestions, premiumTips}){
    resultBox.classList.remove('hidden');
    scoreNumber.textContent = score;
    scoreFill.style.width = score + '%';

    if(score >= 85) scoreFill.style.background = 'linear-gradient(90deg,#28a745,#2ea44f)';
    else if(score >= 60) scoreFill.style.background = 'linear-gradient(90deg,#ffc107,#ff8c00)';
    else scoreFill.style.background = 'linear-gradient(90deg,#ff6b6b,#d73a49)';

    let html = '<h4>Improvement suggestions</h4><ul>' + suggestions.map(s=>`<li>${escapeHtml(s)}</li>`).join('') + '</ul>';

    if(score >= 90){
      html += '<div class="premium"><h4>Premium tips (unlocked)</h4><ul>' + premiumTips.map(t=>`<li>${escapeHtml(t)}</li>`).join('') + '</ul></div>';
    } else {
      html += `<div class="premium locked"><strong>Premium tips locked.</strong> Reach 90+ to unlock premium suggestions.</div>`;
    }

    suggestionsEl.innerHTML = html;
  }

  function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
})();
