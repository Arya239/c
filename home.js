// --- ANTI-CHEAT & SECURITY ---
// DevTools Debugger Trap (Console/Inspect element ko hang karne ke liye)
setInterval(() => {
    (function() { return false; }['constructor']('debugger')());
}, 1000);

// Disable Right Click (Lekin Input aur Textarea me right-click chalne dega)
document.addEventListener('contextmenu', event => {
    if (event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
        event.preventDefault();
    }
});
// Disable F12 and DevTools Shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || 
        (e.ctrlKey && e.key === 'U')) {
        e.preventDefault();
    }
});

const homeHeader = document.querySelector('.home-header');
if (homeHeader) {
    let lastScrollTop = 0;
    window.addEventListener("scroll", function() {
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        // Hide on scroll down, show on scroll up
        if (scrollTop > lastScrollTop && scrollTop > homeHeader.offsetHeight) {
            homeHeader.classList.add('header--hidden');
        } else {
            homeHeader.classList.remove('header--hidden');
        }
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }, false);
}

const categoryGrid = document.getElementById('category-grid');
const addCardBtn = document.getElementById('add-card-btn');
const logoBtn = document.getElementById('logo-btn');
const sectionTitle = document.getElementById('section-title');
const backBtn = document.getElementById('back-btn');
const adminBadge = document.getElementById('admin-badge');

let currentCategoryIndex = null; // null means main menu par hain

// Default Categories jo pehli baar load hongi
const defaultCategories = [
    { 
        title: "🏛️ SSC Exams", desc: "CGL, GD, CHSL, MTS, CPO", 
        subcategories: [{ title: "SSC MTS" }, { title: "SSC CHSL" }] 
    },
    { 
        title: "🚆 Railway Exams", desc: "NTPC, Group D, ALP", 
        subcategories: [{ title: "RRB NTPC" }, { title: "RRB Group D" }] 
    },
    { 
        title: "🕵️ Intelligence Bureau", desc: "ACIO, SA/EXE, MTS", 
        subcategories: [{ title: "IB ACIO" }, { title: "IB SA/EXE" }] 
    },
    { 
        title: "🎓 Other Exams", desc: "Banking, State Police, Defence", 
        subcategories: [{ title: "Banking PO" }, { title: "State Police" }] 
    }
];

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
let categories = [];

// Smart Load: Agar Firebase configure nahi hai toh LocalStorage use karein
if (isFirebaseConfigured) {
    db.ref('examCategories').once('value').then((snapshot) => {
        const data = snapshot.val();
        categories = data ? data : defaultCategories;
        if (!data) saveCategoriesToDB();
        renderCards(); 
    }).catch(() => loadLocalData()); // Error aaye toh local load karein
} else {
    loadLocalData();
}

function loadLocalData() {
    const localData = JSON.parse(localStorage.getItem('examCategories'));
    categories = localData ? localData : defaultCategories;
    renderCards();
}

function saveCategoriesToDB() {
    if (isFirebaseConfigured) {
        db.ref('examCategories').set(categories);
    }
    localStorage.setItem('examCategories', JSON.stringify(categories));
}

// Check Admin Status jab page load ho
if (sessionStorage.getItem('_md_admin_token') === 'secure_auth_v1') {
    addCardBtn.style.display = 'inline-block';
    if (adminBadge) adminBadge.style.display = 'inline-block';
}

// Screen par cards render karne ka function
function renderCards() {
    categoryGrid.innerHTML = '';
    const isAdmin = sessionStorage.getItem('_md_admin_token') === 'secure_auth_v1';

    if (currentCategoryIndex === null) {
        // MAIN CATEGORIES SHOW KAREIN
        sectionTitle.innerText = "🎯 Select Your Exam Category";
        backBtn.style.display = 'none';
        addCardBtn.innerText = "➕ Add New Category (Admin)";

        categories.forEach((cat, index) => {
            const card = document.createElement('div');
            card.className = 'category-row';
            card.onclick = () => {
                currentCategoryIndex = index;
                renderCards(); // Click par sub-categories dikhayein
            };
            card.style.animationDelay = `${index * 0.1}s`;

            // Drag and Drop Logic for Main Categories
            if (isAdmin) {
                card.draggable = true;
                card.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', index);
                    card.classList.add('dragging');
                });
                card.addEventListener('dragend', () => card.classList.remove('dragging'));
                card.addEventListener('dragover', (e) => { e.preventDefault(); card.classList.add('drag-over'); });
                card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
                card.addEventListener('drop', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    card.classList.remove('drag-over');
                    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                    if (fromIndex !== index && !isNaN(fromIndex)) {
                        const [movedItem] = categories.splice(fromIndex, 1);
                        categories.splice(index, 0, movedItem);
                        saveCategoriesToDB(); renderCards();
                    }
                });
            }
            
            let deleteBtnHTML = isAdmin ? `<span class="delete-card-btn" title="Delete Card" onclick="deleteCard(${index}, event)">❌</span>` : '';
            let renameBtnHTML = isAdmin ? `<span class="edit-card-btn" title="Rename Category" onclick="renameCategory(${index}, event)">✏️</span>` : '';

            card.innerHTML = `
                <div class="cat-details">
                    <h3 style="display: flex; align-items: center;">${isAdmin ? '<span style="cursor: grab; margin-right: 10px; color: #cbd5e1; font-size: 1.1rem;" title="Drag to reorder">↕️</span>' : ''}${escapeHTML(cat.title)}</h3>
                    <p>${escapeHTML(cat.desc)}</p>
                </div>
                <div class="cat-actions">
                    ${renameBtnHTML}
                    ${deleteBtnHTML}
                    <button class="start-btn">View Exams ➔</button>
                </div>
            `;
            categoryGrid.appendChild(card);
        });
    } else {
        // SUB-CATEGORIES SHOW KAREIN
        const currentCat = categories[currentCategoryIndex];
        sectionTitle.innerText = `📂 ${currentCat.title} - Select Exam`;
        backBtn.style.display = 'inline-block';
        addCardBtn.innerText = "➕ Add New Test (Admin)";

        const subs = currentCat.subcategories || [];
        if (subs.length === 0) {
            categoryGrid.innerHTML = '<div style="text-align: center; color: #64748b; padding: 40px; font-size: 1.1rem; background: white; border-radius: 16px; border: 1px dashed #cbd5e1;">No exams found in this category yet.</div>';
        } else {
            subs.forEach((sub, subIndex) => {
                const examCard = document.createElement('div');
                examCard.className = 'exam-card';
                examCard.style.animationDelay = `${subIndex * 0.1}s`;

                // Drag and Drop Logic for Exams (Subcategories)
                if (isAdmin) {
                    examCard.draggable = true;
                    examCard.addEventListener('dragstart', (e) => {
                        e.dataTransfer.setData('text/plain', subIndex);
                        examCard.classList.add('dragging');
                    });
                    examCard.addEventListener('dragend', () => examCard.classList.remove('dragging'));
                    examCard.addEventListener('dragover', (e) => { e.preventDefault(); examCard.classList.add('drag-over'); });
                    examCard.addEventListener('dragleave', () => examCard.classList.remove('drag-over'));
                    examCard.addEventListener('drop', (e) => {
                        e.preventDefault(); e.stopPropagation();
                        examCard.classList.remove('drag-over');
                        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                        if (fromIndex !== subIndex && !isNaN(fromIndex)) {
                            const [movedItem] = categories[currentCategoryIndex].subcategories.splice(fromIndex, 1);
                            categories[currentCategoryIndex].subcategories.splice(subIndex, 0, movedItem);
                            saveCategoriesToDB(); renderCards();
                        }
                    });
                }

                let addSubjBtnHTML = isAdmin ? `<button class="admin-action-btn add-btn" title="Add Subject" onclick="addSubject(${subIndex}, event)">➕ Subject</button>` : '';
                let renameExamBtnHTML = isAdmin ? `<button class="admin-action-btn rename-btn" title="Rename Exam" onclick="renameSubCategory(${subIndex}, event)">✏️ Rename</button>` : '';
                let deleteBtnHTML = isAdmin ? `<button class="admin-action-btn delete-btn" title="Delete Exam" onclick="deleteSubCategory(${subIndex}, event)">🗑️ Delete</button>` : '';

                // Default subjects agar pehle se save nahi hain toh
                const subjects = sub.subjects || ['Math', 'Reasoning', 'English', 'Hindi', 'GK/GS'];
                let subjectButtonsHTML = subjects.map((subj, subjIndex) => {
                    let safeSubjText = escapeHTML(subj);
                    let safeSubjJs = escapeHTML(subj.replace(/'/g, "\\'")); // JS ke string break na ho isliye escape
                    let delSubjBtn = isAdmin ? `<span class="badge-btn del-badge" title="Delete Subject" onclick="deleteSubject(${subIndex}, ${subjIndex}, event)">✕</span>` : '';
                    let addQsBtn = isAdmin ? `<span class="badge-btn edit-badge" title="Add/Edit Questions" onclick="openQuestionEditor(${subIndex}, ${subjIndex}, '${safeSubjJs}', event)">✎</span>` : '';
                    return `<div class="subject-pill-wrapper">
                                <button class="subject-pill" onclick="window.location.href='mocktest.html?cat=${currentCategoryIndex}&sub=${subIndex}&subj=${subjIndex}'">
                                    <span class="subj-icon">📝</span> ${safeSubjText}
                                </button>
                                ${delSubjBtn} ${addQsBtn}
                            </div>`;
                }).join('');

                examCard.innerHTML = `
                    <div class="exam-header">
                        <h3 class="exam-title" style="display: flex; align-items: center;">
                            ${isAdmin ? '<span style="cursor: grab; margin-right: 10px; color: #cbd5e1; font-size: 1.1rem;" title="Drag to reorder">↕️</span>' : ''}
                            📄 ${escapeHTML(sub.title)}
                        </h3>
                        <div class="exam-actions">${addSubjBtnHTML}${renameExamBtnHTML}${deleteBtnHTML}</div>
                    </div>
                    <div class="subject-list">${subjectButtonsHTML}</div>
                `;
                categoryGrid.appendChild(examCard);
            });
        }
    }
}

// Admin Login Elements
const adminLoginModal = document.getElementById('admin-login-modal');
const closeLoginModal = document.getElementById('close-login-modal');
const adminPwdInput = document.getElementById('admin-pwd-input');
const adminLoginSubmit = document.getElementById('admin-login-submit');
const adminLoginError = document.getElementById('admin-login-error');

// Admin Login Logic
logoBtn.addEventListener('click', () => {
    // Agar pehle se admin hai toh Logout kar do
    if (sessionStorage.getItem('_md_admin_token') === 'secure_auth_v1') {
        sessionStorage.removeItem('_md_admin_token'); 
        addCardBtn.style.display = 'none';
        if (adminBadge) adminBadge.style.display = 'none';
        alert("Admin Logout successful.");
        renderCards(); 
        if (typeof renderReviews === 'function') renderReviews(); // Reviews se delete button hatao
        return;
    }
    
    // Show custom modal instead of prompt
    adminPwdInput.value = '';
    adminLoginError.style.display = 'none';
    adminLoginModal.style.display = 'flex';
    setTimeout(() => adminPwdInput.focus(), 100);
});

closeLoginModal.addEventListener('click', () => {
    adminLoginModal.style.display = 'none';
});

// Complex Password Verification Logic (Math Obfuscation)
function verifySecret(input) {
    // Yeh array aapke password ka ek complex mathematical form hai. No one can read it directly!
    const secretMatrix = [211, 217, 231, 197, 237, 217, 229, 225, 225, 193];
    if (!input || input.length !== secretMatrix.length) return false;
    return input.split('').every((char, idx) => ((char.charCodeAt(0) * 2) - 5) === secretMatrix[idx]);
}

function handleAdminLogin() {
    const password = adminPwdInput.value;
    
    // Anti-Brute-Force: Thoda delay add karna aur button block karna
    adminLoginSubmit.innerText = "Verifying...";
    adminLoginSubmit.disabled = true;
    
    setTimeout(() => {
        if (verifySecret(password)) { 
            sessionStorage.setItem('_md_admin_token', 'secure_auth_v1');
            addCardBtn.style.display = 'inline-block';
            if (adminBadge) adminBadge.style.display = 'inline-block';
            adminLoginModal.style.display = 'none';
            alert("Admin mode active! Ab aap naye exams add kar sakte hain.");
            renderCards(); 
            if (typeof renderReviews === 'function') renderReviews(); // Reviews me delete button dikhao
        } else {
            adminLoginError.style.display = 'block';
            adminPwdInput.value = '';
            adminPwdInput.focus();
        }
        adminLoginSubmit.innerText = "Unlock Admin Mode";
        adminLoginSubmit.disabled = false;
    }, 600); // 600ms ka delay fake server request jaisa feel dega
}

adminLoginSubmit.addEventListener('click', handleAdminLogin);
adminPwdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAdminLogin();
});

// Back Button Logic
backBtn.addEventListener('click', () => {
    currentCategoryIndex = null; // Wapas main menu (categories) par set karein
    renderCards(); // Screen ko refresh karke cards dobara show karein
});

// Category Rename karne ka function
function renameCategory(index, event) {
    event.stopPropagation();
    const currentName = categories[index].title;
    const newName = prompt("Category ka naya naam dalein:", currentName);
    if (newName && newName.trim() !== "" && newName !== currentName) {
        categories[index].title = newName.trim();
        saveCategoriesToDB();
        renderCards();
    }
}

// Card Delete karne ka function
function deleteCard(index, event) {
    event.stopPropagation(); // Card pe click ho kar dusre page pe jaane se roke
    if (confirm("Kya aap sach me is exam category ko delete karna chahte hain?")) {
        categories.splice(index, 1); // Array me se hataye
        saveCategoriesToDB(); // Firebase me Data save karein
        renderCards(); // Screen update karein
    }
}

// Sub-Category (Exam) Rename karne ka function
function renameSubCategory(subIndex, event) {
    event.stopPropagation();
    const currentName = categories[currentCategoryIndex].subcategories[subIndex].title;
    const newName = prompt("Exam ka naya naam dalein:", currentName);
    if (newName && newName.trim() !== "" && newName !== currentName) {
        categories[currentCategoryIndex].subcategories[subIndex].title = newName.trim();
        saveCategoriesToDB();
        renderCards();
    }
}

// Sub-Category Delete karne ka function
function deleteSubCategory(subIndex, event) {
    event.stopPropagation();
    if (confirm("Kya aap sach me is exam ko delete karna chahte hain?")) {
        categories[currentCategoryIndex].subcategories.splice(subIndex, 1);
        saveCategoriesToDB();
        renderCards();
    }
}

// Subject add karne ka function
function addSubject(subIndex, event) {
    event.stopPropagation();
    const subjectName = prompt("Naye Subject ka naam dalein (e.g. Computer, Physics):");
    if (!subjectName) return;

    // Agar purana data hai jisme subjects save nahi the, toh pehle default wale add karein
    if (!categories[currentCategoryIndex].subcategories[subIndex].subjects) {
        categories[currentCategoryIndex].subcategories[subIndex].subjects = ['Math', 'Reasoning', 'English', 'Hindi', 'GK/GS'];
    }
    categories[currentCategoryIndex].subcategories[subIndex].subjects.push(subjectName);
    saveCategoriesToDB();
    renderCards();
}

// Subject delete karne ka function
function deleteSubject(subIndex, subjIndex, event) {
    event.stopPropagation();
    if (confirm("Kya aap sach me is subject ko delete karna chahte hain?")) {
        categories[currentCategoryIndex].subcategories[subIndex].subjects.splice(subjIndex, 1);
        saveCategoriesToDB();
        renderCards();
    }
}

let editingLocation = null; // Save karne ke waqt yaad rakhne ke liye ki konsa exam tha

// Text ko form me daalte waqt safe rakhne ke liye function
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// Text Format (Bold/Italic) karne ka Function
function formatText(btn, tag, targetClass) {
    const pane = btn.closest('.pane');
    const textarea = pane.querySelector(targetClass);
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    
    textarea.value = before + `<${tag}>${selectedText}</${tag}>` + after;
    
    textarea.focus();
    textarea.setSelectionRange(start + tag.length + 2, start + tag.length + 2 + selectedText.length);
}

// Question Editor Open karna aur form generate karna
function openQuestionEditor(subIndex, subjIndex, subjName, event) {
    event.stopPropagation();
    editingLocation = { catIndex: currentCategoryIndex, subIndex, subjIndex };
    const currentCat = categories[currentCategoryIndex];
    const currentSub = currentCat.subcategories[subIndex];

    let existingQs = [];
    if (currentSub.questionsData && currentSub.questionsData[subjIndex]) {
        existingQs = currentSub.questionsData[subjIndex];
    }

    let numQsStr = "0";
    if (existingQs.length === 0) {
        numQsStr = prompt(`Kitne questions dalne hain "${subjName}" me? (e.g., 10, 20)`, "10");
        if (!numQsStr) return;
    } else {
        numQsStr = prompt(`Pehle se ${existingQs.length} questions hain.\nNaye kitne add karne hain? (Sirf delete/edit karna ho toh 0 likhein)`, "0");
        if (numQsStr === null) return;
    }

    const numQs = parseInt(numQsStr) || 0;

    document.getElementById('modal-title').innerText = `${currentCat.title} > ${currentSub.title} > ${subjName}`;

    let html = '';
    
    // Purane saved questions ko load karna
    existingQs.forEach((qData) => {
        html += generateQuestionBlockHTML(qData);
    });

    // Naye questions ke liye khali dabbe add karna
    for (let j = 1; j <= numQs; j++) {
        html += generateQuestionBlockHTML(null);
    }

    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('question-modal').style.display = 'flex';
    updateQuestionNumbers();
}

function generateQuestionBlockHTML(qData) {
    let engQ = (qData && qData.eng && qData.eng.q) ? escapeHTML(qData.eng.q) : '';
    let engA = (qData && qData.eng && qData.eng.options && qData.eng.options[0]) ? escapeHTML(qData.eng.options[0]) : '';
    let engB = (qData && qData.eng && qData.eng.options && qData.eng.options[1]) ? escapeHTML(qData.eng.options[1]) : '';
    let engC = (qData && qData.eng && qData.eng.options && qData.eng.options[2]) ? escapeHTML(qData.eng.options[2]) : '';
    let engD = (qData && qData.eng && qData.eng.options && qData.eng.options[3]) ? escapeHTML(qData.eng.options[3]) : '';

    let hinQ = (qData && qData.hin && qData.hin.q) ? escapeHTML(qData.hin.q) : '';
    let hinA = (qData && qData.hin && qData.hin.options && qData.hin.options[0]) ? escapeHTML(qData.hin.options[0]) : '';
    let hinB = (qData && qData.hin && qData.hin.options && qData.hin.options[1]) ? escapeHTML(qData.hin.options[1]) : '';
    let hinC = (qData && qData.hin && qData.hin.options && qData.hin.options[2]) ? escapeHTML(qData.hin.options[2]) : '';
    let hinD = (qData && qData.hin && qData.hin.options && qData.hin.options[3]) ? escapeHTML(qData.hin.options[3]) : '';

    let ans = (qData && qData.answer !== undefined) ? parseInt(qData.answer) : 0;

    return `
        <div class="q-entry-block">
            <h3><span class="q-num-label">Question</span> <button type="button" class="del-q-btn" onclick="deleteQuestionBlock(this)">🗑️ Delete</button></h3>
            <div class="two-pane-grid">
                <div class="pane eng-pane">
                    <div class="pane-header-flex">
                        <h4>English</h4>
                        <div class="editor-toolbar">
                            <button type="button" title="Bold Text" onclick="formatText(this, 'b', '.eng-q')"><b>B</b></button>
                            <button type="button" title="Italic Text" onclick="formatText(this, 'i', '.eng-q')"><i>I</i></button>
                        </div>
                    </div>
                    <textarea class="eng-q" placeholder="Enter question in English">${engQ}</textarea>
                    <input type="text" class="eng-opt-a" placeholder="Option A" value="${engA}">
                    <input type="text" class="eng-opt-b" placeholder="Option B" value="${engB}">
                    <input type="text" class="eng-opt-c" placeholder="Option C" value="${engC}">
                    <input type="text" class="eng-opt-d" placeholder="Option D" value="${engD}">
                </div>
                <div class="pane hin-pane">
                    <div class="pane-header-flex">
                        <h4>Hindi</h4>
                        <div class="editor-toolbar">
                            <button type="button" title="Bold Text" onclick="formatText(this, 'b', '.hin-q')"><b>B</b></button>
                            <button type="button" title="Italic Text" onclick="formatText(this, 'i', '.hin-q')"><i>I</i></button>
                        </div>
                    </div>
                    <textarea class="hin-q" placeholder="हिंदी में प्रश्न दर्ज करें">${hinQ}</textarea>
                    <input type="text" class="hin-opt-a" placeholder="विकल्प A" value="${hinA}">
                    <input type="text" class="hin-opt-b" placeholder="विकल्प B" value="${hinB}">
                    <input type="text" class="hin-opt-c" placeholder="विकल्प C" value="${hinC}">
                    <input type="text" class="hin-opt-d" placeholder="विकल्प D" value="${hinD}">
                </div>
            </div>
            <div class="correct-ans-block">
                <label><strong>Correct Answer:</strong></label>
                <select class="correct-ans">
                    <option value="0" ${ans === 0 ? 'selected' : ''}>Option A</option>
                    <option value="1" ${ans === 1 ? 'selected' : ''}>Option B</option>
                    <option value="2" ${ans === 2 ? 'selected' : ''}>Option C</option>
                    <option value="3" ${ans === 3 ? 'selected' : ''}>Option D</option>
                </select>
            </div>
        </div>
    `;
}

function deleteQuestionBlock(btn) {
    if (confirm("Kya aap is question ko delete karna chahte hain? (Neeche Save zaroor karein)")) {
        btn.closest('.q-entry-block').remove();
        updateQuestionNumbers();
    }
}

function updateQuestionNumbers() {
    const labels = document.querySelectorAll('.q-num-label');
    labels.forEach((label, idx) => {
        label.innerText = `Question ${idx + 1}`;
    });
}

// Modal Band Karne Ka Button
document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('question-modal').style.display = 'none';
});

// =========================================
// BULK UPLOAD LOGIC
// =========================================
document.getElementById('download-template-btn').addEventListener('click', () => {
    const template = [
        {
            "eng": { "q": "Sample Question in English?", "options": ["A", "B", "C", "D"] },
            "hin": { "q": "सैंपल प्रश्न हिंदी में?", "options": ["विकल्प A", "विकल्प B", "विकल्प C", "विकल्प D"] },
            "answer": 0
        }
    ];
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(template, null, 4));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "MockDrill_Question_Template.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
});

// =========================================
// QUICK PASTE LOGIC
// =========================================
const quickPasteBtn = document.getElementById('quick-paste-btn');
const quickPasteModal = document.getElementById('quick-paste-modal');
const closePasteModal = document.getElementById('close-paste-modal');
const processPasteBtn = document.getElementById('process-paste-btn');
const quickPasteArea = document.getElementById('quick-paste-area');

if (quickPasteBtn) quickPasteBtn.addEventListener('click', () => {
    quickPasteArea.value = '';
    quickPasteModal.style.display = 'flex';
});
if (closePasteModal) closePasteModal.addEventListener('click', () => {
    quickPasteModal.style.display = 'none';
});
if (processPasteBtn) processPasteBtn.addEventListener('click', () => {
    const rawText = quickPasteArea.value.trim();
    if (!rawText) return;

    let parsedData = [];

    // Check karein agar JSON hai toh JSON ki tarah parse karein
    if (rawText.startsWith('[') || rawText.startsWith('{')) {
        try {
            parsedData = JSON.parse(rawText);
            if (!Array.isArray(parsedData)) parsedData = [parsedData];
        } catch (error) { alert("Invalid JSON format!"); return; }
    } else {
        // Agar simple Text (WhatsApp / MS Word) se paste kiya hai
        const lines = rawText.split('\n').map(l => l.trim()).filter(l => l !== "");
        let questionsMap = {}; // Questions ko unke number se yaad rakhne ke liye map
        let currentQ = null;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            let qMatch = line.match(/^Q\.?\s*(\d+)[\.\:\-]?\s*/i);
            
            if (qMatch) {
                let qNum = qMatch[1];
                let qClean = line.replace(/^Q\.?\s*\d+[\.\:\-]?\s*/i, '').trim();
                let isHindi = /[\u0900-\u097F]/.test(qClean);
                let lang = isHindi ? 'hin' : 'eng';
                
                if (!questionsMap[qNum]) {
                    // Agar is number ka question pehli baar aaya hai toh naya banayein
                    questionsMap[qNum] = { eng: { q: "", options: ["", "", "", ""] }, hin: { q: "", options: ["", "", "", ""] }, answer: 0, qNum: parseInt(qNum) };
                }
                
                currentQ = questionsMap[qNum];
                currentQ._lang = lang;
                currentQ[lang].q = qClean;
            }
            else if (/^[\(\[]?[A1][\.\)\]]\s*/i.test(line)) { 
                if(currentQ) {
                    let val = line.replace(/^[\(\[]?[A1][\.\)\]]\s*/i, '').trim();
                    currentQ[currentQ._lang].options[0] = val;
                    if(!currentQ.eng.options[0]) currentQ.eng.options[0] = val;
                    if(!currentQ.hin.options[0]) currentQ.hin.options[0] = val;
                } 
            }
            else if (/^[\(\[]?[B2][\.\)\]]\s*/i.test(line)) { 
                if(currentQ) {
                    let val = line.replace(/^[\(\[]?[B2][\.\)\]]\s*/i, '').trim();
                    currentQ[currentQ._lang].options[1] = val;
                    if(!currentQ.eng.options[1]) currentQ.eng.options[1] = val;
                    if(!currentQ.hin.options[1]) currentQ.hin.options[1] = val;
                } 
            }
            else if (/^[\(\[]?[C3][\.\)\]]\s*/i.test(line)) { 
                if(currentQ) {
                    let val = line.replace(/^[\(\[]?[C3][\.\)\]]\s*/i, '').trim();
                    currentQ[currentQ._lang].options[2] = val;
                    if(!currentQ.eng.options[2]) currentQ.eng.options[2] = val;
                    if(!currentQ.hin.options[2]) currentQ.hin.options[2] = val;
                } 
            }
            else if (/^[\(\[]?[D4][\.\)\]]\s*/i.test(line)) { 
                if(currentQ) {
                    let val = line.replace(/^[\(\[]?[D4][\.\)\]]\s*/i, '').trim();
                    currentQ[currentQ._lang].options[3] = val;
                    if(!currentQ.eng.options[3]) currentQ.eng.options[3] = val;
                    if(!currentQ.hin.options[3]) currentQ.hin.options[3] = val;
                } 
            }
            else if (/^(Ans|Answer|उत्तर|सही उत्तर)\s*[:\-\.]?\s*([A-D1-4])/i.test(line)) {
                if (currentQ) {
                    const ansChar = line.match(/^(Ans|Answer|उत्तर|सही उत्तर)\s*[:\-\.]?\s*([A-D1-4])/i)[2].toUpperCase();
                    let ansIndex = 0;
                    if (ansChar >= '1' && ansChar <= '4') {
                        ansIndex = parseInt(ansChar) - 1;
                    } else {
                        ansIndex = ansChar.charCodeAt(0) - 65; // A = 65
                    }
                    currentQ.answer = ansIndex;
                }
            }
            else { if (currentQ && currentQ[currentQ._lang].options[0] === "") { currentQ[currentQ._lang].q += "\n" + line; } }
        }
        
        // Sabhi ikattha kiye hue questions ko array mein daal kar number ke hisaab se sort kar do
        parsedData = Object.values(questionsMap).sort((a, b) => a.qNum - b.qNum);
    }

    if (parsedData.length > 0) {
        // Puraane khali dabbon ko form se automatically hata do taaki confusion na ho
        const existingBlocks = document.querySelectorAll('.q-entry-block');
        existingBlocks.forEach(block => {
            const eq = block.querySelector('.eng-q').value.trim();
            const hq = block.querySelector('.hin-q').value.trim();
            if (!eq && !hq) {
                block.remove(); // Khali box delete
            }
        });

        let newHtml = '';
        parsedData.forEach(qData => { newHtml += generateQuestionBlockHTML(qData); });
        document.getElementById('modal-body').insertAdjacentHTML('beforeend', newHtml);
        updateQuestionNumbers();
        quickPasteModal.style.display = 'none';

        // Auto-scroll karke naye bhare hue questions par le jayein
        setTimeout(() => { document.getElementById('modal-body').scrollTop = document.getElementById('modal-body').scrollHeight; }, 100);

        // Alert me user ko Correct Option chunn ne ka reminder
        alert(`🎉 ${parsedData.length} questions pehchan liye gaye hain!\nAnswers (Ans: B) bhi automatically detect ho gaye hain. Kripya ek baar check kar lein aur phir 'Save Questions' dabayein.`);
    } else { alert("Format samajh nahi aaya! Kripya 'Q.1' aur '(A)' wala format use karein."); }
});

// Form Save Karne Ka Logic
document.getElementById('save-questions-btn').addEventListener('click', () => {
    const blocks = document.querySelectorAll('.q-entry-block');
    const questionsArray = [];
    
    blocks.forEach((block) => {
        questionsArray.push({
            eng: {
                q: block.querySelector('.eng-q').value,
                options: [
                    block.querySelector('.eng-opt-a').value,
                    block.querySelector('.eng-opt-b').value,
                    block.querySelector('.eng-opt-c').value,
                    block.querySelector('.eng-opt-d').value
                ]
            },
            hin: {
                q: block.querySelector('.hin-q').value,
                options: [
                    block.querySelector('.hin-opt-a').value,
                    block.querySelector('.hin-opt-b').value,
                    block.querySelector('.hin-opt-c').value,
                    block.querySelector('.hin-opt-d').value
                ]
            },
            answer: parseInt(block.querySelector('.correct-ans').value)
        });
    });

    const { catIndex, subIndex, subjIndex } = editingLocation;
    let targetSub = categories[catIndex].subcategories[subIndex];
    
    // Data ko Local Storage mein save karna
    if (!targetSub.questionsData) targetSub.questionsData = {};
    targetSub.questionsData[subjIndex] = questionsArray;
    
    saveCategoriesToDB();
    alert(`${questionsArray.length} Questions Successfully Save Ho Gaye!`);
    document.getElementById('question-modal').style.display = 'none';
});

// Jab admin naya card add karna chahe
addCardBtn.addEventListener('click', () => {
    if (currentCategoryIndex === null) {
        // Main category add karna
        const title = prompt("Nayi Category ka title dalein (e.g. 💻 IT Exams):");
        if (!title) return;
        
        const desc = prompt("Exams ke naam dalein (e.g. TCS, Infosys):");
        if (!desc) return;

        categories.push({ title: title, desc: desc, subcategories: [] });
        saveCategoriesToDB();
        renderCards();
    } else {
        // Sub-category (exam) add karna
        const title = prompt("Naye Test ka naam dalein (e.g. SSC CGL, SSC GD):");
        if (!title) return;

        if (!categories[currentCategoryIndex].subcategories) {
            categories[currentCategoryIndex].subcategories = [];
        }
        categories[currentCategoryIndex].subcategories.push({ title: title, subjects: ['Math', 'Reasoning', 'English', 'Hindi', 'GK/GS'] });
        saveCategoriesToDB();
        renderCards();
    }
});

// =========================================
// REVIEW SYSTEM LOGIC (Real-time Firebase)
// =========================================
const reviewForm = document.getElementById('review-form');
const reviewsGrid = document.getElementById('reviews-grid');

let latestReviewsData = null; // Reviews ka data temporarily save rakhne ke liye

// Reviews ko screen par dikhane ka function
function renderReviews() {
    if (!reviewsGrid) return;
    reviewsGrid.innerHTML = '';
    if (latestReviewsData) {
        const isAdmin = sessionStorage.getItem('_md_admin_token') === 'secure_auth_v1';
        // Object.entries se key aur value dono milenge (delete karne ke liye key chahiye)
        const reviewsArray = Object.entries(latestReviewsData).reverse(); 
        
        reviewsArray.forEach(([key, rev]) => {
            const card = document.createElement('div');
            card.className = 'review-card';
            
            let deleteBtnHTML = isAdmin ? `<button class="delete-review-btn" onclick="deleteReview('${key}')" title="Delete Review">🗑️</button>` : '';

            card.innerHTML = `
                <div class="review-header">
                    <div>
                        <strong>${escapeHTML(rev.name)}</strong>
                        <span style="margin-left: 8px;">${'⭐'.repeat(rev.rating)}</span>
                    </div>
                    ${deleteBtnHTML}
                </div>
                <p>${escapeHTML(rev.text)}</p>
            `;
            reviewsGrid.appendChild(card);
        });
    } else {
        reviewsGrid.innerHTML = '<p style="color:#64748b; grid-column: 1/-1;">No reviews yet. Be the first to share your experience!</p>';
    }
}

// Load Reviews from Firebase
if (isFirebaseConfigured) {
    db.ref('reviews').on('value', (snapshot) => {
        latestReviewsData = snapshot.val();
        renderReviews();
    });
}

// Specific review ko database se delete karne ka function
window.deleteReview = function(key) {
    if (confirm("Kya aap sach me is review ko delete karna chahte hain?")) {
        db.ref('reviews').child(key).remove()
            .catch(err => alert("Review delete karne me error aaya."));
    }
};

if (reviewForm) {
    reviewForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!isFirebaseConfigured) {
            alert("Database is not connected. Review feature is currently offline.");
            return;
        }
        const name = document.getElementById('reviewer-name').value.trim();
        const rating = parseInt(document.getElementById('review-rating').value);
        const text = document.getElementById('review-text').value.trim();

        if (name && text) {
            const btn = reviewForm.querySelector('button');
            btn.innerText = "Submitting...";
            btn.disabled = true;

            db.ref('reviews').push({
                name: name,
                rating: rating,
                text: text,
                timestamp: Date.now()
            }).then(() => {
                alert("Thank you! Your review has been published.");
                reviewForm.reset();
                btn.innerText = "Submit Review";
                btn.disabled = false;
            }).catch((err) => {
                alert("Failed to submit review. Try again.");
                btn.innerText = "Submit Review";
                btn.disabled = false;
            });
        }
    });
}