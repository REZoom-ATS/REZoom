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

  const dictionary = new Typo("en_GB");
  const waNumber = '+916005795693';
  const waMessage = encodeURIComponent("Hello, I would like a free review of my attached resume.");
  waBtn.href = `https://wa.me/${waNumber.replace(/\\D/g,'')}?text=${waMessage}`;

  // Mode Toggle
  const current = localStorage.getItem('ats_mode') || 'day';
  document.body.classList.add(current);
  modeToggle.checked = current === 'night';
  modeToggle.addEventListener('change', ()=>{
    const mode = modeToggle.checked ? 'night' : 'day';
    document.body.classList.remove('day','night');
    document.body.classList.add(mode);
    localStorage.setItem('ats_mode', mode);
  });

  pasteBtn.addEventListener('click', ()=>{
    resumeText.value = `JOHN SMITH\nProfessional Summary:\nExperienced marketing manager with a proven track record.\n\nWork Experience:\nMarketing Manager, ABC Ltd. (2019 - Present)\n- Led a team of 5 and grew sales by 45%`;
  });

  // File Upload Parsing
  fileInput.addEventListener('change', async (e)=>{
    const f = e.target.files && e.target.files[0];
    if(!f) return;
    const name = f.name.toLowerCase();

    if(name.endsWith('.docx')){
      const reader = new FileReader();
      reader.onload = async function(ev){
        const { value } = await window.mammoth.extractRawText({ arrayBuffer: ev.target.result });
        resumeText.value = value || '';
      };
      reader.readAsArrayBuffer(f);
      return;
    }

    if(name.endsWith('.pdf')){
      const pdfData = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      let fullText = '';
      for(let i=1; i <= pdf.numPages; i++){
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(item => item.str).join(' ') + '\\n';
      }
      resumeText.value = fullText.trim();
      return;
    }

    // fallback for txt
    resumeText.value = await f.text();
  });

  clearBtn.addEventListener('click', ()=>{ resumeText.value=''; resultBox.classList.add('hidden'); });

  scoreBtn.addEventListener('click', ()=>{
    const txt = resumeText.value.trim();
    if(!txt){ alert('Please paste or upload your resume text first.'); return; }
    const scoreReport = evaluateResume(txt);
    showResult(scoreReport);
  });

  function evaluateResume(text){
    let score = 100;
    const notes = [];

    // --- Spellcheck ---
    const words = text.match(/[A-Za-z']+/g) || [];
    const misspelled = words.filter(w => !dictionary.check(w));
    if(misspelled.length > 0){
      const penalty = Math.min(20, Math.ceil(misspelled.length / 5));
      score -= penalty;
      notes.push(`${misspelled.length} potential spelling issues (UK): e.g. ${misspelled.slice(0,5).join(', ')}`);
    }

    // --- Layout / Formatting ---
    if(/<img|data:image|https?:.*\\.(png|jpg|jpeg)/i.test(text)){ score -= 15; notes.push('Images detected — remove images.'); }
    if(/<table|\\btable\\b/i.test(text)){ score -= 10; notes.push('Tables detected — use plain text formatting.'); }
    if(/\\t/.test(text)){ score -= 10; notes.push('Tabs detected — use single-column layout.'); }

    if(!/times new roman/i.test(text)){ score -= 5; notes.push('Ensure Times New Roman font is used.'); }

    const sections = text.split(/\\n{2,}/).filter(s=>s.trim().length>20);
    if(sections.length < 3) { score -= 5; notes.push('Add paragraph spacing between sections.'); }

    // --- Special Characters ---
    const specialChars = text.replace(/[A-Za-z0-9\\s\\.,\\|\\$\\-\\(\\)\\'\\_\\@\\~]/g,'');
    if(specialChars.length>0){ score -= Math.min(10, Math.floor(specialChars.length/2)); notes.push('Remove unusual symbols.'); }

    // --- UK English enforcement ---
    const usWords = ['color','organize','center','analyze','license','defense'];
    const foundUS = usWords.filter(w=>new RegExp('\\\\b'+w+'\\\\b','i').test(text));
    if(foundUS.length>0){ score -= 8; notes.push('Convert to UK English: ' + foundUS.join(', ')); }

    return { score: Math.max(0,Math.round(score)), suggestions: notes,
      premiumTips: [
        'Start every sentence in work experience with an action verb.',
        'Write your professional summary using STAR (Situation, Task, Action, Result).'
      ]
    };
  }

  function showResult({score, suggestions, premiumTips}){
    resultBox.classList.remove('hidden');
    scoreNumber.textContent = score;
    scoreFill.style.width = score + '%';
    scoreFill.style.background = score>=85?'linear-gradient(90deg,#28a745,#2ea44f)':score>=60?'linear-gradient(90deg,#ffc107,#ff8c00)':'linear-gradient(90deg,#ff6b6b,#d73a49)';
    let html = '<h4>Improvement Suggestions</h4><ul>' + suggestions.map(s=>`<li>${s}</li>`).join('') + '</ul>';
    html += score>=90?('<div class="premium"><h4>Premium Tips</h4><ul>'+premiumTips.map(t=>`<li>${t}</li>`).join('')+'</ul></div>'):`<div class="premium locked">Reach 90+ to unlock premium tips.</div>`;
    suggestionsEl.innerHTML = html;
  }
})();
