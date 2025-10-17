// --- Firebase SDK Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, deleteDoc, onSnapshot, query } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- IMPORTANT: Replace with your Firebase project's configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyDkGs23-01csSCtZ_-qWVqiM1EIqZ7FNfY",
    authDomain: "quiz-webapp-ea71c.firebaseapp.com",
    projectId: "quiz-webapp-ea71c",
    storageBucket: "quiz-webapp-ea71c.appspot.com",
    messagingSenderId: "906101996239",
    appId: "1:906101996239:web:c1bbc3a9082ddd79db95ba"
};

// --- Environment Setup ---
const envFirebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : firebaseConfig;
const app = initializeApp(envFirebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// --- Global State ---
let currentQuizId = null;
let currentQuizData = null;
let currentQuestionIndex = 0;
let score = 0;
let allQuizzes = [];
let currentSubject = '';
const ADMIN_PASSWORD = "admin";

// --- DOM Elements ---
const views = document.querySelectorAll('.view');
const quizListContainer = document.getElementById('quiz-list-container');
const adminQuizListContainer = document.getElementById('admin-quiz-list');

// --- View Management ---
const showView = (viewId) => {
    views.forEach(view => view.classList.toggle('active', view.id === viewId));
};

// --- Authentication Logic ---
const googleSignInBtn = document.getElementById('google-signin-btn');
const logoutBtn = document.getElementById('logout-btn');
const loggedInView = document.getElementById('logged-in-view');
const loggedOutView = document.getElementById('logged-out-view');
const userNameEl = document.getElementById('user-name');

googleSignInBtn.addEventListener('click', () => signInWithPopup(auth, googleProvider).catch(e => console.error("Sign-In Error:", e.message)));
logoutBtn.addEventListener('click', () => signOut(auth).catch(e => console.error("Sign Out Error:", e.message)));

onAuthStateChanged(auth, user => {
    userNameEl.textContent = user ? user.displayName : '';
    loggedInView.classList.toggle('hidden', !user);
    loggedOutView.classList.toggle('hidden', !!user);
});

// --- Main App Flow ---

/** Renders the list of chapters/quizzes for a given subject. */
const renderChapterList = (subject) => {
    currentSubject = subject;
    document.getElementById('chapter-list-title').textContent = `${subject} Chapters`;
    const filteredQuizzes = allQuizzes.filter(quiz => quiz.subject === subject);
    
    quizListContainer.innerHTML = '';
    if (filteredQuizzes.length === 0) {
        quizListContainer.innerHTML = `<p class="loading-text">No chapters available for ${subject} yet.</p>`;
        return;
    }

    filteredQuizzes.forEach(quiz => {
        const button = document.createElement('button');
        button.className = 'btn quiz-list-item';
        button.textContent = quiz.title;
        button.onclick = () => startQuiz(quiz.id);
        quizListContainer.appendChild(button);
    });
};

/** Starts a selected quiz, fetching its questions. */
const startQuiz = async (quizId) => {
    currentQuizId = quizId;
    currentQuestionIndex = 0;
    score = 0;
    try {
        const quizDocRef = doc(db, "quizzes", quizId);
        const quizDoc = await getDoc(quizDocRef);
        if (!quizDoc.exists()) throw new Error("Quiz not found!");

        const questionsSnapshot = await getDocs(collection(quizDocRef, "questions"));
        currentQuizData = {
            title: quizDoc.data().title,
            questions: questionsSnapshot.docs.map(d => d.data())
        };

        if (currentQuizData.questions.length === 0) {
            alert("This chapter has no questions yet!");
            return;
        }

        document.getElementById('quiz-title').textContent = currentQuizData.title;
        showView('quiz-view');
        loadQuestion();
    } catch (e) {
        console.error("Error starting quiz:", e);
    }
};

/** Loads the current question and its options. */
const loadQuestion = () => {
    if (currentQuestionIndex >= currentQuizData.questions.length) {
        showResults();
        return;
    }
    const q = currentQuizData.questions[currentQuestionIndex];
    document.getElementById('question-counter-current').textContent = currentQuestionIndex + 1;
    document.getElementById('question-counter-total').textContent = currentQuizData.questions.length;
    document.getElementById('question-text').textContent = q.questionText;

    const optionsEl = document.getElementById('options-container');
    optionsEl.innerHTML = '';
    q.options.forEach((opt, idx) => {
        const button = document.createElement('button');
        button.className = 'btn option-btn';
        button.textContent = opt;
        button.dataset.index = idx;
        button.onclick = (e) => selectOption(e.target);
        optionsEl.appendChild(button);
    });

    const nextBtn = document.getElementById('next-question-btn');
    nextBtn.disabled = true;
    nextBtn.textContent = (currentQuestionIndex === currentQuizData.questions.length - 1) ? 'Finish' : 'Next';
};

/** Handles user selecting an answer. */
const selectOption = (selectedBtn) => {
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.remove('selected');
        btn.disabled = true;
    });
    selectedBtn.classList.add('selected');
    document.getElementById('next-question-btn').disabled = false;
};

/** Logic for the 'Next' button click. */
document.getElementById('next-question-btn').addEventListener('click', () => {
    const selectedOpt = document.querySelector('.option-btn.selected');
    if (!selectedOpt) return;

    const answerIdx = parseInt(selectedOpt.dataset.index);
    const question = currentQuizData.questions[currentQuestionIndex];

    if (answerIdx === question.correctAnswerIndex) {
        score++;
        selectedOpt.classList.add('correct');
    } else {
        selectedOpt.classList.add('incorrect');
        const correctBtn = document.querySelector(`.option-btn[data-index='${question.correctAnswerIndex}']`);
        if (correctBtn) correctBtn.classList.add('correct');
    }
    
    setTimeout(() => {
        currentQuestionIndex++;
        loadQuestion();
    }, 1200);
});

/** Displays the final results. */
const showResults = () => {
    const total = currentQuizData.questions.length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    document.getElementById('final-score').textContent = `${score}/${total}`;
    document.getElementById('score-percentage').textContent = `${percentage}%`;
    document.getElementById('score-feedback').textContent = percentage > 80 ? "Excellent work!" : percentage < 40 ? "Keep practicing!" : "Great effort!";
    showView('results-view');
};

// --- Admin Panel Logic ---
const renderAdminQuizList = (quizzes) => {
    adminQuizListContainer.innerHTML = '';
    if (quizzes.length === 0) {
        adminQuizListContainer.innerHTML = `<p class="loading-text">No quizzes created yet.</p>`;
        return;
    }
    quizzes.forEach(quiz => {
        const quizCard = document.createElement('div');
        quizCard.className = 'admin-quiz-card';
        quizCard.innerHTML = `
            <div class="admin-quiz-header">
                <div>
                    <h3 class="admin-quiz-title">${quiz.title}</h3>
                    <span class="admin-quiz-subject">${quiz.subject}</span>
                </div>
                <button data-id="${quiz.id}" class="btn delete-quiz-btn">Delete</button>
            </div>
            <div class="add-question-form">
                <h4>Add New Question</h4>
                <div class="form-inputs">
                    <input type="text" placeholder="Question Text" class="input-field question-input">
                    <input type="text" placeholder="Option 1" class="input-field option-input">
                    <input type="text" placeholder="Option 2" class="input-field option-input">
                    <input type="text" placeholder="Option 3" class="input-field option-input">
                    <input type="text" placeholder="Option 4" class="input-field option-input">
                    <select class="select-field correct-answer-select">
                        <option value="0">Option 1 is correct</option>
                        <option value="1">Option 2 is correct</option>
                        <option value="2">Option 3 is correct</option>
                        <option value="3">Option 4 is correct</option>
                    </select>
                    <button data-id="${quiz.id}" class="btn add-question-btn full-width">Add Question</button>
                </div>
            </div>`;
        adminQuizListContainer.appendChild(quizCard);
    });
};

document.getElementById('create-quiz-btn').addEventListener('click', async () => {
    const title = document.getElementById('new-quiz-title').value.trim();
    const subject = document.getElementById('new-quiz-subject').value;
    if (!title) return;
    await addDoc(collection(db, "quizzes"), { title, subject });
    document.getElementById('new-quiz-title').value = '';
});

adminQuizListContainer.addEventListener('click', async (e) => {
    const { classList, dataset } = e.target;
    if (classList.contains('delete-quiz-btn')) {
        if (confirm('Are you sure you want to delete this quiz?')) {
            await deleteDoc(doc(db, "quizzes", dataset.id));
        }
    }
    if (classList.contains('add-question-btn')) {
        const container = e.target.closest('.add-question-form');
        const questionText = container.querySelector('.question-input').value.trim();
        const options = Array.from(container.querySelectorAll('.option-input')).map(input => input.value.trim());
        const correctAnswerIndex = parseInt(container.querySelector('.correct-answer-select').value);
        if (!questionText || options.some(opt => !opt)) return alert('Please fill all fields.');
        await addDoc(collection(doc(db, "quizzes", dataset.id), "questions"), { questionText, options, correctAnswerIndex });
        container.querySelector('.question-input').value = '';
        container.querySelectorAll('.option-input').forEach(input => input.value = '');
        alert('Question added!');
    }
});

// --- Event Listeners & Initialization ---
document.querySelectorAll('.subject-card').forEach(card => {
    card.addEventListener('click', () => {
        renderChapterList(card.dataset.subject);
        showView('chapter-selection-view');
    });
});

document.getElementById('back-to-subjects-btn').addEventListener('click', () => showView('subject-selection-view'));
document.getElementById('show-admin-login-btn').addEventListener('click', () => showView('admin-login-view'));
document.getElementById('back-to-home-from-login-btn').addEventListener('click', () => showView('subject-selection-view'));
document.getElementById('admin-logout-btn').addEventListener('click', () => showView('subject-selection-view'));
document.getElementById('back-to-chapters-btn').addEventListener('click', () => showView('chapter-selection-view'));
document.getElementById('return-to-chapters-btn').addEventListener('click', () => showView('chapter-selection-view'));
document.getElementById('restart-quiz-btn').addEventListener('click', () => startQuiz(currentQuizId));

document.getElementById('admin-login-btn').addEventListener('click', () => {
    const password = document.getElementById('admin-password').value;
    if (password === ADMIN_PASSWORD) {
        showView('admin-panel-view');
        document.getElementById('admin-password').value = '';
        document.getElementById('login-error').textContent = '';
    } else {
        document.getElementById('login-error').textContent = 'Incorrect password.';
    }
});

// --- Initial Data Load & App Start ---
window.onload = () => {
    onSnapshot(query(collection(db, "quizzes")), snapshot => {
        allQuizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (document.getElementById('admin-panel-view').classList.contains('active')) {
            renderAdminQuizList(allQuizzes);
        }
        if (document.getElementById('chapter-selection-view').classList.contains('active')) {
            renderChapterList(currentSubject);
        }
    }, error => {
        console.error("Error fetching quizzes:", error);
        document.getElementById('quiz-list-container').innerHTML = `<p class="error-text">Could not load quizzes.</p>`;
    });

    showView('subject-selection-view');
    document.body.classList.remove('loading');
};

