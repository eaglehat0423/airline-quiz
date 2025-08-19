/***** 状態管理 *****/
let sections = [];
let questions = [];
let currentIndex = 0;
let score = 0;
let selectedCount = 0;
let currentMode = null; // "weather" | "aviation"
let currentSectionName = "";
let wrongAnswers = [];

/***** ユーティリティ *****/
// 配列シャッフル（Fisher–Yates）
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 記述式の正規化（全角半角/NFKC、小文字化、前後空白、連続空白整理）
function normalizeText(s) {
  if (s == null) return "";
  return s
    .toString()
    .trim()
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isCorrect(user, answer) {
  const u = normalizeText(user);
  if (Array.isArray(answer)) {
    return answer.some((a) => normalizeText(a) === u);
  }
  return normalizeText(answer) === u;
}

/***** 画面切替 *****/
function showModeSelect() {
  const wrap = document.getElementById("section-wrapper");
  const container = document.getElementById("section-container");
  const quiz = document.getElementById("quiz-container");

  wrap.style.display = "flex";
  quiz.style.display = "none";

  container.innerHTML = `
    <h2 style="margin-bottom:12px;">クイズモードを選択してください</h2>
    <button onclick="selectMode('weather')">🌦 気象予報士クイズ</button>
    <button onclick="selectMode('aviation')">✈️ 航空クイズ</button>
  `;
}

function selectMode(mode) {
  currentMode = mode;
  loadSections();
}

/***** セクション一覧の読み込み *****/
async function loadSections() {
  const wrap = document.getElementById("section-wrapper");
  const container = document.getElementById("section-container");
  const quiz = document.getElementById("quiz-container");

  wrap.style.display = "flex";
  quiz.style.display = "none";

  const sectionsFile = `data/${currentMode}/sections.json`;

  try {
    const res = await fetch(sectionsFile, { cache: "no-cache" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    sections = await res.json();
  } catch (e) {
    console.error("sections.json 読み込み失敗:", e);
    container.innerHTML = `
      <h2>セクション読み込みエラー</h2>
      <p>パス: <code>${sectionsFile}</code></p>
      <p>エラー: ${String(e)}</p>
      <button onclick="showModeSelect()">モード選択に戻る</button>
    `;
    return;
  }

  container.innerHTML = `<h2 style="margin-bottom:12px;">${
    currentMode === "weather" ? "気象予報士クイズ" : "航空クイズ"
  }：セクションを選択</h2>`;
  sections.forEach((sec) => {
    const btn = document.createElement("button");
    btn.textContent = sec.name;
    btn.onclick = () => selectQuestionCount(sec.file, sec.id);
    container.appendChild(btn);
  });

  // モードに戻る
  const backBtn = document.createElement("button");
  backBtn.textContent = "モード選択に戻る";
  backBtn.onclick = showModeSelect;
  container.appendChild(backBtn);
}

/***** 出題数の選択 *****/
async function selectQuestionCount(filePath, sectionId) {
  const container = document.getElementById("section-container");
  container.innerHTML = `<h2 style="margin-bottom:12px;">出題数を選択してください</h2>`;

  let all;
  try {
    const res = await fetch(filePath, { cache: "no-cache" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    all = await res.json();
  } catch (e) {
    container.innerHTML = `
      <h2>問題ファイルの読み込みに失敗</h2>
      <p>${String(e)}</p>
      <button onclick="loadSections()">セクション選択に戻る</button>
    `;
    return;
  }

  const total = all.length;
  const options = [];
  if (total >= 5) options.push(5);
  if (total >= 10) options.push(10);
  if (total >= 20) options.push(20);
  options.push(total); // 全問

  options.forEach((n) => {
    const label = n === total ? `全問 (${n})` : `${n}問`;
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.onclick = () => startSection(filePath, sectionId, n);
    container.appendChild(btn);
  });

  const backBtn = document.createElement("button");
  backBtn.textContent = "セクション選択に戻る";
  backBtn.onclick = loadSections;
  container.appendChild(backBtn);
}

/***** セクション開始 *****/
async function startSection(filePath, sectionId, count) {
  const wrap = document.getElementById("section-wrapper");
  const quiz = document.getElementById("quiz-container");
  const content = document.getElementById("quiz-content");

  wrap.style.display = "none";
  quiz.style.display = "block";
  content.innerHTML = "読み込み中…";

  try {
    const res = await fetch(filePath, { cache: "no-cache" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const all = await res.json();

    // セクション名
    const sec = sections.find((s) => s.id === sectionId);
    currentSectionName = sec ? sec.name : "";

    // 問題をシャッフル & 切り出し
    questions = shuffle(all);
    selectedCount = count;
    if (count && count < questions.length) {
      questions = questions.slice(0, count);
    }

    // 初期化
    currentIndex = 0;
    score = 0;
    wrongAnswers = [];

    updateHeader();
    showQuestion();
  } catch (e) {
    console.error("問題読み込み失敗:", e);
    content.innerHTML = `
      <p>問題の読み込みに失敗しました：${String(e)}</p>
      <button onclick="loadSections()">セクション選択に戻る</button>
    `;
  }
}

/***** ヘッダー更新 *****/
function updateHeader() {
  const title = document.getElementById("header-title");
  const pText = document.getElementById("progress-text");
  const pFill = document.getElementById("progress-fill");

  const total = questions.length || selectedCount || 0;
  const now = Math.min(currentIndex + 1, total);

  title.textContent = currentSectionName || "クイズ";
  pText.textContent = `問題 ${total ? now : 0} / ${total}`;
  const pct = total ? (now / total) * 100 : 0;
  pFill.style.width = `${pct}%`;
}

/***** 問題表示 *****/
function showQuestion() {
  const content = document.getElementById("quiz-content");

  if (currentIndex >= questions.length) {
    showResult();
    return;
  }

  const q = questions[currentIndex];
  content.innerHTML = `
    <div class="question-box">
      <h3 style="margin-bottom:10px;">${q.question || ""}</h3>
      ${q.image ? `<img src="${q.image}" alt="問題画像">` : ""}
      ${
        q.type === "multiple_choice" && Array.isArray(q.choices)
          ? q.choices
              .map(
                (c, i) =>
                  `<button class="choice-btn" data-choice="${encodeURIComponent(
                    c
                  )}">${i + 1}. ${c}</button>`
              )
              .join("")
          : `<input type="text" id="text-answer" placeholder="解答を入力">
           <button id="answer-btn">回答</button>`
      }
    </div>
  `;

  // ボタンにイベント付与
  if (q.type === "multiple_choice" && Array.isArray(q.choices)) {
    document.querySelectorAll(".choice-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const choice = decodeURIComponent(btn.getAttribute("data-choice"));
        checkAnswer(choice);
      });
    });
  } else {
    const input = document.getElementById("text-answer");
    const answerBtn = document.getElementById("answer-btn");
    answerBtn.addEventListener("click", () => checkAnswer(input.value));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") checkAnswer(input.value);
    });
    input.focus();
  }

  updateHeader();
}

/***** 採点 *****/
function checkAnswer(userAnswer) {
  const content = document.getElementById("quiz-content");
  const q = questions[currentIndex];

  const correct = isCorrect(userAnswer, q.answer);

  const resultDiv = document.createElement("div");
  resultDiv.className = "result";
  if (correct) {
    resultDiv.textContent = `✅ 正解！ ${q.explanation ? q.explanation : ""}`;
    resultDiv.style.color = "green";
    score++;
  } else {
    resultDiv.innerHTML = `❌ 不正解。正解は「${
      Array.isArray(q.answer) ? q.answer[0] : q.answer
    }」。 ${q.explanation ? q.explanation : ""}`;
    resultDiv.style.color = "red";

    // 誤答記録
    wrongAnswers.push({
      question: q.question || "",
      userAnswer: userAnswer || "",
      correctAnswer: Array.isArray(q.answer)
        ? q.answer.join(" / ")
        : q.answer || "",
      explanation: q.explanation || "",
    });
  }

  const box = content.querySelector(".question-box");
  box.appendChild(resultDiv);

  // 次へボタン
  const nextBtn = document.createElement("button");
  nextBtn.textContent = "次へ";
  nextBtn.onclick = () => {
    currentIndex++;
    showQuestion();
  };
  box.appendChild(nextBtn);

  // 他のボタンを無効化
  box.querySelectorAll("button").forEach((b) => {
    if (b !== nextBtn) {
      b.disabled = true;
      b.style.opacity = 0.6;
    }
  });
  const input = box.querySelector("input");
  if (input) input.disabled = true;

  updateHeader();
}

/***** 結果 *****/
function showResult() {
  const quiz = document.getElementById("quiz-container");
  const content = document.getElementById("quiz-content");

  content.innerHTML = `
    <h2 style="margin-bottom:8px;">このセクションは終了！</h2>
    <p style="margin-bottom:12px;">正解数: ${score} / ${questions.length}</p>
    <button onclick="loadSections()">セクション選択に戻る</button>
    <button onclick="showModeSelect()">モード選択に戻る</button>
    <div id="wrong-list" style="margin-top:16px;"><h3>間違えた問題一覧</h3></div>
  `;

  // 誤答カード
  const list = document.getElementById("wrong-list");
  if (!wrongAnswers.length) {
    const p = document.createElement("p");
    p.textContent = "全問正解です！おめでとうございます🎉";
    list.appendChild(p);
  } else {
    wrongAnswers.forEach((item) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <p><strong>問題:</strong> ${item.question}</p>
        <p><strong>あなたの回答:</strong> ${item.userAnswer}</p>
        <p><strong>正解:</strong> ${item.correctAnswer}</p>
        ${
          item.explanation
            ? `<p><strong>解説:</strong> ${item.explanation}</p>`
            : ""
        }
      `;
      list.appendChild(card);
    });
  }

  updateHeader();
}

/***** 初期表示 *****/
window.addEventListener("DOMContentLoaded", showModeSelect);
