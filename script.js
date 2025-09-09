const resumeInput = document.getElementById("resumeInput");
const fileInput = document.getElementById("fileInput");
const checkBtn = document.getElementById("checkBtn");
const clearBtn = document.getElementById("clearBtn");
const atsScore = document.getElementById("atsScore");
const atsFeedback = document.getElementById("atsFeedback");
const whatsappBtn = document.getElementById("whatsappBtn");

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

// File parsing
fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.type === "application/pdf") {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let textContent = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const text = await page.getTextContent();
      textContent += text.items.map((item) => item.str).join(" ") + "\n";
    }
    resumeInput.value = normalizeSpaces(textContent);
  } else if (file.name.endsWith(".docx")) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    resumeInput.value = normalizeSpaces(result.value);
  } else {
    const text = await file.text();
    resumeInput.value = normalizeSpaces(text);
  }
});

// Check ATS Button
checkBtn.addEventListener("click", () => {
  const text = normalizeSpaces(resumeInput.value);
  if (!text) {
    atsFeedback.innerText = "Please paste or upload a resume.";
    return;
  }

  const { score, issues } = calculateATS(text);
  atsScore.innerText = score;
  atsFeedback.innerText = issues.length > 0 ? issues.join(" | ") : "Excellent! Your resume meets ATS standards.";
  whatsappBtn.href = "https://wa.me/916005795693?text=I%20want%20to%20avail%20ATS%20resume%20services";
  whatsappBtn.style.display = "inline-block";
});

// Clear Button
clearBtn.addEventListener("click", () => {
  resumeInput.value = "";
  atsScore.innerText = "-";
  atsFeedback.innerText = "";
  whatsappBtn.style.display = "none";
});
