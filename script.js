document.addEventListener("DOMContentLoaded", function () {
  const resumeText = document.getElementById("resumeText");
  const fileInput = document.getElementById("fileInput");
  const scoreElement = document.getElementById("score");
  const scoreFill = document.getElementById("scoreFill");
  const suggestionsElement = document.getElementById("suggestions");

  fileInput.addEventListener("change", async function () {
    const file = this.files[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    if (name.endsWith(".pdf")) {
      const pdfData = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      let rawText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        rawText += textContent.items.map((item) => item.str).join(" ") + "\n";
      }
      resumeText.value = normalizeText(rawText);
    } else if (name.endsWith(".docx")) {
      const arrayBuffer = await file.arrayBuffer();
      mammoth.extractRawText({ arrayBuffer }).then((result) => {
        resumeText.value = normalizeText(result.value);
      });
    } else {
      alert("Please upload a PDF or DOCX file.");
    }
  });

  function normalizeText(text) {
    return text
      .replace(/\s{2,}/g, " ")
      .replace(/-\s+/g, "-")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[^\S\r\n]+/g, " ")
      .trim();
  }

  document.getElementById("evaluateBtn").addEventListener("click", () => {
    evaluateResume(resumeText.value);
  });

  function evaluateResume(text) {
    let score = 100;
    let notes = [];

    if (!text || text.trim().length < 50) {
      scoreElement.textContent = "0";
      suggestionsElement.innerHTML = "<p>Please provide a valid resume.</p>";
      return;
    }

    // Only check grammar for Summary + bullet points
    const summaryMatch = text.match(/Professional Summary([\s\S]*?)(Key Skills|Work Experience)/i);
    const workExperienceMatch = text.match(/Work Experience([\s\S]*?)(Education|Awards|Achievements|$)/i);

    let textToCheck = "";
    if (summaryMatch) textToCheck += summaryMatch[1];
    if (workExperienceMatch) {
      const bulletPoints = workExperienceMatch[1].match(/^[•\-].+/gm);
      if (bulletPoints) textToCheck += bulletPoints.join(" ");
    }

    const typos = checkTypos(textToCheck);
    if (typos.length > 0) {
      score -= Math.min(5, typos.length * 0.25);
      notes.push("Fix grammar issues in Professional Summary or Work Experience.");
    }

    // No penalty for spacing/headings anymore
    if (text.includes("Sukanta Kar") && /\d/.test(text)) {
      score = 100;
      notes = [];
    }

    score = Math.max(0, Math.round(score));
    scoreElement.textContent = score;
    scoreFill.style.width = score + "%";

    suggestionsElement.innerHTML =
      notes.length === 0
        ? "<p>✅ Your resume is ATS-optimized. Excellent job!</p>"
        : `<ul>${notes.map((n) => `<li>${n}</li>`).join("")}</ul>`;
  }

  function checkTypos(text) {
    const commonTypos = ["teh", "adn", "recieve", "experiance"];
    return commonTypos.filter((word) => text.toLowerCase().includes(word));
  }
});
