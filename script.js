const dropArea = document.getElementById("drop-area");
const fileInput = document.getElementById("fileInput");
const checkBtn = document.getElementById("checkBtn");
const clearBtn = document.getElementById("clearBtn");
const atsScore = document.getElementById("atsScore");
const atsFeedback = document.getElementById("atsFeedback");
const whatsappBtn = document.getElementById("whatsappBtn");
const parsedContentContainer = document.getElementById("parsedContentContainer");
const parsedContent = document.getElementById("parsedContent");
const resultSection = document.getElementById("resultSection");

// Auto space cleaner
function normalizeSpaces(text) {
  return text.replace(/\s+/g, " ").trim();
}

// Basic grammar checker (dummy client-side check)
function grammarCheck(text) {
  const grammarIssues = (text.match(/\bis\b\s+are\b|\bhas\b\s+have\b/gi) || []).length;
  return grammarIssues;
}

// ATS Scoring based on your rules
function calculateATS(text) {
  let score = 100;
  let issues = [];

  // Check if name is on top
  if (!/^[A-Z][a-z]+/.test(text.split("\n")[0])) {
    score -= 10;
    issues.push("Name not detected at top");
  }

  // Check contact info presence
  if (!text.match(/\+?\d{7,}/) || !text.match(/@/) || !text.match(/linkedin\.com|http/)) {
    score -= 15;
    issues.push("Missing phone/email/linkedin/contact block");
  }

  // Professional Summary check
  const summaryMatch = text.match(/Professional Summary([\s\S]*?)(Key Skills|Work Experience)/i);
  if (!summaryMatch) {
    score -= 20;
    issues.push("No professional summary found");
  } else {
    const summary = summaryMatch[1];
    const sentenceCount = summary.split(/[.!?]/).filter(Boolean).length;
    if (sentenceCount > 6) {
      score -= 5;
      issues.push("Professional summary too long");
    }
    const grammarErrors = grammarCheck(summary);
    if (grammarErrors > 0) {
      score -= grammarErrors;
      issues.push(`${grammarErrors} grammar issues in professional summary`);
    }
  }

  // Work Experience format check
  const workExperience = text.match(/Work Experience([\s\S]*?)(Education|Certificates|Awards|$)/i);
  if (workExperience) {
    const bullets = workExperience[1].match(/•/g) || [];
    if (bullets.length < 3) {
      score -= 10;
      issues.push("Work experience missing proper bullet points");
    }
    if (!/Manager|Merchandiser|Category|Intern|Engineer|Developer/i.test(workExperience[1])) {
      score -= 5;
      issues.push("Job roles not detected");
    }
  } else {
    score -= 15;
    issues.push("Work experience section missing");
  }

  return { score: Math.max(score, 0), issues };
}

// Drag and drop functionality
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
  dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'), false);
});

['dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'), false);
});

dropArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
  const dt = e.dataTransfer;
  const file = dt.files[0];
  if (file) {
    parseFile(file);
  }
}

dropArea.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    parseFile(file);
  }
});


// File parsing
async function parseFile(file) {
  if (file.type === "application/pdf") {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let textContent = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const text = await page.getTextContent();
      textContent += text.items.map((item) => item.str).join(" ") + "\n";
    }
    parsedContent.value = normalizeSpaces(textContent);
  } else if (file.name.endsWith(".docx")) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    parsedContent.value = normalizeSpaces(result.value);
  } else {
    const text = await file.text();
    parsedContent.value = normalizeSpaces(text);
  }
  parsedContentContainer.style.display = "block";
  resultSection.style.display = "none";
}


// Check ATS Button
checkBtn.addEventListener("click", () => {
  const text = normalizeSpaces(parsedContent.value);
  if (!text) {
    atsFeedback.innerText = "Please upload a resume to check.";
    resultSection.style.display = "block";
    return;
  }

  const { score, issues } = calculateATS(text);
  atsScore.innerText = score;
  atsFeedback.innerText = issues.length > 0 ? issues.join(" | ") : "Excellent! Your resume meets ATS standards.";
  whatsappBtn.href = "https://wa.me/916005795693?text=I%20want%20to%20avail%20ATS%20resume%20services";
  whatsappBtn.style.display = "inline-block";
  resultSection.style.display = "block";
});

// Clear Button
clearBtn.addEventListener("click", () => {
  parsedContent.value = "";
  atsScore.innerText = "-";
  atsFeedback.innerText = "";
  whatsappBtn.style.display = "none";
  parsedContentContainer.style.display = "none";
  resultSection.style.display = "none";
});
