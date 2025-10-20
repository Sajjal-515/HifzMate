document.addEventListener('DOMContentLoaded', async () => {
  const sections = document.querySelectorAll('.tab-section');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const surahDropdown = document.getElementById('surahDropdown');
  const qariSelector = document.getElementById('qariSelector');
  const badgeContainer = document.getElementById('badgeContainer');
  const reviewReminder = document.getElementById('reviewReminder');
  const reminderText = document.getElementById('reminderText');
  const closeReminder = document.getElementById('closeReminder');
  const reviseNow = document.getElementById('reviseNow');
  const surahSelector = document.getElementById('surahSelector');

  let currentSurah = 1;
  let tajweed = false;
  let currentQari = 'ar.alafasy';
  let score = 0;
  let mistakes = JSON.parse(localStorage.getItem('mistakes') || '[]');
  let plans = JSON.parse(localStorage.getItem('plans') || '[]');
  let badges = JSON.parse(localStorage.getItem('badges') || '[]');
  let bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');

  // Add these constants at the top with other constants
const badgeSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
const badgePopup = document.createElement('div');
badgePopup.className = 'badge-popup';
badgePopup.style.cssText = `
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: linear-gradient(135deg, #4CAF50, #2196F3);
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 0 20px rgba(0,0,0,0.3);
  z-index: 1000;
  text-align: center;
  color: white;
  display: none;
  animation: popIn 0.5s ease-out;
`;
document.body.appendChild(badgePopup);

// Add this CSS animation
const style = document.createElement('style');
style.textContent = `
  @keyframes popIn {
    0% { transform: translate(-50%, -50%) scale(0); }
    80% { transform: translate(-50%, -50%) scale(1.1); }
    100% { transform: translate(-50%, -50%) scale(1); }
  }
  @keyframes fadeOut {
    to { opacity: 0; }
  }
`;
document.head.appendChild(style);

  /* ------------------ Tabs ------------------ */
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.getAttribute('data-section');
      
      // Update active tab button
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update active section
      sections.forEach(s => s.classList.remove('active'));
      document.getElementById(`section-${section}`).classList.add('active');
      
      // Refresh content when switching tabs
      if (section === 'bookmarks') {
        renderBookmarks();
      } else if (section === 'badges') {
        renderBadges();
      }
    });
  });
  document.getElementById('section-reader').classList.add('active');

  /* ------------------ Surah Names ------------------ */
  const surahNames = await fetch('https://api.alquran.cloud/v1/meta')
    .then(res => res.json())
    .then(d => d.data.surahs.references);

  /* ------------------ Populate Surah Dropdown ------------------ */
  surahNames.forEach(s => {
    const optReader = document.createElement('option');
    optReader.value = s.number;
    optReader.textContent = `${s.number}. ${s.englishName} (${s.name})`;
    surahSelector.appendChild(optReader);

    const optPlanner = document.createElement('option');
    optPlanner.value = s.number;
    optPlanner.textContent = `${s.number}. ${s.englishName} (${s.name})`;
    surahDropdown.appendChild(optPlanner);
  });

  surahSelector.addEventListener('change', e => {
    currentSurah = parseInt(e.target.value, 10);
    loadSurah(currentSurah);
  });

  // Ayah selector event listener - moved after DOM is ready
  const ayahSelector = document.getElementById('ayahSelector');
  if (ayahSelector) {
    ayahSelector.addEventListener('change', e => {
      const ayahNumber = parseInt(e.target.value, 10);
      const ayahs = document.querySelectorAll('.ayah');
      console.log('Selected ayah:', ayahNumber, 'Total ayahs:', ayahs.length);
      ayahs.forEach((ayah, index) => {
        if (index + 1 === ayahNumber) {
          ayah.scrollIntoView({ behavior: 'smooth', block: 'center' });
          ayah.style.background = 'rgba(26, 77, 46, 0.1)';
          setTimeout(() => {
            ayah.style.background = '';
          }, 2000);
        }
      });
    });
  } else {
    console.error('Ayah selector not found!');
  }

  /* ------------------ Qari Selector ------------------ */
  const qaris = await fetch('https://api.alquran.cloud/v1/edition?format=audio')
    .then(res => res.json());
  qaris.data.forEach(q => {
    const opt = document.createElement('option');
    opt.value = q.identifier;
    opt.textContent = `${q.englishName}`;
    qariSelector.appendChild(opt);
  });
  qariSelector.addEventListener('change', e => currentQari = e.target.value);

  /* ------------------ Quran Reader ------------------ */
  async function loadSurah(num) {
    const api = `https://api.alquran.cloud/v1/surah/${num}/editions/quran-uthmani,en.sahih,ur.jalandhry`;
    const res = await fetch(api);
    const data = await res.json();
    const [ar, en, ur] = data.data;
    document.getElementById('surahTitleArabic').textContent = ar.name;
    document.getElementById('surahTitleEnglish').textContent = en.englishName;
    
    // Populate ayat dropdown
    const ayahSelector = document.getElementById('ayahSelector');
    if (ayahSelector) {
      ayahSelector.innerHTML = '';
      console.log('Populating ayah dropdown with', ar.ayahs.length, 'ayahs');
      ar.ayahs.forEach((ayah, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.textContent = `Ayah ${index + 1}`;
        ayahSelector.appendChild(option);
      });
      console.log('Ayah dropdown populated with', ayahSelector.children.length, 'options');
    } else {
      console.error('Ayah selector not found in loadSurah!');
    }
    
    const container = document.getElementById('ayahs-container');
    container.innerHTML = '';
    
    let lastAyahViewed = false;
    ar.ayahs.forEach((a, i) => {
      const div = document.createElement('div');
      div.className = 'ayah';
      div.innerHTML = `
        <div class="ayah-number">${i + 1}</div>
        <p class="arabic-text">${tajweed ? applyTajweed(a.text) : a.text}</p>
        <p class="translation-text">${en.ayahs[i].text}</p>
        <p class="urdu-text">${ur.ayahs[i].text}</p>
        <button class="playBtn">Play</button>
        <button class="bookmarkBtn">🔖 Bookmark</button>
      `;
      div.querySelector('.playBtn').addEventListener('click', async () => {
        const audio = await fetch(`https://api.alquran.cloud/v1/ayah/${a.number}/${currentQari}`).then(r => r.json());
        new Audio(audio.data.audio).play();
      });
      div.querySelector('.bookmarkBtn').addEventListener('click', () => {
        bookmarks.push({ surah: ar.englishName, ayah: i+1, text: a.text });
        localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
        alert('Ayah bookmarked!');
        renderBookmarks(); // Update the bookmarks display immediately
      });
      
      // Add scroll observer for last ayah
      if (i === ar.ayahs.length - 1) {
        const observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting && !lastAyahViewed) {
            lastAyahViewed = true;
            showBadge(num, ar.englishName);
          }
        }, { threshold: 0.5 });
        observer.observe(div);
      }
      
      container.appendChild(div);
    });
    
    // Add "Go to Top" button at the end of the surah
    const goToTopDiv = document.createElement('div');
    goToTopDiv.className = 'go-to-top-container';
    goToTopDiv.innerHTML = `
      <button id="goToTopBtn" class="go-to-top-btn">
        ⬆️ Go to Top of Surah
      </button>
    `;
    container.appendChild(goToTopDiv);
    
    // Add event listener for go to top button
    document.getElementById('goToTopBtn').addEventListener('click', () => {
      const surahHeader = document.querySelector('.surah-header');
      if (surahHeader) {
        surahHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  function applyTajweed(text) {
    return text
      .replace(/ن/g, '<span class="tajweed-ghunna">ن</span>')
      .replace(/م/g, '<span class="tajweed-idgham">م</span>')
      .replace(/ق/g, '<span class="tajweed-iqlab">ق</span>')
      .replace(/ل/g, '<span class="tajweed-ikhfaa">ل</span>');
  }

  document.getElementById('showTajweedBtn').addEventListener('click', () => {
    tajweed = !tajweed;
    loadSurah(currentSurah);
  });
  document.getElementById('nextSurah').addEventListener('click', () => { 
    if (currentSurah < 114) {
      showBadge(currentSurah, surahNames[currentSurah-1].englishName); // Show badge for current surah
      currentSurah++;
      loadSurah(currentSurah);
    }
  });
  document.getElementById('prevSurah').addEventListener('click', () => { if (currentSurah > 1) loadSurah(--currentSurah); });

  loadSurah(currentSurah);
 // List of medals/emojis for badges
// List of medals/emojis for badges
const medals = [
  "🥇","🥈","🥉","🏅","🎖️","🏆","💎","🌟","🛡️","⚡","🔥","💫","🎯","🏵️","🎗️","✨",
  "🥇","🥈","🥉","🏅","🎖️","🏆","💎","🌟","🛡️","⚡","🔥","💫","🎯","🏵️","🎗️","✨",
  "🥇","🥈","🥉","🏅","🎖️","🏆","💎","🌟","🛡️","⚡","🔥","💫","🎯","🏵️","🎗️","✨",
  "🥇","🥈","🥉","🏅","🎖️","🏆","💎","🌟","🛡️","⚡","🔥","💫","🎯","🏵️","🎗️","✨"
];

// Badge container
const badgesContainer = document.getElementById('badgeContainer');

// Keep track of earned badges to avoid duplicates
let earnedBadges = JSON.parse(localStorage.getItem('earnedBadges') || '[]');

// Replace the showBadge function with this improved version
function showBadge(surahNum, surahName) {
  if (earnedBadges.includes(surahNum)) return;
  
  // Play sound effect
  badgeSound.currentTime = 0; // Reset sound
  badgeSound.play().catch(err => console.log('Audio play failed:', err));
  
  // Create badge
  const badge = document.createElement('div');
  badge.className = 'badge';
  badge.style.background = `linear-gradient(135deg, #${Math.floor(Math.random()*16777215).toString(16)}, #${Math.floor(Math.random()*16777215).toString(16)})`;
  badge.innerHTML = `<div>${medals[surahNum-1]}</div><p>${surahName}</p>`;
  badgesContainer.appendChild(badge);

  // Show popup notification
  badgePopup.innerHTML = `
    <h2>🎉 Achievement Unlocked!</h2>
    <div style="font-size: 3em; margin: 10px;">${medals[surahNum-1]}</div>
    <p>Completed Surah ${surahName}</p>
  `;
  badgePopup.style.display = 'block';
  badgePopup.style.animation = 'popIn 0.5s ease-out';

  // Hide popup after 3 seconds
  setTimeout(() => {
    badgePopup.style.animation = 'fadeOut 0.5s ease-out';
    setTimeout(() => {
      badgePopup.style.display = 'none';
    }, 500);
  }, 3000);

  // Save badge
  earnedBadges.push(surahNum);
  localStorage.setItem('earnedBadges', JSON.stringify(earnedBadges));
  
  // Save to badges array as well
  badges.push({ surahNum, surahName, medal: medals[surahNum-1] });
  localStorage.setItem('badges', JSON.stringify(badges));
}


  /* ------------------ Planner ------------------ */
   function renderPlans() {
    const c = document.getElementById('plansContainer');
    c.innerHTML = '';

    if (plans.length === 0) {
      c.innerHTML = '<p style="text-align:center; color:gray;">No plans yet. Add one to get started!</p>';
      return;
    }

    plans.forEach((p, idx) => {
      const div = document.createElement('div');
      div.className = 'plan-item';
      div.innerHTML = `
        <strong>${p.name}</strong> - ${p.surahName} (${p.pace} Ayahs/day)
        <div style="margin-top: 5px;">
          <button class="openPlanBtn" data-surah="${p.surahNum}">📖 Open</button>
          <button class="deletePlanBtn" data-index="${idx}">❌ Delete</button>
        </div>
      `;
      c.appendChild(div);
    });

    // Open plan button
    c.querySelectorAll('.openPlanBtn').forEach(btn => {
      btn.addEventListener('click', e => {
        const surahNum = parseInt(e.target.dataset.surah, 10);
        currentSurah = surahNum;
        loadSurah(currentSurah);
        document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
        document.getElementById('section-reader').classList.add('active');
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('[data-section="reader"]').classList.add('active');
      });
    });

    // Delete plan button
    c.querySelectorAll('.deletePlanBtn').forEach(btn => {
      btn.addEventListener('click', e => {
        const index = parseInt(e.target.dataset.index, 10);
        plans.splice(index, 1);
        localStorage.setItem('plans', JSON.stringify(plans));
        renderPlans();
      });
    });
  }

  document.getElementById('addPlanBtn').addEventListener('click', () => {
    const name = document.getElementById('planName').value.trim();
    const surahNum = surahDropdown.value;
    const surahName = surahNames.find(s => s.number == surahNum).englishName;
    const pace = document.getElementById('paceInput').value;
    if (!name) return alert('Enter plan name');
    plans.push({ name, surahNum, surahName, pace });
    localStorage.setItem('plans', JSON.stringify(plans));
    renderPlans();
    showReminder();
  });

  renderPlans();


  /* ------------------ Reminder ------------------ */
  function showReminder() {
    if (plans.length === 0) return;
    const p = plans[Math.floor(Math.random() * plans.length)];
    reminderText.textContent = `Review "${p.name}" - ${p.surahName} (${p.pace} ayahs/day)`;
    reviewReminder.classList.remove('hidden');
  }
  closeReminder.addEventListener('click', () => reviewReminder.classList.add('hidden'));
  reviseNow.addEventListener('click', () => {
    document.getElementById('section-reader').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    reviewReminder.classList.add('hidden');
  });
  showReminder();

  /* ------------------ Bookmarks ------------------ */
  const bookmarkList = document.getElementById('bookmarkList');
  function renderBookmarks() {
    bookmarkList.innerHTML = '';
    bookmarks.forEach((b, i) => {
      const li = document.createElement('li');
      li.textContent = `${b.surah} - Ayah ${b.ayah}`;
      const del = document.createElement('button');
      del.textContent = '❌';
      del.onclick = () => {
        bookmarks.splice(i, 1);
        localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
        renderBookmarks();
      };
      li.appendChild(del);
      bookmarkList.appendChild(li);
    });
  }
  document.getElementById('clearBookmarks').addEventListener('click', () => {
    bookmarks = [];
    localStorage.setItem('bookmarks', '[]');
    renderBookmarks();
  });
  renderBookmarks();

  /* ------------------ Quiz ------------------ */
  /* ------------------ Advanced Quran Quiz (Random Question Types) ------------------ */
const quizContainer = document.getElementById('quizContainer');
const startQuizBtn = document.getElementById('startQuizBtn');
const nextQuizBtn = document.getElementById('nextQuizBtn');
const quizQuestion = document.getElementById('quizQuestion');
const quizOptions = document.getElementById('quizOptions');
const quizResult = document.getElementById('quizResult');
const mistakeList = document.getElementById('mistakeList');
const clearMistakesBtn = document.getElementById('clearMistakes');

let quizScore = 0;
let questionCount = 0;
let currentQuestion = {};
const totalQuestions = 5;

/* 📖 Get Random Ayah */
async function getRandomAyah() {
  const randomAyah = Math.floor(Math.random() * 6236) + 1;
  const res = await fetch(`https://api.alquran.cloud/v1/ayah/${randomAyah}/en.asad`);
  const data = await res.json();
  return data.data;
}

/* 📜 Get All Surah Names Once */
let allSurahs = [];
async function loadSurahList() {
  const metaRes = await fetch('https://api.alquran.cloud/v1/meta');
  const metaData = await metaRes.json();
  allSurahs = metaData.data.surahs.references;
}

/* 🎯 Generate Random Quiz Question Type */
async function generateQuizQuestion() {
  const ayah = await getRandomAyah();
  const questionType = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3

  if (!allSurahs.length) await loadSurahList();

  switch (questionType) {
    case 1:
      generateSurahQuestion(ayah);
      break;
    case 2:
      generateMissingWordQuestion(ayah);
      break;
    case 3:
      generateTranslationQuestion(ayah);
      break;
  }
}

/* 🕌 Type 1: Which Surah is this Ayah from? */
function generateSurahQuestion(ayah) {
  const correctSurah = ayah.surah.englishName;
  const wrongSurahs = allSurahs
    .filter(s => s.englishName !== correctSurah)
    .sort(() => 0.5 - Math.random())
    .slice(0, 3)
    .map(s => s.englishName);

  const options = [...wrongSurahs, correctSurah].sort(() => Math.random() - 0.5);

  currentQuestion = {
    question: `Which Surah is this Ayah from?`,
    ayahText: ayah.text,
    correctAnswer: correctSurah,
    options,
  };

  renderQuestion();
}

/* ✍️ Type 2: Fill in the Missing Word */
function generateMissingWordQuestion(ayah) {
  const words = ayah.text.split(' ');
  const validWords = words.filter(w => w.length > 3);
  const hiddenWord = validWords[Math.floor(Math.random() * validWords.length)];
  const displayText = ayah.text.replace(hiddenWord, '⬜⬜⬜⬜⬜');

  let options = [hiddenWord];
  while (options.length < 4) {
    const randomWord = validWords[Math.floor(Math.random() * validWords.length)];
    if (!options.includes(randomWord)) options.push(randomWord);
  }
  options.sort(() => Math.random() - 0.5);

  currentQuestion = {
    question: `Fill in the missing word in this Ayah:`,
    ayahText: displayText,
    correctAnswer: hiddenWord,
    options,
  };

  renderQuestion();
}

/* 🌙 Type 3: Identify the Surah from the Translation */
function generateTranslationQuestion(ayah) {
  const correctSurah = ayah.surah.englishName;
  const wrongSurahs = allSurahs
    .filter(s => s.englishName !== correctSurah)
    .sort(() => 0.5 - Math.random())
    .slice(0, 3)
    .map(s => s.englishName);

  const options = [...wrongSurahs, correctSurah].sort(() => Math.random() - 0.5);

  currentQuestion = {
    question: `This is the translation of which Surah?`,
    ayahText: `"${ayah.text}"`,
    correctAnswer: correctSurah,
    options,
  };

  renderQuestion();
}

/* 🎨 Render Question */
function renderQuestion() {
  quizQuestion.innerHTML = `
    <p style="font-weight:600;">${currentQuestion.question}</p>
    <p style="margin-top:10px;font-size:1.1rem;">${currentQuestion.ayahText}</p>
  `;
  quizOptions.innerHTML = '';

  currentQuestion.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option';
    btn.textContent = opt;
    btn.onclick = () => checkAnswer(opt);
    quizOptions.appendChild(btn);
  });

  quizResult.textContent = '';
  nextQuizBtn.classList.add('hidden');
}

/* ✅ Check Answer */
function checkAnswer(selected) {
  const correct = selected === currentQuestion.correctAnswer;

  if (correct) {
    quizScore++;
    quizResult.textContent = '✅ Correct!';
    quizResult.style.color = 'green';
  } else {
    quizResult.textContent = `❌ Wrong! Correct Answer: ${currentQuestion.correctAnswer}`;
    quizResult.style.color = 'red';
    mistakes.push({
      question: currentQuestion.ayahText,
      your: selected,
      correct: currentQuestion.correctAnswer
    });
    localStorage.setItem('mistakes', JSON.stringify(mistakes));
    renderMistakes();
  }

  document.querySelectorAll('.quiz-option').forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === currentQuestion.correctAnswer) btn.style.backgroundColor = '#4CAF50';
    else if (btn.textContent === selected) btn.style.backgroundColor = '#f44336';
  });

  questionCount++;
  nextQuizBtn.classList.remove('hidden');
}

/* 🎮 Next Question or End Quiz */
nextQuizBtn.addEventListener('click', async () => {
  if (questionCount >= totalQuestions) {
    quizQuestion.innerHTML = `🎉 Quiz Completed!<br><br>Your Score: ${quizScore}/${totalQuestions}`;
    quizOptions.innerHTML = '';
    quizResult.textContent = '';
    nextQuizBtn.classList.add('hidden');
    startQuizBtn.classList.remove('hidden');
  } else {
    await generateQuizQuestion();
    nextQuizBtn.classList.add('hidden');
  }
});

/* ▶️ Start Quiz */
startQuizBtn.addEventListener('click', async () => {
  quizScore = 0;
  questionCount = 0;
  startQuizBtn.classList.add('hidden');
  nextQuizBtn.classList.add('hidden');
  await generateQuizQuestion();
});

/* 🧾 Mistake Section */
function renderMistakes() {
  mistakeList.innerHTML = '';
  mistakes.forEach(m => {
    const li = document.createElement('li');
    li.textContent = `${m.question} | Your: ${m.your || '-'} | Correct: ${m.correct}`;
    mistakeList.appendChild(li);
  });
}

clearMistakesBtn.addEventListener('click', () => {
  mistakes = [];
  localStorage.setItem('mistakes', '[]');
  renderMistakes();
});

renderMistakes();

  
  // Add function to display all earned badges
  function showAllBadges() {
    const badgeDialog = document.createElement('div');
    badgeDialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 0 20px rgba(0,0,0,0.3);
      z-index: 1001;
      max-height: 80vh;
      overflow-y: auto;
      min-width: 300px;
    `;
    
    // Load badges from localStorage
    const savedBadges = JSON.parse(localStorage.getItem('badges') || '[]');
    
    let badgeHtml = `
      <h2 style="text-align: center; margin-bottom: 20px;">Your Earned Badges (${savedBadges.length}/114)</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px;">
    `;
    
    savedBadges.forEach(badge => {
      badgeHtml += `
        <div style="text-align: center; padding: 10px; background: linear-gradient(135deg, #${Math.floor(Math.random()*16777215).toString(16)}, #${Math.floor(Math.random()*16777215).toString(16)}); border-radius: 8px; color: white;">
          <div style="font-size: 2em;">${badge.medal}</div>
          <div>${badge.surahName}</div>
        </div>
      `;
    });
    
    badgeHtml += '</div><button id="closeBadgesBtn" style="margin-top: 15px; padding: 5px 15px; display: block; margin: 20px auto;">Close</button>';
    
    badgeDialog.innerHTML = badgeHtml;
    document.body.appendChild(badgeDialog);
    
    document.getElementById('closeBadgesBtn').onclick = () => badgeDialog.remove();
  }

  // Add click handler for badges container
  badgeContainer.addEventListener('click', showAllBadges);
  
  // Function to render badges in the badges section
  function renderBadges() {
    const savedBadges = JSON.parse(localStorage.getItem('badges') || '[]');
    badgeContainer.innerHTML = '';
    
    if (savedBadges.length === 0) {
      badgeContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); grid-column: 1 / -1;">No badges earned yet. Start reading to earn your first badge! 🏆</p>';
      return;
    }
    
    savedBadges.forEach(badge => {
      const badgeElement = document.createElement('div');
      badgeElement.className = 'badge';
      badgeElement.style.background = `linear-gradient(135deg, #${Math.floor(Math.random()*16777215).toString(16)}, #${Math.floor(Math.random()*16777215).toString(16)})`;
      badgeElement.innerHTML = `<div>${badge.medal}</div><p>${badge.surahName}</p>`;
      badgeContainer.appendChild(badgeElement);
    });
  }
  
  // Initialize badges display
  renderBadges();
  
  // Theme Toggle Functionality
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = themeToggle.querySelector('.theme-icon');
  
  // Load saved theme
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
  
  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('theme', newTheme);
    
    // Add animation to theme toggle
    themeToggle.style.transform = 'scale(1.2) rotate(360deg)';
    setTimeout(() => {
      themeToggle.style.transform = '';
    }, 300);
  });
});
