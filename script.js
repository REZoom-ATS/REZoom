(() => {
score -= 16; notes.push('Tables detected — convert to plain text.');
}
if(/\t/.test(text) || (text.split('\n').filter(l=>l.includes(' ')).length > 10)){
score -= 12; notes.push('Possible multi-column layout detected.');
}
if(!/times new roman/i.test(text)){
score -= 6; notes.push('Times New Roman not found — ensure correct font.');
}


const sections = text.split(/\n{2,}/).filter(s=>s.trim().length>20);
if(sections.length < 3){ score -= 8; notes.push('Add clear paragraph spacing between sections.'); }


const lines = text.split('\n').map(l=>l.trim()).filter(Boolean);
const headings = lines.filter(l => l.length>3 && (l === l.toUpperCase() || /:$/.test(l)));
if(headings.length < 2){ score -= 6; notes.push('Add bold section headers.'); }


const specialChars = text.replace(/[A-Za-z0-9\s\.,\|\$\-\(\)\'\_\@\~]/g,'');
const otherSpecialCount = specialChars.length;
if(otherSpecialCount > 0){
const penalty = Math.min(15, Math.floor(otherSpecialCount/2));
score -= penalty; notes.push(`${otherSpecialCount} disallowed characters detected.`);
}


const usToUk = { 'color':'colour','organize':'organise','analyze':'analyse','center':'centre','defense':'defence','license':'licence'};
const usFound = Object.keys(usToUk).filter(w=>new RegExp('\\b'+w+'\\b','i').test(text));
if(usFound.length>0){ score -= 8; notes.push('US spellings detected: '+usFound.join(', ')); }


const doubleSpaces = (text.match(/ {2,}/g) || []).length;
if(doubleSpaces>0){ score -= Math.min(5,doubleSpaces); notes.push('Remove double spaces.'); }


const sentences = text.split(/[\.!?]+\s/).filter(Boolean);
const longSentences = sentences.filter(s=>s.split(' ').length > 40).length;
if(longSentences>0){ score -= Math.min(8, longSentences*2); notes.push('Shorten very long sentences.'); }


// Typo.js UK spellcheck (if loaded)
if (window.Typo) {
const dictionary = new Typo('en_GB');
const words = text.match(/[A-Za-z']+/g) || [];
const misspelled = words.filter(w => !dictionary.check(w));
if(misspelled.length > 0){
score -= Math.min(20, Math.ceil(misspelled.length / 5));
notes.push(`${misspelled.length} spelling issues found (e.g., ${misspelled.slice(0,5).join(', ')})`);
}
}


if(score < 0) score = 0;
score = Math.round(score);


const premiumTips = [
'Start every sentence in work experience with an action verb.',
'Write your professional summary using the STAR approach.'
];


return { score, suggestions: notes, premiumTips };
}


function showResult({score, suggestions, premiumTips}){
resultBox.classList.remove('hidden');
scoreNumber.textContent = score;
scoreFill.style.width = score + '%';
scoreFill.style.background = score >= 85 ? 'linear-gradient(90deg,#28a745,#2ea44f)' : score >= 60 ? 'linear-gradient(90deg,#ffc107,#ff8c00)' : 'linear-gradient(90deg,#ff6b6b,#d73a49)';


let html = '<h4>Improvement suggestions</h4><ul>' + suggestions.map(s=>`<li>${escapeHtml(s)}</li>`).join('') + '</ul>';
html += score >= 90
? '<div class="premium"><h4>Premium tips</h4><ul>' + premiumTips.map(t=>`<li>${escapeHtml(t)}</li>`).join('') + '</ul></div>'
: `<div class="premium locked">Reach 90+ to unlock premium tips.</div>`;


suggestionsEl.innerHTML = html;
}


function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
})();
