// ==========================================================================
// Grade 4 ICT Quiz Application Logic
// ==========================================================================

(function () {
  'use strict';

  // State
  let currentStudentName = '';
  let currentQuestionIndex = 0;
  let userAnswers = {}; // { questionId: selectedOptionText }
  let startTime = null;
  let endTime = null;

  // DOM Elements - Stages
  const startStage = document.getElementById('startStage');
  const quizStage = document.getElementById('quizStage');
  const resultStage = document.getElementById('resultStage');

  // DOM Elements - Start Stage
  const studentNameInput = document.getElementById('studentNameInput');
  const startQuizBtn = document.getElementById('startQuizBtn');
  const nameError = document.getElementById('nameError');

  // DOM Elements - Quiz Stage
  const displayStudentName = document.getElementById('displayStudentName');
  const studentMotivationContainer = document.getElementById('studentMotivationContainer');
  const currentQuestionNum = document.getElementById('currentQuestionNum');
  const totalQuestionsNum = document.getElementById('totalQuestionsNum');
  const progressBar = document.getElementById('progressBar');
  const questionTag = document.getElementById('questionTag');
  const questionText = document.getElementById('questionText');
  const optionsContainer = document.getElementById('optionsContainer');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const answerSelectedHint = document.getElementById('answerSelectedHint');
  const toastContainer = document.getElementById('toastContainer');

  // DOM Elements - Results Stage
  const resultGreeting = document.getElementById('resultGreeting');
  const resultStudentName = document.getElementById('resultStudentName');
  const finalScoreNum = document.getElementById('finalScoreNum');
  const maxScoreNum = document.getElementById('maxScoreNum');
  const scorePercentagePill = document.getElementById('scorePercentagePill');
  const scoreGradeMessage = document.getElementById('scoreGradeMessage');
  const syncStatusAlert = document.getElementById('syncStatusAlert');
  const syncStatusText = document.getElementById('syncStatusText');
  const toggleReviewBtn = document.getElementById('toggleReviewBtn');
  const retakeQuizBtn = document.getElementById('retakeQuizBtn');
  const reviewContainer = document.getElementById('reviewContainer');
  const reviewList = document.getElementById('reviewList');

  // DOM Elements - Config Modal
  const configBtn = document.getElementById('configBtn');
  const configModal = document.getElementById('configModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const scriptUrlInput = document.getElementById('scriptUrlInput');
  const saveConfigBtn = document.getElementById('saveConfigBtn');
  const localSubmissionsCount = document.getElementById('localSubmissionsCount');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const clearSubmissionsBtn = document.getElementById('clearSubmissionsBtn');

  // Storage Keys & Endpoints
  const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzswdjOdaICzOqOlKOWTBvkYPeW4tFGMYlX6Hvc5ePUihn9lN9NLAytM6bpgDOaOSkllw/exec';
  const STORAGE_KEY_SCRIPT_URL = 'ict_quiz_google_script_url';
  const STORAGE_KEY_SUBMISSIONS = 'ict_quiz_submissions_history';
  const STORAGE_KEY_ACTIVE_SESSION = 'ict_quiz_active_session';

  // Female Names Detection (Sandy, Jouri, Farida & common Egyptian female names)
  const COMMON_FEMALE_NAMES = [
    'ساندي',  'جوري','جوري', 'فريده', 'فريدة',
    'مريم', 'ساره', 'سارة', 'جني', 'جنى', 'هنا', 'حلا', 'ليلي', 'ليلى',
    'كارما', 'كارمه', 'تاليا', 'تاليه', 'يارا', 'ريتاج', 'جود', 'رودينا',
    'ملك', 'لوجين', 'لجين', 'سلمي', 'سلمى', 'نادين', 'مايا', 'لارا',
    'دارين', 'فاطمه', 'فاطمة', 'عائشه', 'عائشة', 'خديجه', 'خديجة', 'نور',
    'ياسمين', 'شهد', 'حبيبه', 'حبيبة', 'روان', 'ريناد', 'سما', 'جيداء',
    'كنزي', 'كنزى', 'جومانا', 'جمانة', 'تالين', 'ريماس', 'اسيل', 'أسيل',
    'تسنيم', 'بسمله', 'بسملة', 'نادره', 'نادرة', 'روعه', 'روعة', 'رانيا',
    'منه', 'منة', 'اية', 'آية', 'الاء', 'آلاء', 'دينا', 'مي', 'ندى', 'ندي', 'faridar' ,'jory','sandy','malak','malk'
  ];

  function normalizeArabic(str) {
    if (!str) return '';
    return str
      .trim()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .toLowerCase();
  }

  function isFemaleName(fullName) {
    if (!fullName) return false;
    const parts = fullName.trim().split(/\s+/);
    const firstName = normalizeArabic(parts[0]);
    return COMMON_FEMALE_NAMES.some(name => normalizeArabic(name) === firstName);
  }

  function updateMotivationText(name) {
    if (!studentMotivationContainer) return;
    const isFemale = isFemaleName(name);
    if (isFemale) {
      studentMotivationContainer.innerHTML = `ركزي يا <strong id="displayStudentName" class="highlight-student-name">${escapeHtml(name)}</strong> انتي من اشطر الناس عند مستر كمال ركزي`;
    } else {
      studentMotivationContainer.innerHTML = `ركز يا <strong id="displayStudentName" class="highlight-student-name">${escapeHtml(name)}</strong> انت من اشطر الناس عند مستر كمال ركز`;
    }
  }

  // Persistence Helpers
  function saveActiveSession() {
    if (!currentStudentName) return;
    try {
      const session = {
        studentName: currentStudentName,
        currentQuestionIndex: currentQuestionIndex,
        userAnswers: userAnswers,
        startTime: startTime ? startTime.toISOString() : new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY_ACTIVE_SESSION, JSON.stringify(session));
    } catch (e) {
      console.warn('Could not save session to localStorage', e);
    }
  }

  function clearActiveSession() {
    try {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_SESSION);
    } catch (e) {
      console.warn('Could not clear active session', e);
    }
  }

  function restoreActiveSessionIfAny() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_SESSION);
      if (!raw) return false;
      const session = JSON.parse(raw);
      if (!session || !session.studentName) return false;

      currentStudentName = session.studentName;
      currentQuestionIndex = typeof session.currentQuestionIndex === 'number' ? session.currentQuestionIndex : 0;
      userAnswers = session.userAnswers || {};
      startTime = session.startTime ? new Date(session.startTime) : new Date();

      updateMotivationText(currentStudentName);
      startStage.classList.add('hidden');
      resultStage.classList.add('hidden');
      quizStage.classList.remove('hidden');

      renderQuestion(currentQuestionIndex);
      return true;
    } catch (e) {
      console.warn('Could not restore session', e);
      return false;
    }
  }

  // Initialize
  function init() {
    totalQuestionsNum.textContent = QUIZ_QUESTIONS.length;
    if (maxScoreNum) {
      maxScoreNum.textContent = QUIZ_QUESTIONS.length;
    }
    
    // Load configured Google Apps Script URL with Kamal's endpoint as default
    const savedUrl = localStorage.getItem(STORAGE_KEY_SCRIPT_URL) || DEFAULT_SCRIPT_URL;
    scriptUrlInput.value = savedUrl;
    updateSubmissionsCounter();

    bindEvents();

    // Auto-restore any in-progress quiz if student reloaded the page
    const restored = restoreActiveSessionIfAny();
    if (restored) {
      answerSelectedHint.textContent = 'تم استعادة إجاباتك السابقة تلقائياً ✓';
    }
  }

  // Event Listeners
  function bindEvents() {
    // Start Quiz
    startQuizBtn.addEventListener('click', handleStartQuiz);
    studentNameInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        handleStartQuiz();
      }
    });
    studentNameInput.addEventListener('input', function () {
      if (nameError.classList.contains('visible')) {
        nameError.classList.remove('visible');
      }
    });

    // Navigation
    prevBtn.addEventListener('click', handlePrevQuestion);
    nextBtn.addEventListener('click', handleNextQuestion);

    // Results Actions
    toggleReviewBtn.addEventListener('click', function () {
      reviewContainer.classList.toggle('hidden');
      if (reviewContainer.classList.contains('hidden')) {
        toggleReviewBtn.querySelector('span').textContent = 'مراجعة الإجابات والحل النموذجي';
      } else {
        toggleReviewBtn.querySelector('span').textContent = 'إخفاء مراجعة الإجابات';
      }
    });

    retakeQuizBtn.addEventListener('click', handleResetQuiz);

    // Modal Events
    configBtn.addEventListener('click', function () {
      updateSubmissionsCounter();
      configModal.classList.remove('hidden');
    });

    closeModalBtn.addEventListener('click', function () {
      configModal.classList.add('hidden');
    });

    configModal.addEventListener('click', function (e) {
      if (e.target === configModal) {
        configModal.classList.add('hidden');
      }
    });

    saveConfigBtn.addEventListener('click', function () {
      const url = scriptUrlInput.value.trim();
      localStorage.setItem(STORAGE_KEY_SCRIPT_URL, url);
      alert('تم حفظ رابط Google Apps Script بنجاح!');
      configModal.classList.add('hidden');
    });

    exportCsvBtn.addEventListener('click', exportSubmissionsCsv);
    clearSubmissionsBtn.addEventListener('click', clearLocalSubmissions);

    // Secret shortcut for teacher: Ctrl + Shift + K to open settings/export
    window.addEventListener('keydown', function (e) {
      if (e.ctrlKey && e.shiftKey && (e.key === 'K' || e.key === 'k')) {
        e.preventDefault();
        updateSubmissionsCounter();
        configModal.classList.remove('hidden');
      }
    });

    // Alert before reload if quiz is actively in progress
    window.addEventListener('beforeunload', function (e) {
      const isQuizActive = !quizStage.classList.contains('hidden');
      if (isQuizActive) {
        e.preventDefault();
        e.returnValue = 'هل أنت متأكد من إعادة تحميل الصفحة؟ تم حفظ إجاباتك السابقة تلقائياً ولكن يفضل استكمال الاختبار.';
        return e.returnValue;
      }
    });
  }

  // Handle Start
  function handleStartQuiz() {
    const rawName = studentNameInput.value.trim();
    if (!rawName || rawName.length < 2) {
      nameError.classList.add('visible');
      studentNameInput.focus();
      return;
    }

    currentStudentName = rawName;
    updateMotivationText(currentStudentName);
    currentQuestionIndex = 0;
    userAnswers = {};
    startTime = new Date();

    startStage.classList.add('hidden');
    resultStage.classList.add('hidden');
    quizStage.classList.remove('hidden');

    saveActiveSession();

    renderQuestion(currentQuestionIndex);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // Toast & Audio System for Bravo Notifications
  let activeToastTimeout = null;

  function showBravoToast(studentName) {
    if (!toastContainer) return;

    if (activeToastTimeout) {
      clearTimeout(activeToastTimeout);
      activeToastTimeout = null;
    }

    toastContainer.innerHTML = '';

    const toast = document.createElement('div');
    toast.className = 'bravo-toast';

    const safeName = escapeHtml(studentName || 'يا بطل');
    const isFemale = isFemaleName(studentName);
    const cheer = isFemale ? 'برافو يا' : 'برافو يا';
    const subText = isFemale ? 'إجابة صحيحة وممتازة! ✨' : 'إجابة صحيحة وممتاز! ✨';

    toast.innerHTML = `
      <div class="bravo-toast-icon">👏</div>
      <div class="bravo-toast-content">
        <div class="bravo-toast-title">${cheer} <span class="bravo-name">${safeName}</span> 🎉</div>
        <div class="bravo-toast-subtitle">${subText}</div>
      </div>
    `;

    toastContainer.appendChild(toast);

    activeToastTimeout = setTimeout(() => {
      toast.classList.add('toast-hide');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 350);
    }, 2000);
  }

  function playSuccessSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;
      // Tone 1 (G5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(783.99, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.16);

      // Tone 2 (C6)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1046.50, now + 0.1);
      gain2.gain.setValueAtTime(0.14, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.32);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  // Render Question
  function renderQuestion(index) {
    const qData = QUIZ_QUESTIONS[index];
    if (!qData) return;

    currentQuestionNum.textContent = index + 1;
    const isTF = qData.type === 'tf';

    if (isTF) {
      questionTag.textContent = `Question ${index + 1} of ${QUIZ_QUESTIONS.length} • True or False (صح أو خطأ)`;
      optionsContainer.classList.add('tf-grid');
    } else {
      questionTag.textContent = `Question ${index + 1} of ${QUIZ_QUESTIONS.length} • Multiple Choice (اختيار من متعدد)`;
      optionsContainer.classList.remove('tf-grid');
    }

    questionText.textContent = qData.question;

    // Progress Bar
    const progressPercent = ((index + 1) / QUIZ_QUESTIONS.length) * 100;
    progressBar.style.width = `${progressPercent}%`;

    // Render Options
    optionsContainer.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D'];
    const currentSelected = userAnswers[qData.id];

    qData.options.forEach((optText, optIdx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      if (currentSelected === optText) {
        btn.classList.add('selected');
      }

      let keyBadge = letters[optIdx] || (optIdx + 1);
      if (isTF) {
        keyBadge = optText.toLowerCase() === 'true' ? '✓' : '✗';
      }

      btn.innerHTML = `
        <span class="option-key">${keyBadge}</span>
        <span class="option-text">${escapeHtml(optText)}</span>
      `;

      btn.addEventListener('click', function () {
        selectOption(qData.id, optText);
      });

      optionsContainer.appendChild(btn);
    });

    // Update Nav Buttons
    prevBtn.disabled = index === 0;

    if (index === QUIZ_QUESTIONS.length - 1) {
      nextBtn.innerHTML = `
        <span>إنهاء وتسليم الواجب</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
    } else {
      nextBtn.innerHTML = `
        <span>التالي</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m9 18 6-6-6-6"></path>
        </svg>
      `;
    }

    // Hint text
    if (userAnswers[qData.id]) {
      answerSelectedHint.textContent = 'تم اختيار إجابة ✓';
    } else {
      answerSelectedHint.textContent = 'اختر إجابة للمتابعة';
    }
  }

  // Select Option
  function selectOption(qId, selectedOption) {
    const qData = QUIZ_QUESTIONS.find(q => q.id === qId) || QUIZ_QUESTIONS[currentQuestionIndex];
    userAnswers[qId] = selectedOption;
    saveActiveSession();
    
    // Highlight selected button without animation
    const buttons = optionsContainer.querySelectorAll('.option-btn');
    buttons.forEach((btn) => {
      const text = btn.querySelector('.option-text').textContent;
      if (text === selectedOption) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });

    answerSelectedHint.textContent = 'تم اختيار إجابة ✓';

    // Check if the answer is correct -> show toast with student's name & sound
    const isCorrect = String(selectedOption).trim().toLowerCase() === String(qData.answer).trim().toLowerCase();
    if (isCorrect) {
      showBravoToast(currentStudentName);
      playSuccessSound();
    }

    // Auto-advance if wanted, or student clicks Next for confirmation
    if (currentQuestionIndex < QUIZ_QUESTIONS.length - 1) {
      setTimeout(() => {
        // Only advance if still on the same question
        if (currentQuestionIndex < QUIZ_QUESTIONS.length - 1 && userAnswers[qId] === selectedOption) {
          handleNextQuestion();
        }
      }, 550);
    }
  }

  // Prev Question
  function handlePrevQuestion() {
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      saveActiveSession();
      renderQuestion(currentQuestionIndex);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  // Next Question
  function handleNextQuestion() {
    const currentQ = QUIZ_QUESTIONS[currentQuestionIndex];
    if (!userAnswers[currentQ.id]) {
      // Alert student to pick an option before proceeding
      answerSelectedHint.textContent = 'من فضلك اختر إجابة أولاً!';
      answerSelectedHint.style.fontWeight = '700';
      return;
    }

    if (currentQuestionIndex < QUIZ_QUESTIONS.length - 1) {
      currentQuestionIndex++;
      saveActiveSession();
      renderQuestion(currentQuestionIndex);
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      // Last question reached: submit quiz
      finishQuiz();
    }
  }

  // Finish Quiz & Calculate Score
  function finishQuiz() {
    endTime = new Date();
    const durationSeconds = Math.round((endTime - startTime) / 1000);
    const durationFormatted = `${Math.floor(durationSeconds / 60)} دقيقة و ${durationSeconds % 60} ثانية`;

    let score = 0;
    const reviewDetails = [];

    QUIZ_QUESTIONS.forEach((q) => {
      const studentAns = userAnswers[q.id] || 'لم تجب';
      const isCorrect = String(studentAns).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
      if (isCorrect) {
        score++;
      }
      reviewDetails.push({
        id: q.id,
        question: q.question,
        options: q.options,
        studentAnswer: studentAns,
        correctAnswer: q.answer,
        isCorrect: isCorrect
      });
    });

    const total = QUIZ_QUESTIONS.length;
    const percentage = Math.round((score / total) * 100);

    // Clear active session upon submitting
    clearActiveSession();

    // Switch UI to Result Stage
    quizStage.classList.add('hidden');
    resultStage.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'instant' });

    const isFemale = isFemaleName(currentStudentName);

    // Populate Results
    if (resultGreeting) {
      resultGreeting.innerHTML = isFemale
        ? `أحسنتِ يا بطلة <strong id="resultStudentName">${escapeHtml(currentStudentName)}</strong>`
        : `أحسنت يا بطل <strong id="resultStudentName">${escapeHtml(currentStudentName)}</strong>`;
    } else if (resultStudentName) {
      resultStudentName.textContent = currentStudentName;
    }

    finalScoreNum.textContent = score;
    if (maxScoreNum) {
      maxScoreNum.textContent = total;
    }
    scorePercentagePill.textContent = `${percentage}%`;

    // Feedback message
    if (percentage >= 85) {
      scoreGradeMessage.textContent = isFemale
        ? 'ممتازة جداً يا بطلة! أداء رائع ودرجة مشرفة في واجب Lesson 4 (Assistive Technology).'
        : 'ممتاز جداً يا بطل! أداء رائع ودرجة مشرفة في واجب Lesson 4 (Assistive Technology).';
    } else if (percentage >= 65) {
      scoreGradeMessage.textContent = isFemale
        ? 'جيدة جداً! راجعي الأسئلة التي أخطأتِ بها للوصول للدرجة النهائية.'
        : 'جيد جداً! راجع الأسئلة التي أخطأت بها للوصول للدرجة النهائية.';
    } else {
      scoreGradeMessage.textContent = isFemale
        ? 'أحسنتِ المحاولة! راجعي درس Assistive Technology (Lesson 4) وأعيدي المحاولة مرة أخرى.'
        : 'أحسنت المحاولة! راجع درس Assistive Technology (Lesson 4) وأعد المحاولة مرة أخرى.';
    }

    // Populate Review Breakdown
    renderReviewBreakdown(reviewDetails);

    // Submission Payload matching both { name, score } and extended telemetry
    const submissionData = {
      name: currentStudentName,
      score: score,
      studentName: currentStudentName,
      studentScore: score,
      total: total,
      percentage: `${percentage}%`,
      timestamp: new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }),
      duration: durationFormatted,
      answersSummary: reviewDetails.map(r => `Q${r.id}: ${r.isCorrect ? '✓' : '✗'} (${r.studentAnswer})`).join(' | ')
    };

    // Save locally
    saveLocalSubmission(submissionData);

    // Send to Google Sheets
    sendToGoogleSheets(submissionData);
  }

  // Render Review
  function renderReviewBreakdown(reviewDetails) {
    reviewList.innerHTML = '';
    reviewDetails.forEach((item) => {
      const div = document.createElement('div');
      div.className = `review-item ${item.isCorrect ? 'is-correct' : 'is-wrong'}`;

      div.innerHTML = `
        <div class="review-q-num">Question ${item.id} ${item.isCorrect ? '• Correct (صحيحة)' : '• Incorrect (خاطئة)'}</div>
        <div class="review-q-text">${escapeHtml(item.question)}</div>
        <div class="review-answers-box">
          <div class="review-student-ans">
            <span>Your Answer:</span> <strong>${escapeHtml(item.studentAnswer)}</strong> ${item.isCorrect ? '✓' : '✗'}
          </div>
          ${!item.isCorrect ? `
            <div class="review-correct-ans">
              <span>Correct Answer:</span> ${escapeHtml(item.correctAnswer)}
            </div>
          ` : ''}
        </div>
      `;
      reviewList.appendChild(div);
    });
  }

  // Local Storage Submissions
  function saveLocalSubmission(sub) {
    try {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEY_SUBMISSIONS) || '[]');
      list.push(sub);
      localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(list));
      updateSubmissionsCounter();
    } catch (e) {
      console.warn('Could not save to local storage', e);
    }
  }

  function updateSubmissionsCounter() {
    try {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEY_SUBMISSIONS) || '[]');
      localSubmissionsCount.textContent = `${list.length} إجابة مسجلة محلياً`;
    } catch (e) {
      localSubmissionsCount.textContent = '0 طالب';
    }
  }

  // Google Sheets Sync
  async function sendToGoogleSheets(submission) {
    const scriptUrl = localStorage.getItem(STORAGE_KEY_SCRIPT_URL) || DEFAULT_SCRIPT_URL;

    syncStatusAlert.className = 'sync-alert sync-pending';
    syncStatusText.textContent = 'جاري إرسال النتيجة للمعلم...';

    if (!scriptUrl) {
      setTimeout(() => {
        syncStatusAlert.className = 'sync-alert sync-success';
        syncStatusText.textContent = 'تم حفظ النتيجة محلياً بنجاح.';
      }, 500);
      return;
    }

    try {
      // Send as POST request with mode: 'no-cors' as specified
      await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: submission.name,
          score: submission.score,
          total: submission.total,
          percentage: submission.percentage,
          timestamp: submission.timestamp,
          duration: submission.duration,
          answersSummary: submission.answersSummary
        })
      });

      // Resolved successfully
      syncStatusAlert.className = 'sync-alert sync-success';
      syncStatusText.textContent = 'تم إرسال نتيجتك بنجاح وتسجيلها في شيت المعلم ✓';
    } catch (error) {
      console.error('Error submitting to Google Sheets:', error);
      syncStatusAlert.className = 'sync-alert sync-success';
      syncStatusText.textContent = 'تم حفظ نتيجتك محلياً بنجاح ✓';
    }
  }

  // Export CSV
  function exportSubmissionsCsv() {
    try {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEY_SUBMISSIONS) || '[]');
      if (list.length === 0) {
        alert('لا توجد سجلات محفوظة لتصديرها.');
        return;
      }

      const headers = ['اسم الطالب', 'الدرجة', 'المجموع', 'النسبة', 'التاريخ والوقت', 'الوقت المستغرق', 'ملخص الإجابات'];
      const rows = list.map(item => [
        `"${item.studentName}"`,
        item.score,
        item.total,
        `"${item.percentage}"`,
        `"${item.timestamp}"`,
        `"${item.duration}"`,
        `"${item.answersSummary.replace(/"/g, '""')}"`
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ICT_Grade4_Lesson4_Homework_Results_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert('حدث خطأ أثناء تصدير الملف.');
    }
  }

  // Clear Submissions
  function clearLocalSubmissions() {
    if (confirm('هل أنت متأكد من مسح جميع درجات الطلاب المسجلة محلياً؟')) {
      localStorage.removeItem(STORAGE_KEY_SUBMISSIONS);
      updateSubmissionsCounter();
      alert('تم مسح السجلات المحلية.');
    }
  }

  // Reset Quiz
  function handleResetQuiz() {
    clearActiveSession();
    studentNameInput.value = '';
    reviewContainer.classList.add('hidden');
    resultStage.classList.add('hidden');
    startStage.classList.remove('hidden');
    studentNameInput.focus();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // Helper Escape HTML
  function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Run
  document.addEventListener('DOMContentLoaded', init);
})();
