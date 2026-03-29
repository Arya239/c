// --- ANTI-CHEAT: Hide variables from Global Scope ---
(function () {

// --- ADVANCED ANTI-CHEAT TRAPS ---
// 1. Disable Copy Shortcut (Ctrl + C)
document.addEventListener('copy', (e) => e.preventDefault());

// 2. DevTools Debugger Trap (Console ko hang karne ke liye)
setInterval(() => {
    (function() { return false; }['constructor']('debugger')());
}, 1000);

// --- ANTI-CHEAT: Disable DevTools ---
document.addEventListener('contextmenu', event => event.preventDefault()); // Disable Right Click
document.addEventListener('keydown', (e) => {
    if (e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || 
        (e.ctrlKey && e.key === 'U')) {
        e.preventDefault();
    }
});

const header = document.querySelector('.test-header');
if (header) {
    let lastScrollTop = 0;
    window.addEventListener("scroll", function() {
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        // Hide on scroll down, show on scroll up
        if (scrollTop > lastScrollTop && scrollTop > header.offsetHeight){
            header.classList.add('header--hidden');
        } else {
            header.classList.remove('header--hidden');
        }
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }, false);
}

// URL se pata lagana ki konsa test open karna hai
const urlParams = new URLSearchParams(window.location.search);
const catIndex = urlParams.get('cat');
const subIndex = urlParams.get('sub');
const subjIndex = urlParams.get('subj');
const testSessionKey = `testSession_${catIndex}_${subIndex}_${subjIndex}`;

let questionsData = [];

// === FIREBASE CONFIGURATION ===
const firebaseConfig = {
    apiKey: "AIzaSyDQK9vc_W_TfsPmk6ryRfanFj59Hw7451k",
    authDomain: "mockdrill-b36ba.firebaseapp.com",
    databaseURL: "https://mockdrill-b36ba-default-rtdb.firebaseio.com",
    projectId: "mockdrill-b36ba",
    storageBucket: "mockdrill-b36ba.firebasestorage.app",
    messagingSenderId: "1097107994313",
    appId: "1:1097107994313:web:7902e8568398de86a1ff18",
    measurementId: "G-NNWBFK6FF7"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const isFirebaseConfigured = firebaseConfig.apiKey !== "API_KEY_YAHAN_DALEIN";

// Firebase Database se saved questions nikalna
if (catIndex !== null && subIndex !== null && subjIndex !== null) {
    if (isFirebaseConfigured) {
        db.ref('examCategories').once('value').then((snapshot) => {
            loadQuestionsFromData(snapshot.val());
        }).catch(() => loadQuestionsFromData(JSON.parse(localStorage.getItem('examCategories'))));
    } else {
        loadQuestionsFromData(JSON.parse(localStorage.getItem('examCategories')));
    }
}

function loadQuestionsFromData(categoriesData) {
    if (categoriesData && categoriesData[catIndex] && categoriesData[catIndex].subcategories[subIndex]) {
        const targetSub = categoriesData[catIndex].subcategories[subIndex];
        if (targetSub.questionsData && targetSub.questionsData[subjIndex]) {
            questionsData = targetSub.questionsData[subjIndex];
        }
        
        // Header me test ka naam update karna
        const subjName = targetSub.subjects ? targetSub.subjects[subjIndex] : "";
        document.querySelector('.test-title').innerText = `${targetSub.title} - ${subjName} Test`;
    }
    
    initTest();
}

let currentQuestionIndex = 0;
let currentLang = "eng"; // Default language
let userAnswers = {}; // Select kiye hue answers save karne ke liye
let secondsElapsed = 0;
let timerInterval = null;
let timerStarted = false; // Timer track karne ke liye

// Test ka state save aur load karne ke functions
function saveTestState() {
    const state = { currentQuestionIndex, currentLang, userAnswers, secondsElapsed, timerStarted };
    sessionStorage.setItem(testSessionKey, JSON.stringify(state));
}

function loadTestState() {
    const savedState = sessionStorage.getItem(testSessionKey);
    if (savedState) {
        const state = JSON.parse(savedState);
        currentQuestionIndex = state.currentQuestionIndex || 0;
        currentLang = state.currentLang || "eng";
        userAnswers = state.userAnswers || {};
        secondsElapsed = state.secondsElapsed || 0;
        timerStarted = state.timerStarted || false;
        
        if (languageToggle) languageToggle.value = currentLang;
    }
}

// DOM Elements ko fetch karna
const qNumberEl = document.getElementById("q-number");
const qTextEl = document.getElementById("q-text");
const optionsContainer = document.getElementById("options-container");
const paletteGrid = document.getElementById("palette-grid");
const languageToggle = document.getElementById("language-toggle");

// Language Dropdown Logic
if (languageToggle) {
    languageToggle.addEventListener("change", (e) => {
        currentLang = e.target.value;
        saveTestState();
        loadQuestion(currentQuestionIndex); // Language badalte hi question dobara load karein
    });
}

// Timer Function (Count Up)
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    const timerEl = document.getElementById("time-left");
    timerInterval = setInterval(() => {
        secondsElapsed++;
        const hours = Math.floor(secondsElapsed / 3600).toString().padStart(2, '0');
        const minutes = Math.floor((secondsElapsed % 3600) / 60).toString().padStart(2, '0');
        const seconds = (secondsElapsed % 60).toString().padStart(2, '0');
        timerEl.innerText = `${hours}:${minutes}:${seconds}`;
        saveTestState(); // Har second timer ka state save karein
    }, 1000);
}

// XSS Protection: HTML ko sanitize karne ka function (Bold aur Italic ko chhodkar baki HTML block karega)
function sanitizeHTML(str) {
    if (!str) return '';
    let safe = str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    safe = safe.replace(/&lt;b&gt;/gi, '<b>').replace(/&lt;\/b&gt;/gi, '</b>');
    safe = safe.replace(/&lt;i&gt;/gi, '<i>').replace(/&lt;\/i&gt;/gi, '</i>');
    return safe;
}

// Question load karne ka function
function loadQuestion(index) {
    // Agar questions nahi hain, toh ye message dikhayega
    if (!questionsData || questionsData.length === 0) {
        qTextEl.innerHTML = "Is subject me abhi tak koi question add nahi kiya gaya hai.<br><br>Kripya Admin panel se pehle questions add karein.";
        optionsContainer.innerHTML = "";
        return;
    }

    const question = questionsData[index];
    
    // Bhasha (Language) check karna ki dono daali gayi hain ya nahi
    const hasEng = question.eng && question.eng.q && question.eng.q.trim() !== "";
    const hasHin = question.hin && question.hin.q && question.hin.q.trim() !== "";

    if (languageToggle) {
        if (hasEng && hasHin) {
            languageToggle.style.display = "inline-block"; // Dono hain toh button dikhao
        } else {
            languageToggle.style.display = "none"; // Dono nahi hain toh button chupao
            if (hasEng && !hasHin) currentLang = "eng"; // Jo language hai uspe set kar do
            else if (!hasEng && hasHin) currentLang = "hin";
        }
    }

    // Set Question Text (Selected language ke hisaab se)
    qNumberEl.innerText = `Question ${index + 1}`;
    if (currentLang === 'eng') {
        qTextEl.innerHTML = `<div style="color: #2c3e50; font-size: 1.1rem;">${sanitizeHTML(question.eng.q)}</div>`;
    } else {
        qTextEl.innerHTML = `<div style="color: #2c3e50; font-size: 1.1rem;">${sanitizeHTML(question.hin.q)}</div>`;
    }
    
    // Set Options (Selected language ke hisaab se)
    optionsContainer.innerHTML = "";
    const optionsToShow = currentLang === 'eng' ? question.eng.options : question.hin.options;
    
    optionsToShow.forEach((opt, i) => {
        const label = document.createElement("label");
        label.className = "option-label";
        
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "option";
        radio.value = i;
        
        // Agar pehle se answer select kiya tha toh checked rakhein
        if (userAnswers[index] === i) {
            radio.checked = true;
            label.classList.add("selected"); // Load hone par green set karein
        }
        
        radio.addEventListener("change", () => {
            userAnswers[index] = i; // Answer save karein taaki language badalne par hato na
            
            // Baki options se green color hatayein aur naye wale par lagayein
            const allLabels = optionsContainer.querySelectorAll('.option-label');
            allLabels.forEach(lbl => lbl.classList.remove("selected"));
            label.classList.add("selected");

            // Question Palette mein button ko green karein
            const paletteBtns = document.querySelectorAll('.palette-btn');
            if (paletteBtns[index]) paletteBtns[index].classList.add("answered");

            // Jab pehli baar koi option click ho toh timer chalu karein
            if (!timerStarted) {
                startTimer();
                timerStarted = true;
            }
            saveTestState();
        });

        label.appendChild(radio);
        
        const optSpan = document.createElement("span");
        optSpan.className = "opt-text-wrap";
        optSpan.innerHTML = `<span class="opt-letter">${String.fromCharCode(65 + i)}</span> <span style="font-weight: 500;">${sanitizeHTML(opt)}</span>`;
        label.appendChild(optSpan);
        
        optionsContainer.appendChild(label);
    });

    // Last question par Next hide karke Submit show karne ka logic
    const btnNext = document.getElementById("btn-next");
    const btnSubmit = document.getElementById("btn-submit");
    if (btnNext && btnSubmit) {
        if (index === questionsData.length - 1) {
            btnNext.style.display = "none";
            btnSubmit.style.display = "inline-block";
        } else {
            btnNext.style.display = "inline-block";
            btnSubmit.style.display = "none";
        }
    }

    // Palette mein current question par blue border lagayein
    const paletteBtns = document.querySelectorAll('.palette-btn');
    if (paletteBtns.length > 0) {
        paletteBtns.forEach((btn, idx) => {
            btn.classList.remove('current');
            if (idx === index) btn.classList.add('current');
        });
    }
}

// Palette Generate karne ka function
function generatePalette() {
    paletteGrid.innerHTML = "";
    questionsData.forEach((q, i) => {
        const btn = document.createElement("button");
        btn.className = "palette-btn";
        btn.innerText = i + 1;
        
        // Agar pehle se answer de diya hai toh green rakhein
        if (userAnswers[i] !== undefined) {
            btn.classList.add("answered");
        }
        if (i === currentQuestionIndex) {
            btn.classList.add("current");
        }
        
        btn.onclick = () => {
            currentQuestionIndex = i;
            saveTestState();
            loadQuestion(currentQuestionIndex);
        };
        paletteGrid.appendChild(btn);
    });
}

// Button Event Listeners
document.getElementById("btn-next").addEventListener("click", () => {
    if (currentQuestionIndex < questionsData.length - 1) {
        currentQuestionIndex++;
        saveTestState();
        loadQuestion(currentQuestionIndex);
    }
});

document.getElementById("btn-prev").addEventListener("click", () => {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        saveTestState();
        loadQuestion(currentQuestionIndex);
    }
});

document.getElementById("btn-clear").addEventListener("click", () => {
    if (userAnswers[currentQuestionIndex] !== undefined) {
        delete userAnswers[currentQuestionIndex]; // Save kiye hue answer ko memory se delete karein
        
        // Screen se green highlight aur radio tick hatayein
        const allLabels = optionsContainer.querySelectorAll('.option-label');
        allLabels.forEach(lbl => lbl.classList.remove("selected"));
        const radios = optionsContainer.querySelectorAll('input[type="radio"]');
        radios.forEach(r => r.checked = false);

        // Right side Palette se green color hatayein
        const paletteBtns = document.querySelectorAll('.palette-btn');
        if (paletteBtns[currentQuestionIndex]) paletteBtns[currentQuestionIndex].classList.remove("answered");
        saveTestState();
    }
});

document.getElementById("btn-submit").addEventListener("click", () => {
    if (!questionsData || questionsData.length === 0) return;
    
    const answeredCount = Object.keys(userAnswers).length;
    const total = questionsData.length;
    let confirmMsg = "";

    if (answeredCount === total) {
        confirmMsg = "Aapne saare questions attempt kar liye hain! 🎉\nKya aap test submit karna chahte hain?";
    } else {
        confirmMsg = `Aapne ${total} mein se sirf ${answeredCount} questions attempt kiye hain.\nKya aap test submit karna chahte hain?`;
    }

    if (!confirm(confirmMsg)) return;

    clearInterval(timerInterval); // Timer ko rok do

    let score = 0;

    // Har question ka answer check karein
    questionsData.forEach((q, index) => {
        if (userAnswers[index] === q.answer) {
            score++;
        }
    });

    const incorrect = answeredCount - score; // Galat jawabo ka calculation
    const unattempted = total - answeredCount; // Chhode gaye sawalo ka calculation

    const percentage = Math.round((score / total) * 100);
    const accuracy = answeredCount > 0 ? Math.round((score / answeredCount) * 100) : 0; // Accuracy calculation

    const certModal = document.getElementById("certificate-modal");
    const certBox = document.getElementById("certificate-box");
    const suggestionEl = document.getElementById("cert-suggestion-display");

    // Details bharna
    document.getElementById("cert-score-display").innerText = `${score} / ${total}`;
    document.getElementById("cert-incorrect-display").innerText = incorrect;
    document.getElementById("cert-unattempted-display").innerText = unattempted;
    document.getElementById("cert-accuracy-display").innerText = accuracy;
    document.getElementById("cert-percent-display").innerText = percentage;
    document.getElementById("cert-exam-name").innerText = document.querySelector('.test-title').innerText;

    // Aaj ki Date Certificate pe dikhana
    const today = new Date();
    document.getElementById("cert-date-display").innerText = today.toLocaleDateString('en-GB'); // DD/MM/YYYY

    // Random Certificate ID generate karna
    const randomId = Math.floor(10000 + Math.random() * 90000);
    document.getElementById("cert-id-display").innerText = `MD-${today.getFullYear()}-${randomId}`;

    // Time Taken display karna
    const minutesTaken = Math.floor(secondsElapsed / 60);
    const secondsTaken = secondsElapsed % 60;
    document.getElementById("cert-time-taken-display").innerText = `${minutesTaken} min ${secondsTaken} sec`;

    // Pie Chart Generation Logic
    const correctPct = (score / total) * 100;
    const incorrectPct = (incorrect / total) * 100;
    const unattemptedPct = (unattempted / total) * 100;

    const pieChart = document.getElementById("result-pie-chart");
    // conic-gradient se pie chart draw karna
    pieChart.style.background = `conic-gradient(
        #10b981 0% ${correctPct}%, 
        #ef4444 ${correctPct}% ${correctPct + incorrectPct}%, 
        #cbd5e1 ${correctPct + incorrectPct}% 100%
    )`;
    
    document.getElementById("pie-correct-val").innerText = score;
    document.getElementById("pie-incorrect-val").innerText = incorrect;
    document.getElementById("pie-unattempted-val").innerText = unattempted;

    // Performance ke hisaab se Certificate Tiers
    certBox.className = "certificate-box"; // Purani class reset karein
    if (percentage <= 25) {
        certBox.classList.add("tier-red");
        suggestionEl.innerText = "Needs Improvement! 📉 Don't give up, review your basics and try again.";
    } else if (percentage <= 50) {
        certBox.classList.add("tier-bronze");
        suggestionEl.innerText = "Average Performance! 🥉 Good effort, but you need more practice.";
    } else if (percentage <= 75) {
        certBox.classList.add("tier-silver");
        suggestionEl.innerText = "Good Job! 🥈 You have a solid understanding. Keep pushing for perfection.";
    } else {
        certBox.classList.add("tier-gold");
        suggestionEl.innerText = "Outstanding! 🏆 You are a master of this subject. Keep shining!";
    }

    sessionStorage.removeItem(testSessionKey); // Submit hone par saved session hata dein
    certModal.style.display = "flex";
});

// Certificate Name Real-time Update
document.getElementById("student-name-input").addEventListener("input", (e) => {
    document.getElementById("cert-name-display").innerText = e.target.value || "Candidate Name";
});

// Certificate Modal Band Karna
document.getElementById("close-cert-modal").addEventListener("click", () => {
    document.getElementById("certificate-modal").style.display = "none";
});

// Certificate Download Logic (Image)
const btnDownloadCert = document.getElementById("btn-download-cert");
if (btnDownloadCert) {
    btnDownloadCert.addEventListener("click", () => {
        const certBox = document.getElementById("certificate-box");
        html2canvas(certBox, { scale: 2 }).then(canvas => {
            const link = document.createElement('a');
            link.download = 'MockDrill_Certificate.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    });
}

// Certificate Share Logic (Web Share API for Mobile/Tablet)
const btnShareCert = document.getElementById("btn-share-cert");
if (btnShareCert) {
    btnShareCert.addEventListener("click", () => {
        const certBox = document.getElementById("certificate-box");
        
        html2canvas(certBox, { scale: 2 }).then(canvas => {
            canvas.toBlob(blob => {
                const file = new File([blob], 'MockDrill_Result.png', { type: 'image/png' });
                const examName = document.getElementById("cert-exam-name").innerText;
                const score = document.getElementById("cert-score-display").innerText;
                const shareText = `I just scored ${score} in the ${examName} test on MockDrill! 🏆\nCheck out my certificate!`;
                
                // Check karein agar browser direct file share support karta hai (Mobiles me support hota hai)
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    navigator.share({
                        title: 'MockDrill Result',
                        text: shareText,
                        files: [file]
                    }).catch(err => console.log('Share canceled or failed:', err));
                } else {
                    alert("Direct sharing is not supported on your browser. Kripya pehle Download karein aur phir share karein.");
                }
            }, 'image/png');
        });
    });
}

function initTest() {
    loadTestState(); // Test load hone se pehle purana state nikalna
    loadQuestion(currentQuestionIndex);
    generatePalette();
    
    // Agar refresh se pehle timer chalu tha, toh fir se shuru karein
    const timerEl = document.getElementById("time-left");
    const hours = Math.floor(secondsElapsed / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((secondsElapsed % 3600) / 60).toString().padStart(2, '0');
    const seconds = (secondsElapsed % 60).toString().padStart(2, '0');
    timerEl.innerText = `${hours}:${minutes}:${seconds}`;
    if (timerStarted) startTimer();
}

})(); // End of Anti-Cheat IIFE