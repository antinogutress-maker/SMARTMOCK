// --- CONFIGURATION ---
const API = {
    scoreScript: "https://script.google.com/macros/s/AKfycbztgOiYdZlPssBus6iXQ6LwokmA4LS2b7CzgcKS4gd1iv9lG7MB_N7SupsxSdYQedEZgA/exec",
    authScript: "https://script.google.com/macros/s/AKfycbyUGMGXI7vml6jzJsCxhXvHgnq4V4Aq6sl6blkJkdfC8_haCxI__kx3EwFzZrW942E6/exec"
};

const KEYS = { user: "civil_eng_global_user" };

// --- MAIN APP LOGIC ---
const App = {
    state: { user: null, quiz: [], curr: 0, score: 0, mistakes: [], timer: null, activeTopic: "" },

    save: (k, v) => localStorage.setItem(k, v),
    load: (k) => localStorage.getItem(k),

    // 1. LOGIN SYSTEM
    verifyAndLogin: () => {
        const n = document.getElementById('inp-name').value.trim();
        const q = document.getElementById('inp-qual').value;
        const c = document.getElementById('inp-code').value.trim();
        const msg = document.getElementById('auth-msg');
        const btn = document.getElementById('btn-verify');

        if(!n || !c) { msg.innerText = "Please enter Name and Code"; msg.style.display = 'block'; return; }

        btn.disabled = true; btn.innerText = "Verifying..."; msg.style.display = 'none';

        fetch(`${API.authScript}?code=${c}&name=${n}&qual=${q}`)
        .then(res => res.json())
        .then(data => {
            if(data.status === 'success') {
                document.getElementById('inp-pass').value = data.password;
                App.state.user = { name: n, qual: q, code: c };
                App.save(KEYS.user, JSON.stringify(App.state.user));
                setTimeout(() => App.dash(), 800);
            } else {
                btn.disabled = false; btn.innerText = "Verify & Login";
                msg.style.display = 'block'; msg.style.color = "#ff0055";
                msg.innerText = data.message || "Invalid Code";
            }
        })
        .catch(() => {
            btn.disabled = false; btn.innerText = "Verify & Login";
            msg.style.display = 'block'; msg.innerText = "Connection Error";
        });
    },

    // 2. DASHBOARD (LOADS list.json)
    dash: () => {
        // Hide others, show dash
        document.querySelectorAll('.app-container > div').forEach(d => d.classList.add('hidden'));
        document.getElementById('view-dash').classList.remove('hidden');

        // Restore User
        const stored = App.load(KEYS.user);
        if(!stored) { document.getElementById('view-login').classList.remove('hidden'); document.getElementById('view-dash').classList.add('hidden'); return; }
        
        App.state.user = JSON.parse(stored);
        document.getElementById('greet-msg').innerText = `Namaste, ${App.state.user.name.split(' ')[0]}!`;

        // Fetch List
        const listContainer = document.getElementById('test-list-container');
        listContainer.innerHTML = '<p style="text-align:center;">Fetching Tests...</p>';

        fetch('list.json')
        .then(res => res.json())
        .then(data => {
            listContainer.innerHTML = '';
            // Sort Descending by ID
            data.sort((a, b) => b.id - a.id);
            
            data.forEach(test => {
                const card = document.createElement('div');
                card.className = 'test-card';
                card.innerHTML = `
                    <div>
                        <h3 style="font-size:1.1rem; color:white;">${test.name}</h3>
                        <p style="font-size:0.8rem; color:#aaa;">Civil Engineering</p>
                    </div>
                    <div style="background:var(--primary); color:black; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center;">➤</div>
                `;
                card.onclick = () => App.startQuiz(test.file, test.name);
                listContainer.appendChild(card);
            });
        })
        .catch(err => {
            listContainer.innerHTML = '<p style="color:red; text-align:center;">Failed to load tests.</p>';
        });
    },

    // 3. START QUIZ (LOADS specific JSON)
    startQuiz: (fileUrl, topicName) => {
        document.getElementById('view-dash').classList.add('hidden');
        document.getElementById('view-quiz').classList.remove('hidden');
        
        App.state.activeTopic = topicName;
        document.getElementById('q-text').innerText = "Loading Questions...";
        
        fetch(fileUrl)
        .then(res => res.json())
        .then(questions => {
            if(!questions || questions.length === 0) return alert("No questions found.");
            
            App.state.curr = 0; App.state.score = 0; App.state.mistakes = [];
            
            // Randomize Questions & Options
            App.state.quiz = questions.map(q => {
                let opts = q.o.map((txt, i) => ({ t: txt, c: i === q.a }));
                return { ...q, shuffledOpts: opts.sort(() => Math.random() - 0.5) };
            }).sort(() => Math.random() - 0.5);

            document.getElementById('q-total').innerText = App.state.quiz.length;
            App.timer(45 * 60); // 45 Minutes
            App.render();
        })
        .catch(e => {
            alert("Error loading quiz file.");
            App.dash();
        });
    },

    render: () => {
        const q = App.state.quiz[App.state.curr];
        document.getElementById('q-idx').innerText = App.state.curr + 1;
        document.getElementById('q-text').innerText = q.q;
        document.getElementById('exp-box').style.display = 'none';
        document.getElementById('btn-next').classList.add('hidden');
        
        const list = document.getElementById('opts-list');
        list.innerHTML = '';
        q.shuffledOpts.forEach((opt, i) => {
            const btn = document.createElement('div');
            btn.className = 'option-btn';
            btn.innerHTML = `<div class="option-marker">${String.fromCharCode(65+i)}</div>${opt.t}`;
            btn.onclick = () => App.check(btn, opt);
            list.appendChild(btn);
        });
    },

    check: (btn, opt) => {
        const all = document.querySelectorAll('.option-btn');
        all.forEach(b => { b.onclick = null; b.style.opacity = '0.6'; });
        btn.style.opacity = '1';
        
        const praise = document.getElementById('praise-txt');
        
        if(opt.c) {
            btn.classList.add('correct');
            App.state.score++;
            praise.innerText = "Correct! " + App.state.user.name.split(' ')[0];
            praise.style.color = "#00f260";
        } else {
            btn.classList.add('wrong');
            const q = App.state.quiz[App.state.curr];
            all.forEach((b, i) => { if(q.shuffledOpts[i].c) b.classList.add('correct'); });
            praise.innerText = "Oops! " + App.state.user.name.split(' ')[0];
            praise.style.color = "#ff0055";
        }

        const q = App.state.quiz[App.state.curr];
        if(q.e) {
            document.getElementById('exp-box').innerHTML = `<strong>Explanation:</strong> ${q.e}`;
            document.getElementById('exp-box').style.display = 'block';
        }
        document.getElementById('btn-next').classList.remove('hidden');
    },

    next: () => {
        App.state.curr++;
        if(App.state.curr < App.state.quiz.length) App.render();
        else App.finish();
    },

    timer: (sec) => {
        if(App.state.timer) clearInterval(App.state.timer);
        App.state.timer = setInterval(() => {
            sec--;
            let m = Math.floor(sec/60), s = sec%60;
            document.getElementById('timer').innerText = `${m}:${s<10?'0':''}${s}`;
            if(sec<=0) App.finish();
        }, 1000);
    },

    finish: () => {
        clearInterval(App.state.timer);
        document.getElementById('view-quiz').classList.add('hidden');
        document.getElementById('view-result').classList.remove('hidden');

        const pct = Math.round((App.state.score / App.state.quiz.length) * 100);
        document.getElementById('res-score').innerText = App.state.score;
        document.getElementById('res-pct').innerText = `${pct}% Accuracy`;
        App.sync();
    },

    sync: () => {
        const data = {
            date: new Date().toLocaleString(),
            name: App.state.user.name,
            qualification: App.state.user.qual,
            topic: App.state.activeTopic, // DYNAMIC TOPIC NAME
            score: App.state.score
        };

        if(navigator.onLine) {
            fetch(API.scoreScript, {
                method: 'POST', mode: 'no-cors',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            }).then(() => {
                document.getElementById('sync-status').innerText = "✅ Score Saved to Google Sheet!";
                document.getElementById('sync-status').style.color = "#00f260";
            });
        }
    }
};

window.onload = () => {
    if(App.load(KEYS.user)) App.dash();
};

