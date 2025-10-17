// --- Firebase SDK Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, deleteDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- IMPORTANT: Replace with your Firebase project's configuration ---
// This object is used if the app is run locally or not in a special environment.
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// --- Environment Setup ---
// Checks for a global config object provided by some hosting environments.
// If it exists, it uses it; otherwise, it falls back to the one above.
const envFirebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : firebaseConfig;

// Initialize Firebase
const app = initializeApp(envFirebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// --- Global State ---
let currentQuizId = null;
let currentQuizData = null;
let currentQuestionIndex = 0;
let score = 0;
const ADMIN_PASSWORD = "admin"; // Simple password for the admin panel

// --- DOM Elements ---
const views = document.querySelectorAll('.view');
const quizListContainer = document.getElementById('quiz-list');
const adminQuizListContainer = document.getElementById('admin-quiz-list');

// --- View Management ---
/**
 * Switches the visible view in the application.
 * @param {string} viewId The ID of the view to make active.
 */
const showView = (viewId) => {
    views.forEach(view => {
        view.classList.toggle('active', view.id === viewId);
    });
};

// --- Authentication Logic ---
const googleSignInBtn = document.getElementById('google-signin-btn');
const logoutBtn = document.getElementById('logout-btn');
const loggedInView = document.getElementById('logged-in-view');
const loggedOutView = document.getElementById('logged-out-view');
const userNameEl = document.getElementById('user-name');

googleSignInBtn.addEventListener('click', () => {
    signInWithPopup(auth, googleProvider).catch(error => {
        console.error("Google Sign-In Error:", error.message);
    });
});

logoutBtn.addEventListener('click', () => {
    signOut(auth).catch(error => {
        console.error("Sign Out Error:", error.message);
    });
});

onAuthStateChanged(auth, user => {
    if (user) {
        // User is signed in
        userNameEl.textContent = user.displayName;
        loggedInView.classList.remove('hidden');
        loggedOutView.classList.add('hidden');
    } else {
        // User is signed out
        loggedInView.classList.add('hidden');
        loggedOutView.classList.remove('hidden');
    }
});

// --- Quiz Logic ---
/** Renders the list of available quizzes on the home screen. */
const renderQuizList = (quizzes) => {
    quizListContainer.innerHTML = '';
    if (quizzes.length === 0) {
        quizListContainer.innerHTML = `<p class="loading-text">No quizzes available yet.</p>`;
        return;
    }
    quizzes.forEach(quiz => {
        const button = document.createElement('button');
        button.className = 'btn quiz-list-item';
        button.textContent = quiz.title;
        button.onclick = () => startQuiz(quiz.id);
        quizListContainer.appendChild(button);
    });
};

/** Starts a selected quiz, fetching its questions from Firestore. */
const startQuiz = async (quizId) => {
    currentQuizId = quizId;
    currentQuestionIndex = 0;
    score = 0;
    try {
        const quizDocRef = doc(db, "quizzes", quizId);
        const quizDoc = await getDoc(quizDocRef);
        if (!quizDoc.exists()) {
            console.error("Quiz not found!");
            return;
        }
        const questionsQuery = query(collection(quizDocRef, "questions"));
        const questionsSnapshot = await getDocs(questionsQuery);
        currentQuizData = {
            title: quizDoc.data().title,
            questions: questionsSnapshot.docs.map(d => d.data())
        };

        if (currentQuizData.questions.length === 0) {
            alert("This quiz has no questions yet!");
            return;
        }

        document.getElementById('quiz-title').textContent = currentQuizData.title;
        showView('quiz-view');
        loadQuestion();
    } catch (e) {
        console.error("Error starting quiz:", e);
    }
};

/** Loads the current question and its options into the view. */
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

/** Handles the user selecting an answer option. */
const selectOption = (selectedBtn) => {
    const allBtns = document.querySelectorAll('.option-btn');
    allBtns.forEach(btn => {
        btn.classList.remove('selected');
        btn.disabled = true;
    });
    selectedBtn.classList.add('selected');
    document.getElementById('next-question-btn').disabled = false;
};

document.getElementById('next-question-btn').addEventListener('click', () => {
    const selectedOpt = document.querySelector('.option-btn.selected');
    if (!selectedOpt) return;

    const answerIdx = parseInt(selectedOpt.dataset.index);
    const question = currentQuizData.questions[currentQuestionIndex];

    // Visually confirm the answer
    if (answerIdx === question.correctAnswerIndex) {
        score++;
        selectedOpt.classList.add('correct');
    } else {
        selectedOpt.classList.add('incorrect');
        const correctBtn = document.querySelector(`.option-btn[data-index='${question.correctAnswerIndex}']`);
        if(correctBtn) correctBtn.classList.add('correct');
    }
    
    // Wait a moment, then move to the next question
    setTimeout(() => {
        currentQuestionIndex++;
        loadQuestion();
    }, 1200);
});

/** Displays the final score and results to the user. */
const showResults = () => {
    const total = currentQuizData.questions.length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    document.getElementById('final-score').textContent = `${score}/${total}`;
    document.getElementById('score-percentage').textContent = `${percentage}%`;

    let feedback = "Great effort!";
    if (percentage > 80) feedback = "Excellent work!";
    else if (percentage < 40) feedback = "Keep practicing!";
    document.getElementById('score-feedback').textContent = feedback;
    showView('results-view');
};

// --- Admin Panel Logic ---
/** Renders the list of quizzes in the admin panel for management. */
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
                <h3 class="admin-quiz-title">${quiz.title}</h3>
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
    const titleInput = document.getElementById('new-quiz-title');
    const title = titleInput.value.trim();
    if (!title) return;
    try {
        await addDoc(collection(db, "quizzes"), { title });
        titleInput.value = '';
    } catch (e) {
        console.error("Error creating quiz: ", e);
    }
});

adminQuizListContainer.addEventListener('click', async (e) => {
    const target = e.target;

    // Handle Quiz Deletion
    if (target.classList.contains('delete-quiz-btn')) {
        const quizId = target.dataset.id;
        if (confirm('Are you sure you want to delete this quiz and all its questions? This cannot be undone.')) {
            try {
                // Note: Deleting subcollections is more complex. For this app, we'll just delete the parent doc.
                // In a production app, you'd use a cloud function to delete subcollection documents.
                await deleteDoc(doc(db, "quizzes", quizId));
            } catch (error) {
                console.error("Error deleting quiz: ", error);
            }
        }
    }

    // Handle Add Question
    if (target.classList.contains('add-question-btn')) {
        const quizId = target.dataset.id;
        const container = target.closest('.add-question-form');

        const questionText = container.querySelector('.question-input').value.trim();
        const options = Array.from(container.querySelectorAll('.option-input')).map(input => input.value.trim());
        const correctAnswerIndex = parseInt(container.querySelector('.correct-answer-select').value);

        if (!questionText || options.some(opt => !opt)) {
            alert('Please fill out the question and all four option fields.');
            return;
        }

        try {
            await addDoc(collection(doc(db, "quizzes", quizId), "questions"), {
                questionText,
                options,
                correctAnswerIndex
            });
            
            // Clear inputs after adding
            container.querySelector('.question-input').value = '';
            container.querySelectorAll('.option-input').forEach(input => input.value = '');
            alert('Question added successfully!');
        } catch (error) {
            console.error("Error adding question: ", error);
        }
    }
});

// --- Event Listeners & Initialization ---
document.getElementById('show-admin-login-btn').addEventListener('click', () => showView('admin-login-view'));
document.getElementById('back-to-home-from-login-btn').addEventListener('click', () => showView('home-view'));

document.getElementById('admin-login-btn').addEventListener('click', () => {
    const passwordInput = document.getElementById('admin-password');
    const loginError = document.getElementById('login-error');
    if (passwordInput.value === ADMIN_PASSWORD) {
        showView('admin-panel-view');
        passwordInput.value = '';
        loginError.textContent = '';
    } else {
        loginError.textContent = 'Incorrect password.';
    }
});

document.getElementById('admin-logout-btn').addEventListener('click', () => showView('home-view'));
document.getElementById('restart-quiz-btn').addEventListener('click', () => startQuiz(currentQuizId));
document.getElementById('back-to-home-btn').addEventListener('click', () => showView('home-view'));
document.getElementById('return-home-btn').addEventListener('click', () => showView('home-view'));

// --- Initial Data Load & App Start ---
window.onload = () => {
    // Listen for real-time updates to the quizzes collection
    const quizzesQuery = query(collection(db, "quizzes"));
    onSnapshot(quizzesQuery, (snapshot) => {
        const quizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderQuizList(quizzes);
        // If admin panel is active, refresh its list too
        if (document.getElementById('admin-panel-view').classList.contains('active')) {
            renderAdminQuizList(quizzes);
        }
    }, (error) => {
        console.error("Error fetching quizzes:", error);
        quizListContainer.innerHTML = `<p class="error-text">Could not load quizzes. Please check your connection and Firebase setup.</p>`;
    });

    // Start on the home view
    showView('home-view');
    // Trigger fade-in animation
    document.body.classList.remove('loading');
};

