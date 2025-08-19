let currentMode = null; // "aviation" | "weather"
let sections = [];
let questions = [];
let currentIndex = 0;
let score = 0;
let selectedQuestionCount = 0;
let currentSectionName = "";
let wrongAnswers = [];

// -------------- ユーティリティ --------------
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// -------------- モード選択 --------------
function showModeSelect() {
  const modeWrap = document.getElementById("mode-wrapper");
  const modeContainer = document.getElementById("mode-container");
  const sectionWrap = document.getElementById("section-wrapper");
  const quiz = document.getElementById("quiz-container");

  modeWrap.style.display = "block";
  sectionWrap.style.display = "none";
  quiz.style.display = "none";

  modeContainer.innerHTML = `
    <h2>モードを選択してください</h2>
    <div class="mode-buttons">
      <button id="btn-aviation">航空クイズ ✈️</button>
      <button id="btn-weather">気象予報士クイズ ☁️</button>
    </div>
  `;

  document.getElementById("btn-aviation").onclick = () => {
    currentMode = "aviation";
    loadSections();
  };
  document.getElementById("btn-weather").onclick = () => {
    currentMode = "weather";
    loadSections();
  };
}

// -------------- セクション読み込み/表示 --------------
async function loadSections() {
  const modeWrap = document.getElementById("mode-wrapper");
  const sectionWrap = document.getElementById("section-wrapper");
  const sectionContainer = document.getElementById("section-container");
  const quiz = document.getElementById("quiz-container");

  modeWrap.style.display = "none";
  sectionWrap.style.display = "block";
  quiz.style.display = "none";

  // モードごとに別の sections.json を読む
  // 例: data/aviation/sections.json or data/weather/sections.json
  const sectionsFile =
    currentMode === "weather"
      ? "data/weather/sections.json"
      : "data/aviation/sections.json";

  const res = await fetch(sectionsFile);
  sections = await res.json();

  sectionContainer.innerHTML = `<h2>${modeLabel()}：セクションを選択してください</h2>`;
  sections.forEach((sec) => {
    const btn = document.createElement("button");
    btn.textContent = sec.name;
    btn.onclick = () => selectQuestionCount(sec.file, sec.id);
    sectionContainer.appendChild(btn);
  });

  // モード切替ボタン
  const back = document.createElement("button");
  back.textContent = "← モードに戻る";
  back.className = "ghost";
  back.onclick = showModeSelect;
  sectionContainer.appendChild(document.createElement("hr"));
  sectionContainer.appendChild(back);
}

function modeLabel() {
  return currentMode === "weather" ? "気象予報士クイズ" : "航空クイズ";
}

// -------------- 出題数選択 --------------
async function selectQuestionCount(filePath, sectionId) {
  const res = await fetch(filePath);
  let allQuestions = await res.json();

  const sec = sections.find((s) => s.id === sectionId);
  currentSectionName = sec ? sec.name : "";

  wrongAnswers = []; // リセット

  const container = document.getElementById("section-container");
  container.innerHTML = `<h2>${modeLabel()}｜出題数を選択してください（${currentSectionName}）</h2>`;

  const steps = Math.max(1, Math.floor(allQuestions.length / 10));
  const questionOptions = Array.from({ length: steps }, (_, i) => (i + 1) * 10);
  if (!questionOptions.includes(allQuestions.length))
    questionOptions.push(allQuestions.length);

  questionOptions.forEach((num) => {
    if (num <= allQuestions.length) {
      const btn = document.createElement("button");
      btn.textContent =
        num === allQuestions.length ? `全問(${num})` : `${num}問`;
      btn.onclick = () => startSection(filePath, sectionId, num);
      container.appendChild(btn);
    }
  });

  // 戻る
  const back = document.createElement("button");
  back.textContent = "← セクション一覧へ";
  back.className = "ghost";
  back.onclick = loadSections;
  container.appendChild(document.createElement("hr"));
  container.appendChild(back);
}

// -------------- クイズ開始 --------------
async function startSection(filePath, sectionId, count) {
  const res = await fetch(filePath);
  let allQuestions = await res.json();

  const sec = sections.find((s) => s.id === sectionId);
  currentSectionName = sec ? sec.name : "";

  questions = shuffleArray(allQuestions).slice(0, count);
  currentIndex = 0;
  score = 0;
  selectedQuestionCount = count;
  wrongAnswers = [];

  document.getElementById("section-wrapper").style.display = "none";
  document.getElementById("quiz-container").style.display = "block";

  showQuestion();
}

// -------------- ヘッダ更新 --------------
function updateHeader() {
  const header = document.getElementById("quiz-header");
  if (!header) return;
  header.innerHTML = `
    <div class="header-left">
      <div class="header-mode">${modeLabel()}</div>
      <div class="header-title">${currentSectionName}</div>
    </div>
    <div class="header-right">
      <div class="progress-text">${currentIndex + 1} / ${
    questions.length
  } 問</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${
        ((currentIndex + 1) / questions.length) * 100
      }%;"></div></div>
    </div>
  `;
}

// -------------- 出題表示 --------------
function showQuestion() {
  const container = document.getElementById("quiz-container");

  // 終了
  if (currentIndex >= questions.length) {
    container.innerHTML = `
      <div id="quiz-header" class="sticky-header">
        <div class="header-left">
          <div class="header-mode">${modeLabel()}</div>
          <div class="header-title">${currentSectionName}</div>
        </div>
      </div>
      <div class="finish">
        <h2>終了！</h2>
        <p>スコア：<strong>${score} / ${questions.length}</strong></p>
        <div class="finish-buttons">
          <button onclick="loadSections()">セクションに戻る</button>
          <button class="ghost" onclick="showModeSelect()">モードに戻る</button>
        </div>
        <div id="wrong-list"><h3>間違えた問題</h3></div>
      </div>
    `;

    // 間違いカード
    const wrongList = document.getElementById("wrong-list");
    if (wrongAnswers.length === 0) {
      wrongList.innerHTML += "<p>全問正解！🎉</p>";
    } else {
      wrongAnswers.forEach((item) => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
          <p><strong>問題：</strong>${item.question}</p>
          <p><strong>あなたの回答：</strong>${escapeHtml(item.userAnswer)}</p>
          <p><strong>正解：</strong>${item.correctAnswer}</p>
          ${item.explanation ? `<p class="ex">${item.explanation}</p>` : ""}
        `;
        wrongList.appendChild(card);
      });
    }
    return;
  }

  // 通常表示
  const q = questions[currentIndex];
  container.innerHTML = `
    <div id="quiz-header" class="sticky-header"></div>
    <div class="question-box"></div>
  `;
  updateHeader();

  const qBox = container.querySelector(".question-box");
  const questionTitle = document.createElement("h3");
  questionTitle.textContent = q.question;
  qBox.appendChild(questionTitle);

  if (q.image) {
    const img = document.createElement("img");
    img.src = q.image;
    img.alt = "問題画像";
    qBox.appendChild(img);
  }

  if (q.type === "multiple_choice") {
    q.choices.forEach((choice) => {
      const btn = document.createElement("button");
      btn.textContent = choice;
      btn.onclick = () => checkAnswer(choice);
      qBox.appendChild(btn);
    });
  } else {
    const input = document.createElement("input");
    input.type = "text";
    input.id = "text-answer";
    qBox.appendChild(input);
    const btn = document.createElement("button");
    btn.textContent = "回答";
    btn.onclick = () => checkAnswer(input.value.trim());
    qBox.appendChild(btn);
  }
}

// -------------- 回答判定 --------------
function checkAnswer(userAnswer) {
  const q = questions[currentIndex];
  const box = document.querySelector(".question-box");
  const resultDiv = document.createElement("div");
  resultDiv.className = "result";

  const normalize = (s) => (typeof s === "string" ? s.trim() : s);
  const isCorrect = normalize(userAnswer) === normalize(q.answer);

  if (isCorrect) {
    resultDiv.textContent = "✅ 正解！ " + (q.explanation || "");
    resultDiv.style.color = "green";
    score++;
  } else {
    resultDiv.textContent =
      `❌ 不正解。正解は「${q.answer}」。 ` + (q.explanation || "");
    resultDiv.style.color = "red";
    wrongAnswers.push({
      question: q.question,
      userAnswer,
      correctAnswer: q.answer,
      explanation: q.explanation || "",
    });
  }

  box.appendChild(resultDiv);

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "次へ";
  nextBtn.className = "primary";
  nextBtn.onclick = () => {
    currentIndex++;
    showQuestion();
  };
  box.appendChild(nextBtn);

  // 回答後は他のボタンを無効化
  box.querySelectorAll("button").forEach((btn) => {
    if (btn.textContent !== "次へ") {
      btn.disabled = true;
      btn.classList.add("disabled");
    }
  });

  updateHeader();
}

// -------------- 小物 --------------
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// 初期表示
showModeSelect();
