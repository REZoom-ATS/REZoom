document.addEventListener("DOMContentLoaded", function () {
  const resumeText = document.getElementById("resumeText");
  const fileInput = document.getElementById("fileInput");
  const scoreElement = document.getElementById("score");
  const scoreFill = document.getElementById("scoreFill");
  const suggestionsElement = document.getElementById("suggestions");
  const debugElement = document.getElementById("debug");
  const toggleTheme = document.getElementById("toggleTheme");

  let debugMode = false;

  toggleTheme.addEventListener("change", () => {
    document.body.classList.toggle("night", toggleTheme.checked);
    document.body.classList.toggle("day", !toggleTheme.checked);
  });

  // File Upload Handling (PDF + DOCX)
  fileInput.addEventListener("change", async function () {
    const f = this.files[0];
    if (!f) return;

    const name = f.name.toLowerCase();

    if (name.endsWith(".pdf")) {
      const pdfData = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      let rawText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        rawText += textContent.items.map((item) => item.str).join(" ") + "\n";
      }

      // Clean & normalize PDF text
      let cleaned = rawText
        .replace(/\s{2,}/g, " ")
        .replace(/-\s+/g, "-")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/[^\S\r\n]+/g, " ")
        .trim();

      resumeText.value = cleaned;
    } else if (name.endsWith(".docx")) {
      const arrayBuffer = await f.arrayBuffer();
      mammoth.extractRawText({ arrayBuffer }).then((result) => {
        resumeText.value = result.value.trim();
      });
    } else {
      alert("Please upload a PDF or DOCX file.");
    }
  });

  // Evaluate Resume
  document.getElementById("evaluateBtn").addEventListener("click", () => {
    evaluateResume(resumeText.value);
  });

  function evaluateResume(text) {
    let score = 100;
    let notes = [];
    let debugLog = [];

    if (!text || text.trim().length < 50) {
      scoreElement.textContent = "0";
      suggestionsElement.innerHTML = "<p>Please provide a valid resume.</p>";
      return;
    }

    // 1. Grammar & spelling (simplified)
    const typos = checkTypos(text);
    if (typos.length > 0) {
      score -= Math.min(10, typos.length * 0.5);
      notes.push("Fix grammar & spelling issues.");
      debugLog.push(`Typos detected: ${typos.slice(0, 10).join(", ")}`);
    }

    // 2. Disallowed structures
    if (/table|td|tr/i.test(text)) {
      score -= 10;
      notes.push("Avoid using tables.");
      debugLog.push("Table structure detected ❌");
    }

    // 3. Check UK English spelling (lenient)
    if (/color|organize|analyze/i.test(text)) {
      score -= 3;
      notes.push("Use UK English spelling.");
      debugLog.push("US spelling detected ❌");
    }

    // 4. Font & formatting (can't check actual font, so skip penalty)
    debugLog.push("Font assumed Times New Roman ✅");

    // 5. Allowed symbols (ignore normal dashes)
    const specialChars = text.replace(/[A-Za-z0-9\s\.,\|\$\-\(\)\'\_\@\–\~]/g, "");
    if (specialChars.length > 5) {
      score -= 2;
      notes.push("Remove unusual symbols.");
      debugLog.push(`Special chars found: ${specialChars}`);
    }

    // 6. Paragraph spacing check (lenient)
    const sections = text.split(/\n{2,}/).filter((s) => s.trim().length > 30);
    if (sections.length < 2) {
      score -= 2;
      notes.push("Add clear paragraph spacing.");
      debugLog.push("Paragraph spacing insufficient ❌");
    } else {
      debugLog.push("Paragraph spacing good ✅");
    }

    // 7. Metrics in work experience (require at least 1 number)
    if (!/\d/.test(text)) {
      score -= 5;
      notes.push("Add measurable achievements with numbers.");
      debugLog.push("No numbers found ❌");
    } else {
      debugLog.push("Numbers found ✅");
    }

    // Ensure score never drops below 0
    score = Math.max(0, Math.round(score));

    scoreElement.textContent = score;
    scoreFill.style.width = score + "%";

    if (notes.length === 0) {
      suggestionsElement.innerHTML =
        "<p>✅ Your resume is ATS-optimized. Great job!</p>";
    } else {
      suggestionsElement.innerHTML = `<ul>${notes
        .map((n) => `<li>${n}</li>`)
        .join("")}</ul>`;
    }

    // Debug output (only shown if enabled)
    debugElement.innerHTML = debugMode
      ? `<h4>Debug Log</h4><pre>${debugLog.join("\n")}</pre>`
      : "";
  }

  // Spellcheck function (UK English)
  function checkTypos(text) {
    // Basic placeholder, can be expanded with dictionary
    const commonTypos = ["teh", "adn", "recieve"];
    return commonTypos.filter((word) => text.toLowerCase().includes(word));
  }

  // Debug toggle
  document.getElementById("debugToggle").addEventListener("change", (e) => {
    debugMode = e.target.checked;
  });
});
