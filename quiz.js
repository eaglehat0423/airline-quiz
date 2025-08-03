let sections = [];
let questions = [];
let currentIndex = 0;
let score = 0;
let selectedQuestionCount = 0;

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function loadSections() {
  const res = await fetch("sections.json");
  sections = await res.json();
  showSections();
}

function showSections() {
  document.getElementById("section-container").style.display = "block";
  document.getElementById("quiz-container").style.display = "none";

  const container = document.getElementById("section-container");
  container.innerHTML = "<h2>セクションを選択してください</h2>";

  sections.forEach((sec) => {
    const btn = document.createElement("button");
    btn.textContent = sec.name;
    btn.onclick = () => selectQuestionCount(sec.file, sec.name);
    container.appendChild(btn);
  });
}

async function selectQuestionCount(filePath, sectionName) {
  const res = await fetch(filePath);
  let allQuestions = await res.json();

  document.getElementById("section-container").style.display = "block";
  document.getElementById("quiz-container").style.display = "none";

  const container = document.getElementById("section-container");
  container.innerHTML = `<h2>出題数を選択してください (${sectionName})</h2>`;

  [5, 10, allQuestions.length].forEach((num) => {
    if (num <= allQuestions.length) {
      const btn = document.createElement("button");
      btn.textContent =
        num === allQuestions.length ? `全問(${num})` : `${num}問`;
      btn.onclick = () => startSection(filePath, sectionName, num);
      container.appendChild(btn);
    }
  });
}

async function startSection(filePath, sectionName, count) {
  const res = await fetch(filePath);
  let allQuestions = await res.json();

  questions = shuffleArray(allQuestions).slice(0, count);

  currentIndex = 0;
  score = 0;
  selectedQuestionCount = count;

  document.getElementById("section-container").style.display = "none";
  document.getElementById("quiz-container").style.display = "block";

  document.getElementById(
    "quiz-container"
  ).innerHTML = `<h3>セクション: ${sectionName}</h3>`;
  showQuestion();
}

function showQuestion() {
  const container = document.getElementById("quiz-container");

  if (currentIndex >= questions.length) {
    container.innerHTML = `
      <h2>このセクションの問題は終了しました！</h2>
      <p>正解数: ${score} / ${questions.length}</p>
      <button onclick="loadSections()">セクション選択に戻る</button>
    `;
    return;
  }

  const q = questions[currentIndex];
  const qBox = document.createElement("div");
  qBox.className = "question-box";

  // 進捗バーコンテナ
  const progressContainer = document.createElement("div");
  progressContainer.className = "progress-container";

  // 進捗数値
  const progressText = document.createElement("div");
  progressText.className = "progress-text";
  progressText.textContent = `問題 ${currentIndex + 1} / ${questions.length}`;

  // 視覚的なバー
  const progressBar = document.createElement("div");
  progressBar.className = "progress-bar";
  const progressFill = document.createElement("div");
  progressFill.className = "progress-fill";
  progressFill.style.width = `${
    ((currentIndex + 1) / questions.length) * 100
  }%`;

  progressBar.appendChild(progressFill);
  progressContainer.appendChild(progressText);
  progressContainer.appendChild(progressBar);
  qBox.appendChild(progressContainer);

  // 問題文
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
  } else if (q.type === "text") {
    const input = document.createElement("input");
    input.type = "text";
    input.id = "text-answer";
    qBox.appendChild(input);

    const btn = document.createElement("button");
    btn.textContent = "回答";
    btn.onclick = () => checkAnswer(input.value.trim());
    qBox.appendChild(btn);
  }

  container.innerHTML = `<h3>セクション問題</h3>`;
  container.appendChild(qBox);
}

function checkAnswer(userAnswer) {
  const q = questions[currentIndex];
  const resultDiv = document.createElement("div");
  resultDiv.className = "result";

  if (userAnswer === q.answer) {
    resultDiv.textContent = "✅ 正解！ " + q.explanation;
    resultDiv.style.color = "green";
    score++;
  } else {
    resultDiv.textContent = `❌ 不正解。正解は「${q.answer}」。 ${q.explanation}`;
    resultDiv.style.color = "red";
  }

  const box = document.querySelector(".question-box");
  box.appendChild(resultDiv);

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "次へ";
  nextBtn.style.backgroundColor = "#3498db";
  nextBtn.onclick = () => {
    currentIndex++;
    showQuestion();
  };
  box.appendChild(nextBtn);

  const buttons = box.querySelectorAll("button");
  buttons.forEach((btn) => {
    if (btn.textContent !== "次へ") {
      btn.disabled = true;
      btn.style.opacity = 0.6;
    }
  });
}

loadSections();
