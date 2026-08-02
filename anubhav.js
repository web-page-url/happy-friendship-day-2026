/* ===== UTILS & FLAGS ===== */
        const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
        const rand = (a, b) => a + Math.random() * (b - a);
        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const isCoarse = matchMedia('(pointer: coarse)').matches;
        const finePtr = matchMedia('(pointer: fine)').matches;
        const PM = isCoarse ? 0.6 : 1;
        const fmt = n => n.toLocaleString('en-US');

        /* ===== WARM ANALOG AUDIO SYNTHESIZER ===== */
        const snd = (() => {
            let c, muted = false;
            const ensure = () => {
                if (!c) {
                    try { c = new (window.AudioContext || window.webkitAudioContext)() } catch (e) { }
                }
                if (c && c.state === 'suspended') c.resume();
                return c;
            };

            // Filtered Warm Synth Note with Envelope
            function noteAt(f, d, type = 'sine', g = 0.1, t, cutoff = 1400) {
                if (muted || !c || !f) return;
                try {
                    const o = c.createOscillator(), v = c.createGain();
                    const filter = c.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(cutoff, t);
                    filter.frequency.exponentialRampToValueAtTime(cutoff * 0.4, t + d);

                    o.type = type;
                    o.frequency.setValueAtTime(f, t);

                    v.gain.setValueAtTime(0.0001, t);
                    v.gain.linearRampToValueAtTime(g, t + 0.012);
                    v.gain.exponentialRampToValueAtTime(0.0001, t + d);

                    o.connect(filter);
                    filter.connect(v);
                    v.connect(c.destination);

                    o.start(t);
                    o.stop(t + d);
                } catch (e) { }
            }

            function note(f, d = .18, type = 'sine', g = .12, when = 0) {
                const cc = ensure(); if (!cc) return;
                noteAt(f, d, type, g, cc.currentTime + when);
            }

            // Warm Percussion (Kick & Snare)
            function drum(type, t) {
                if (muted || !c) return;
                try {
                    if (type === 'kick') {
                        const o = c.createOscillator(), v = c.createGain();
                        o.frequency.setValueAtTime(110, t);
                        o.frequency.exponentialRampToValueAtTime(32, t + 0.12);
                        v.gain.setValueAtTime(0.3, t);
                        v.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
                        o.connect(v); v.connect(c.destination);
                        o.start(t); o.stop(t + 0.14);
                    } else if (type === 'snare') {
                        const buf = c.createBuffer(1, c.sampleRate * 0.08, c.sampleRate);
                        const d = buf.getChannelData(0);
                        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
                        const src = c.createBufferSource(); src.buffer = buf;
                        const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1200;
                        const v = c.createGain(); v.gain.setValueAtTime(0.08, t); v.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
                        src.connect(f); f.connect(v); v.connect(c.destination);
                        src.start(t);
                    }
                } catch (e) { }
            }

            // Scratch sound synthesized using filtered noise
            function playScratchSound() {
                if (muted || !c) return;
                try {
                    const bufferSize = c.sampleRate * 0.035;
                    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

                    const noise = c.createBufferSource(); noise.buffer = buffer;
                    const filter = c.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 1200 + Math.random() * 600;
                    const gain = c.createGain(); gain.gain.setValueAtTime(0.06, c.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.035);
                    noise.connect(filter); filter.connect(gain); gain.connect(c.destination);
                    noise.start();
                } catch (e) { }
            }

            let hugOsc = null, hugGain = null, hugFilter = null;
            function startHugSynth() {
                const cc = ensure(); if (muted || !cc) return;
                try {
                    hugOsc = cc.createOscillator();
                    hugGain = cc.createGain();
                    hugFilter = cc.createBiquadFilter();
                    hugFilter.type = 'lowpass';
                    hugFilter.frequency.setValueAtTime(400, cc.currentTime);
                    hugOsc.type = 'sine';
                    hugOsc.frequency.setValueAtTime(130, cc.currentTime);
                    hugGain.gain.setValueAtTime(0.02, cc.currentTime);
                    hugGain.gain.linearRampToValueAtTime(0.12, cc.currentTime + 2.5);
                    hugOsc.connect(hugFilter); hugFilter.connect(hugGain); hugGain.connect(cc.destination);
                    hugOsc.start();
                } catch (e) { }
            }

            function updateHugSynth(progress) {
                if (!hugOsc || !c) return;
                try {
                    const f = 130 + progress * 5;
                    hugOsc.frequency.setTargetAtTime(f, c.currentTime, 0.05);
                    if (hugFilter) hugFilter.frequency.setTargetAtTime(400 + progress * 15, c.currentTime, 0.05);
                } catch (e) { }
            }

            function stopHugSynth() {
                if (!hugOsc || !c) return;
                try {
                    hugGain.gain.setTargetAtTime(0.001, c.currentTime, 0.05);
                    setTimeout(() => { try { hugOsc.stop(); hugOsc.disconnect(); } catch (e) { } hugOsc = null; }, 80);
                } catch (e) { }
            }

            return {
                ensure, note, noteAt, drum, get ctx() { return c },
                pop: () => {
                    if (muted || !c) return;
                    const o = c.createOscillator(), v = c.createGain();
                    o.type = 'sine'; o.frequency.setValueAtTime(520, c.currentTime);
                    o.frequency.exponentialRampToValueAtTime(220, c.currentTime + 0.08);
                    v.gain.setValueAtTime(0.15, c.currentTime);
                    v.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08);
                    o.connect(v); v.connect(c.destination); o.start(); o.stop(c.currentTime + 0.08);
                },
                tick: () => note(880, .04, 'sine', .06),
                bead: () => note(523 + Math.random() * 180, .12, 'sine', .12),
                chime: () => [523, 659, 784, 1047].forEach((f, i) => noteAt(f, .3, 'sine', .08, c.currentTime + i * .08, 2000)),
                tada: () => [523, 659, 784, 1047, 1318].forEach((f, i) => noteAt(f, .4, 'triangle', .1, c.currentTime + i * .09, 2400)),
                scratch: playScratchSound,
                startHugSynth, updateHugSynth, stopHugSynth,
                get muted() { return muted },
                toggle() { muted = !muted; return muted }
            };
        })();

        addEventListener('pointerdown', () => snd.ensure(), { passive: true });
        $('#muteBtn').addEventListener('click', e => {
            e.stopPropagation();
            const m = snd.toggle();
            e.currentTarget.textContent = m ? '🔇' : '🔊';
            toast(m ? 'Sound off 🤫' : 'Sound on 🔊');
        });

        /* ===== CONFETTI CANVAS ENGINE ===== */
        const fx = (() => {
            const cv = $('#fx'), cx = cv.getContext('2d');
            let W, H, parts = [], raf = null;
            const COL = ['#FFC94B', '#FF6B4A', '#FF9838', '#17A398', '#FFF4E0', '#FF6584', '#8E5AC8'];
            const EMO = ['💛', '🧡', '✨', '⭐', '🎉', '🫶', '🍕', '🎈'];

            function size() {
                const d = Math.min(devicePixelRatio || 1, isCoarse ? 1.5 : 2);
                W = innerWidth; H = innerHeight;
                cv.width = W * d; cv.height = H * d;
                cx.setTransform(d, 0, 0, d, 0, 0);
            }
            size(); addEventListener('resize', size);

            function burst(x, y, o = {}) {
                const n = Math.round((o.n || 24) * PM), pw = o.power || 7;
                for (let i = 0; i < n; i++) {
                    const a = Math.random() * Math.PI * 2, s = (Math.random() * .6 + .4) * pw;
                    parts.push({
                        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (o.up || 2.5),
                        g: .18 + Math.random() * .08, r: Math.random() * 6.28, vr: (Math.random() - .5) * .3,
                        life: 1, dl: .011 + Math.random() * .013, sz: 4 + Math.random() * 6,
                        c: COL[(Math.random() * COL.length) | 0], t: Math.random() < .28 ? 'e' : 'r',
                        e: EMO[(Math.random() * EMO.length) | 0], sq: Math.random() < .5
                    });
                }
                if (parts.length > 420) parts.splice(0, parts.length - 420);
                if (!raf) raf = requestAnimationFrame(tick);
            }

            function rain(n) {
                n = Math.round(n * PM);
                for (let i = 0; i < n; i++) {
                    parts.push({
                        x: Math.random() * W, y: -20, vx: rand(-1, 1), vy: rand(1, 3),
                        g: .05, r: rand(0, 6), vr: rand(-.2, .2), life: 1, dl: .005,
                        sz: rand(5, 9), c: COL[(Math.random() * COL.length) | 0],
                        t: Math.random() < .4 ? 'e' : 'r', e: EMO[(Math.random() * EMO.length) | 0], sq: Math.random() < .5
                    });
                }
                if (!raf) raf = requestAnimationFrame(tick);
            }

            function tick() {
                raf = null; cx.clearRect(0, 0, W, H);
                parts = parts.filter(p => p.life > 0 && p.y < H + 50);
                for (const p of parts) {
                    p.vy += p.g; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= p.dl;
                    cx.globalAlpha = Math.max(p.life, 0);
                    if (p.t === 'e') {
                        cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r);
                        cx.font = (p.sz * 2.2) + 'px serif'; cx.fillText(p.e, 0, 0); cx.restore();
                    } else {
                        cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c;
                        if (p.sq) cx.fillRect(-p.sz / 2, -p.sz / 2, p.sz, p.sz * .62);
                        else { cx.beginPath(); cx.arc(0, 0, p.sz / 2, 0, 7); cx.fill(); }
                        cx.restore();
                    }
                }
                cx.globalAlpha = 1;
                if (parts.length) raf = requestAnimationFrame(tick);
            }
            return { burst, rain };
        })();

        addEventListener('pointerdown', e => {
            if (e.target.closest('.balloon') || e.target.closest('#scratch') || e.target.closest('button') || e.target.closest('input')) return;
            fx.burst(e.clientX, e.clientY, { n: 8, power: 4.5 });
        }, { passive: true });

        /* ===== TOAST NOTIFICATION ===== */
        let toastT;
        function toast(m) {
            const t = $('#toast'); t.textContent = m; t.classList.add('show');
            clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600);
        }

        /* ===== TICKERS + BUNTING ===== */
        const T1 = "YOU'RE INVITED ✦ FRIENDSHIP DAY BLOCK PARTY ✦ SUNDAY AUG 02 2026 ✦ RSVP: JUST SHOW UP ✦ BRING YOUR BESTIE ✦ SNACKS PROVIDED ✦ ";
        const T2 = "GO HUG YOUR HUMANS ✦ CREATED WITH ❤️ BY ANUBHAV ✦ LAST DANCE AT GOLDEN HOUR ✦ TAG YOUR BESTIE ✦ SEND THE BRACELET ✦ ";
        function fillTicker(id, txt) {
            const el = $(id); let html = ''; for (let i = 0; i < 4; i++) html += '<span>' + txt + '</span>';
            el.innerHTML = html + html;
        }
        fillTicker('#tk1', T1); fillTicker('#tk2', T2);
        const bCols = ['#FFC94B', '#FF6B4A', '#17A398', '#FFF4E0', '#FF9838'], bun = $('#bunting');
        for (let i = 0; i < 22; i++) {
            const f = document.createElement('span'); f.style.background = bCols[i % 5]; f.style.animationDelay = (-i * .18) + 's'; bun.appendChild(f);
        }
        const op = $('.open');
        for (let i = 0; i < 12; i++) {
            const f = document.createElement('i'); f.className = 'fly';
            f.style.left = rand(2, 96) + '%'; f.style.top = rand(6, 78) + '%'; const s = rand(3, 6); f.style.width = f.style.height = s + 'px';
            f.style.animationDuration = rand(5, 11) + 's,' + rand(2, 4) + 's'; f.style.animationDelay = (-rand(0, 8)) + 's,' + (-rand(0, 3)) + 's'; op.appendChild(f);
        }

        /* ===== SUN TAP ===== */
        $('#sun').addEventListener('pointerdown', e => {
            e.stopPropagation(); const s = e.currentTarget, r = s.getBoundingClientRect();
            s.classList.remove('pulse'); void s.offsetWidth; s.classList.add('pulse');
            fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 26, power: 8 }); snd.chime();
        }, { passive: true });

        /* ===== BOOMBOX AUDIO TRACKS (WARM MELODIC HARMONIES) ===== */
        const box = $('#box'), playBtn = $('#playBtn'), trackTitle = $('#trackTitle');
        let playing = false, mStep = 0, mTimer = null, nextT = 0, currentTrack = 0;

        const TRACKS = [
            {
                title: 'TRACK 1: GOLDEN SUNSET 🌇',
                bpm: 110,
                lead: [72, 74, 76, 79, 76, 74, 72, 67, 69, 72, 74, 76, 79, 81, 79, 76],
                chord: [48, 0, 52, 0, 55, 0, 48, 0, 45, 0, 48, 0, 52, 0, 45, 0],
                drums: ['k', '', 's', '', 'k', 'k', 's', '', 'k', '', 's', '', 'k', 'k', 's', '']
            },
            {
                title: 'TRACK 2: LOFI BESTIES ☕',
                bpm: 86,
                lead: [64, 0, 67, 71, 69, 0, 67, 64, 62, 0, 65, 69, 67, 0, 64, 60],
                chord: [48, 52, 55, 0, 45, 48, 52, 0, 41, 45, 48, 0, 43, 47, 50, 0],
                drums: ['k', '', '', '', 's', '', '', '', 'k', '', '', 'k', 's', '', '', '']
            },
            {
                title: 'TRACK 3: BLOCK PARTY BEATS 🕺',
                bpm: 124,
                lead: [76, 76, 79, 76, 72, 74, 76, 0, 79, 79, 81, 79, 76, 74, 72, 0],
                chord: [60, 0, 64, 0, 57, 0, 60, 0, 55, 0, 59, 0, 60, 0, 64, 0],
                drums: ['k', 's', 'k', 's', 'k', 's', 'k', 's', 'k', 's', 'k', 's', 'k', 's', 'k', 's']
            }
        ];

        const freq = m => m ? 440 * Math.pow(2, (m - 69) / 12) : 0;

        function sched() {
            const cc = snd.ctx; if (!cc) return;
            const trk = TRACKS[currentTrack];
            const stepDur = 60 / trk.bpm / 4;

            while (nextT < cc.currentTime + .25) {
                const s = mStep % 16;
                if (trk.lead[s]) {
                    snd.noteAt(freq(trk.lead[s]), stepDur * 1.5, 'sine', 0.08, nextT, 1400);
                }
                if (trk.chord[s]) {
                    snd.noteAt(freq(trk.chord[s]), stepDur * 2.2, 'triangle', 0.06, nextT, 700);
                }
                if (trk.drums && trk.drums[s]) {
                    snd.drum(trk.drums[s] === 'k' ? 'kick' : 'snare', nextT);
                }
                nextT += stepDur; mStep++;
            }
        }

        playBtn.addEventListener('click', e => {
            e.stopPropagation(); playing = !playing; box.classList.toggle('playing', playing);
            if (playing) {
                snd.ensure(); nextT = snd.ctx.currentTime + .06; mStep = 0;
                mTimer = setInterval(sched, 90); playBtn.textContent = '❚❚ PAUSE';
                toast('Party mode: ON 🎶'); snd.chime();
            } else {
                clearInterval(mTimer); playBtn.textContent = '▶ PLAY';
            }
        });

        $('#prevBtn').addEventListener('click', e => {
            e.stopPropagation(); currentTrack = (currentTrack - 1 + TRACKS.length) % TRACKS.length;
            trackTitle.textContent = TRACKS[currentTrack].title; snd.pop(); toast('Switched station 📻');
        });
        $('#nextBtn').addEventListener('click', e => {
            e.stopPropagation(); currentTrack = (currentTrack + 1) % TRACKS.length;
            trackTitle.textContent = TRACKS[currentTrack].title; snd.pop(); toast('Switched station 📻');
        });

        setInterval(() => {
            if (!playing || document.hidden) return; const r = box.getBoundingClientRect();
            const n = document.createElement('span'); n.className = 'mnote';
            n.textContent = ['♪', '♫', '♬', '♩'][(Math.random() * 4) | 0];
            n.style.left = (r.left + r.width * rand(.2, .8)) + 'px'; n.style.top = (r.top - 4) + 'px';
            n.style.setProperty('--dx', rand(-44, 44) + 'px');
            n.style.color = ['#FFC94B', '#FFF4E0', '#FF9838'][(Math.random() * 3) | 0];
            document.body.appendChild(n); setTimeout(() => n.remove(), 2600);
        }, 650);

        /* ===== COUNTDOWN FLIP DIGITS ===== */
        const TARGET = new Date(2026, 7, 2, 0, 0, 0).getTime(), DAY = 864e5;
        const clockEl = $('#clock'), UNITS = [['Days', 3], ['Hrs', 2], ['Min', 2], ['Sec', 2]]; let strips = [];

        UNITS.forEach(([lab, n], u) => {
            const unit = document.createElement('div'); unit.className = 'unit';
            const dg = document.createElement('div'); dg.className = 'digits';
            for (let i = 0; i < n; i++) {
                const d = document.createElement('span'); d.className = 'dg';
                const st = document.createElement('span'); st.className = 'strip';
                for (let k = 0; k < 10; k++) { const c = document.createElement('div'); c.textContent = k; st.appendChild(c); }
                d.appendChild(st); dg.appendChild(d); strips.push(st);
            }
            unit.appendChild(dg); const l = document.createElement('span'); l.className = 'ulab'; l.textContent = lab; unit.appendChild(l); clockEl.appendChild(unit);
            if (u < UNITS.length - 1) { const c = document.createElement('span'); c.className = 'colon'; c.textContent = ':'; clockEl.appendChild(c); }
        });

        let partyMode = false, pastMode = false;
        function cdTick() {
            const now = Date.now(), diff = TARGET - now;
            if (diff <= 0 && now < TARGET + DAY) {
                if (!partyMode) {
                    partyMode = true; $('#party').classList.add('on'); clockEl.style.display = 'none';
                    $('#cdnote').textContent = "It's TODAY — Sunday, August 2nd, 2026. See you at golden hour 🌇";
                    setTimeout(() => { fx.rain(50); snd.tada(); }, 400);
                } return;
            }
            if (now >= TARGET + DAY) {
                if (!pastMode) { pastMode = true; $('#cdnote').textContent = "Countdown's done — but friendship runs 365 days a year 💛"; }
                renderCd(0, 0, 0, 0); return;
            }
            renderCd(Math.floor(diff / DAY), Math.floor(diff % DAY / 36e5), Math.floor(diff % 36e5 / 6e4), Math.floor(diff % 6e4 / 1e3));
        }

        function renderCd(d, h, m, s) {
            const vals = [String(d).padStart(3, '0'), String(h).padStart(2, '0'), String(m).padStart(2, '0'), String(s).padStart(2, '0')];
            let idx = 0; vals.forEach(v => { [...v].forEach(ch => { strips[idx].style.transform = `translateY(${-ch}em)`; idx++; }); });
        }
        cdTick(); setInterval(cdTick, 1000);
        $('#partyBtn').addEventListener('click', e => {
            e.stopPropagation(); for (let i = 0; i < 5; i++) setTimeout(() => fx.burst(rand(innerWidth * .1, innerWidth * .9), rand(60, innerHeight * .5), { n: 30, power: 9 }), i * 180);
            snd.tada(); toast('PARTY MODE: MAXIMUM 🎊');
        });

        /* ===== CREW LINEUP (3D FLIP CARDS) ===== */
        const CREW = [
            { cat: 'chaos', e: '📣', n: 'The Hype Person', d: 'Comments "🔥🔥🔥" within 3 seconds flat.', power: 'Instant 100% Ego Boost', weak: 'Can never keep secrets quiet', move: 'Spamming 50 fire emojis' },
            { cat: 'support', e: '🍟', n: 'The Snack Dealer', d: 'Bag is 90% crumbs, 10% pure gold.', power: 'Infinite Midnight Fries', weak: 'Hates sharing last slice', move: 'Pulling snacks from thin air' },
            { cat: 'support', e: '🛋️', n: 'The Free Therapist', d: 'Says "no literally, SAME" and means it.', power: 'Master of Venting Sessions', weak: 'Forgets to solve own problems', move: 'Nodding thoughtfully' },
            { cat: 'chaos', e: '🌪️', n: 'The Chaos Buddy', d: 'One "wyd" text = 6-hour adventure.', power: 'Instant Spontaneous Trips', weak: 'Zero sense of time', move: 'Sending "get in the car"' },
            { cat: 'support', e: '🌙', n: 'The 3AM Caller', d: 'Deep talks only. Sleep is optional.', power: 'Existential Bonding', weak: 'Asleep at 2 PM next day', move: 'Philosophical questions' },
            { cat: 'chaos', e: '📸', n: 'The Paparazzi', d: 'Owns 4,000 photos of you. All candid.', power: 'Archiving Bestie Memories', weak: 'Threatens un-edited uploads', move: 'Surprise flash photography' },
            { cat: 'chaos', e: '🎧', n: 'The Human Playlist', d: 'Aux cord? Already claimed for life.', power: 'Setting Perfect Party Vibe', weak: 'Skips songs mid-chorus', move: 'Dropping heavy bass drops' },
            { cat: 'support', e: '🧸', n: 'The Day One', d: 'Knows your whole lore. Chapter one.', power: 'Unshakeable Loyalty', weak: 'Brings up embarrassing 2012 memories', move: 'The "remember when" hug' }
        ];

        const sc = $('#crewScroll');
        function renderCrew(filter = 'all') {
            sc.innerHTML = '';
            CREW.forEach((f, i) => {
                if (filter !== 'all' && f.cat !== filter) return;
                const wrap = document.createElement('div'); wrap.className = 'ccard-wrap';
                const c = document.createElement('article'); c.className = 'ccard';
                c.innerHTML = `
                    <div class="ccard-front">
                        <span class="tape"></span>
                        <span class="cnum">0${i + 1}</span>
                        <span class="cemo">${f.e}</span>
                        <h3>${f.n}</h3>
                        <p>${f.d}</p>
                        <span class="flip-hint">↺ Tap to flip card</span>
                    </div>
                    <div class="ccard-back">
                        <span class="cnum">STATS</span>
                        <h3>${f.n}</h3>
                        <div class="cstat">
                            <b>⚡ Superpower:</b> ${f.power}
                            <b>⚠️ Weakness:</b> ${f.weak}
                            <b>💥 Signature Move:</b> ${f.move}
                        </div>
                        <button class="btn btn-gold" style="min-height:36px; padding:.4em .8em; font-size:.78rem; margin-top:.4rem">Draft Player Two 🤝</button>
                    </div>
                `;
                c.addEventListener('click', e => {
                    c.classList.toggle('flipped');
                    snd.chime();
                    if (c.classList.contains('flipped')) {
                        const r = c.getBoundingClientRect();
                        fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 16, power: 6 });
                    }
                });
                wrap.appendChild(c); sc.appendChild(wrap);
            });
        }
        renderCrew();

        $$('.crew-filters .filter-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                $$('.crew-filters .filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderCrew(btn.dataset.filter);
                snd.tick();
            });
        });

        /* ===== BEAD BAR ENHANCEMENTS ===== */
        const BEAD_COLORS = [{ c: '#FF6B4A', e: '🔴' }, { c: '#FF9838', e: '🟠' }, { c: '#FFC94B', e: '🟡' }, { c: '#17A398', e: '🟢' }, { c: '#4FA3D6', e: '🔵' }, { c: '#8E5AC8', e: '🟣' }, { c: '#FFF4E0', e: '⚪' }, { c: '#263143', e: '🖤' }, { c: '#FF6584', e: '🌸' }];
        const CHARMS = ['❤️', '⭐', '😊', '🎵', '✌️', '✨', '🍕', '👑'];
        const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

        let beads = [], currentPaletteTab = 'colors', activeBead = { type: 'color', val: '#FF6B4A' };
        const palette = $('#palette'), board = $('#board');

        function renderPalette() {
            palette.innerHTML = '';
            if (currentPaletteTab === 'colors') {
                BEAD_COLORS.forEach(b => {
                    const btn = document.createElement('button');
                    btn.className = 'bswatch' + (activeBead.val === b.c ? ' sel' : '');
                    btn.style.background = b.c;
                    btn.addEventListener('click', e => {
                        e.stopPropagation(); activeBead = { type: 'color', val: b.c };
                        renderPalette(); snd.tick();
                    });
                    palette.appendChild(btn);
                });
            } else if (currentPaletteTab === 'letters') {
                LETTERS.forEach(l => {
                    const btn = document.createElement('button');
                    btn.className = 'bswatch' + (activeBead.val === l ? ' sel' : '');
                    btn.textContent = l; btn.style.background = '#FFF4E0';
                    btn.addEventListener('click', e => {
                        e.stopPropagation(); activeBead = { type: 'letter', val: l };
                        renderPalette(); snd.tick();
                    });
                    palette.appendChild(btn);
                });
            } else {
                CHARMS.forEach(ch => {
                    const btn = document.createElement('button');
                    btn.className = 'bswatch' + (activeBead.val === ch ? ' sel' : '');
                    btn.textContent = ch; btn.style.background = '#FFF4E0';
                    btn.addEventListener('click', e => {
                        e.stopPropagation(); activeBead = { type: 'charm', val: ch };
                        renderPalette(); snd.tick();
                    });
                    palette.appendChild(btn);
                });
            }
        }

        $('#tabColors').addEventListener('click', () => { currentPaletteTab = 'colors'; $$('.bead-tabs .tab-btn').forEach(b => b.classList.remove('active')); $('#tabColors').classList.add('active'); renderPalette(); });
        $('#tabLetters').addEventListener('click', () => { currentPaletteTab = 'letters'; activeBead = { type: 'letter', val: 'A' }; $$('.bead-tabs .tab-btn').forEach(b => b.classList.remove('active')); $('#tabLetters').classList.add('active'); renderPalette(); });
        $('#tabCharms').addEventListener('click', () => { currentPaletteTab = 'charms'; activeBead = { type: 'charm', val: '❤️' }; $$('.bead-tabs .tab-btn').forEach(b => b.classList.remove('active')); $('#tabCharms').classList.add('active'); renderPalette(); });

        renderPalette();

        const qp = (t, a, c, b) => { const u = 1 - t; return u * u * a + 2 * u * t * c + t * t * b; };

        function renderBoard(popLast) {
            board.innerHTML = ''; const n = beads.length;
            if (!n) { board.innerHTML = '<span class="empty">Pick a color/letter, then tap here to start stringing ✨</span>'; return; }
            beads.forEach((b, i) => {
                const s = document.createElement('span'); s.className = 'bead';
                if (b.type === 'color') s.style.background = b.val;
                else { s.style.background = '#FFF4E0'; s.textContent = b.val; }

                const t = n === 1 ? .5 : i / (n - 1);
                s.style.left = qp(t, 5, 50, 95) + '%'; s.style.top = qp(t, 20, 84, 20) + '%';
                s.style.animation = (popLast && i === n - 1) ? 'beadon .45s cubic-bezier(.3,1.7,.4,1) both' : 'none';
                board.appendChild(s);
            });
        }

        board.addEventListener('click', e => {
            e.stopPropagation();
            if (beads.length >= 14) { toast("Bracelet full — that's a whole arm party! 🎉"); return; }
            beads.push({ ...activeBead }); renderBoard(true); snd.bead();
        });

        $('#bUndo').addEventListener('click', e => { e.stopPropagation(); if (beads.length) { beads.pop(); renderBoard(false); snd.tick(); } });
        $('#bClear').addEventListener('click', e => { e.stopPropagation(); beads = []; renderBoard(false); snd.pop(); });
        $('#bRandom').addEventListener('click', e => {
            e.stopPropagation(); beads = []; renderBoard(false); let k = 0;
            const iv = setInterval(() => {
                const pick = BEAD_COLORS[(Math.random() * BEAD_COLORS.length) | 0].c;
                beads.push({ type: 'color', val: pick }); renderBoard(true); snd.bead();
                if (++k >= 10) clearInterval(iv);
            }, 70);
        });

        $('#bSend').addEventListener('click', e => {
            e.stopPropagation(); if (!beads.length) { toast('String some beads first! 📿'); return; }
            const seq = beads.map(b => b.val).join(' ');
            copyTxt(`📿 Our friendship bracelet: [ ${seq} ]\nHandmade for you on #FriendshipDay2026 💛`);
            fx.burst(innerWidth / 2, innerHeight / 2, { n: 28, power: 8 }); snd.tada();
        });

        $('#bDownloadBeads').addEventListener('click', e => {
            e.stopPropagation(); if (!beads.length) { toast('String some beads first! 📿'); return; }
            // Draw Canvas Image of Bracelet
            const cv = document.createElement('canvas'); cv.width = 600; cv.height = 240;
            const ctx = cv.getContext('2d');
            ctx.fillStyle = '#E9D3AE'; ctx.fillRect(0, 0, 600, 240);
            ctx.strokeStyle = '#263143'; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.arc(300, -80, 260, 0.4 * Math.PI, 0.6 * Math.PI); ctx.stroke();

            beads.forEach((b, i) => {
                const t = beads.length === 1 ? .5 : i / (beads.length - 1);
                const x = qp(t, 30, 300, 570), y = qp(t, 60, 200, 60);
                ctx.fillStyle = b.type === 'color' ? b.val : '#FFF4E0';
                ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#263143'; ctx.lineWidth = 3; ctx.stroke();
                if (b.type !== 'color') {
                    ctx.fillStyle = '#263143'; ctx.font = 'bold 16px "Space Grotesk"';
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.val, x, y);
                }
            });
            ctx.fillStyle = '#263143'; ctx.font = 'bold 18px "Space Grotesk"'; ctx.textAlign = 'center';
            ctx.fillText('FRIENDSHIP DAY \'26 — BRACELET 📿', 300, 215);

            const a = document.createElement('a'); a.download = 'friendship_bracelet.png';
            a.href = cv.toDataURL('image/png'); a.click();
            toast('Bracelet image downloaded! 📸'); snd.tada();
        });

        function copyTxt(t) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(t).then(() => toast('Copied! Now send it 📩')).catch(() => fallbackCopy(t));
            } else fallbackCopy(t);
        }
        function fallbackCopy(t) {
            const ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0';
            document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('Copied! 📩'); } catch (e) { toast('Select & copy manually 🙏'); } ta.remove();
        }

        /* ===== HUG CHAIN WITH AUDIO PITCH GLIDE ===== */
        const HUG_BASE = 1284502; let stored = 0;
        try { stored = +(localStorage.getItem('fd26-hugs') || 0); } catch (e) { }
        let liveExtra = 0, charge = 0, charging = false, chargeRaf = null;
        const hugBtn = $('#hugBtn'), hugLabel = $('#hugLabel'), hugEmoji = $('#hugEmoji');

        function updateHugUI(bump) {
            const v = fmt(HUG_BASE + stored + liveExtra); $('#hugCountTop').textContent = v;
            const b = $('#hugBig'); b.textContent = v;
            if (bump) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
        }
        updateHugUI(false);

        function chargeLoop() {
            if (!charging) return;
            charge = Math.min(100, charge + 2.2);
            hugBtn.style.setProperty('--p', charge);
            snd.updateHugSynth(charge);
            hugEmoji.style.transform = `scale(${1 + (charge / 100) * .9})`;
            hugLabel.textContent = charge < 30 ? 'a lil hug' : charge < 60 ? 'a BIG hug' : charge < 90 ? 'MEGA HUG!!' : 'ULTRA MEGA HUG!!!';
            hugEmoji.textContent = charge < 60 ? '🫂' : charge < 90 ? '💖' : '🌈';
            if (charge >= 99) hugBtn.classList.add('shaking');
            chargeRaf = requestAnimationFrame(chargeLoop);
        }

        function startCharge(e) {
            if (e.pointerType === 'mouse' && e.button !== 0) return; e.preventDefault();
            charging = true; charge = 0; hugBtn.classList.remove('shaking');
            snd.startHugSynth(); chargeLoop();
        }

        function fireHug() {
            if (!charging) return; charging = false;
            cancelAnimationFrame(chargeRaf); snd.stopHugSynth(); hugBtn.classList.remove('shaking');
            const p = charge; charge = 0; hugBtn.style.setProperty('--p', 0);
            hugEmoji.style.transform = ''; hugEmoji.textContent = '🫂'; hugLabel.textContent = 'hold me…';

            const r = hugBtn.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
            const inc = p > 85 ? 10 : p > 50 ? 5 : 1; stored += inc;
            try { localStorage.setItem('fd26-hugs', stored); } catch (e) { }
            updateHugUI(true);

            fx.burst(cx, cy, { n: Math.round(12 + p * .5), power: 5 + p * .07 });
            const plus = document.createElement('span'); plus.className = 'hugplus'; plus.textContent = '+' + inc + ' 🫂';
            plus.style.left = Math.max(10, cx - 30) + 'px'; plus.style.top = (cy - 40) + 'px'; document.body.appendChild(plus);
            setTimeout(() => plus.remove(), 1000);

            if (p > 70) {
                document.body.classList.add('quake'); setTimeout(() => document.body.classList.remove('quake'), 420);
                toast('MEGA HUG DEPLOYED 🌍💥 Someone felt that.');
            } else if (p > 40) toast('Big hug sent! 💛');
        }

        hugBtn.addEventListener('pointerdown', startCharge);
        addEventListener('pointerup', fireHug, { passive: true });
        hugBtn.addEventListener('pointercancel', fireHug);
        hugBtn.addEventListener('contextmenu', e => e.preventDefault());

        /* ===== WALL OF LOVE (CORKBOARD) ===== */
        const DEFAULT_NOTES = [
            { text: "Thanks for always being my 2 AM caller! 🌙", author: "Riya", bg: "#FFF4E0", rot: -2 },
            { text: "Bestie since 2014 and counting! 💖", author: "Virat", bg: "#FFC94B", rot: 3 },
            { text: "Who's buying pizza this Sunday? 🍕", author: "Sam", bg: "#FF6584", rot: -1 }
        ];

        let notes = [...DEFAULT_NOTES], selectedNoteColor = '#FFF4E0';
        const corkboard = $('#corkboard');

        function renderNotes() {
            corkboard.innerHTML = '';
            notes.forEach((n, i) => {
                const el = document.createElement('div'); el.className = 'note-card';
                el.style.background = n.bg; el.style.setProperty('--rot', n.rot + 'deg');
                el.innerHTML = `<span class="pin"></span><p>${n.text}</p><div class="author">— ${n.author}</div>`;
                corkboard.appendChild(el);
            });
        }
        renderNotes();

        $$('#noteColors .color-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                $$('#noteColors .color-dot').forEach(d => d.classList.remove('active'));
                dot.classList.add('active'); selectedNoteColor = dot.dataset.c;
            });
        });

        $('#addNoteBtn').addEventListener('click', e => {
            e.stopPropagation();
            const val = $('#noteInput').value.trim();
            if (!val) { toast('Write a note first! 📌'); return; }
            const author = $('#noteAuthorInput').value.trim() || $('#nameA').value.trim() || 'Bestie';
            notes.unshift({ text: val, author: author, bg: selectedNoteColor, rot: rand(-4, 4) });
            $('#noteInput').value = '';
            renderNotes(); snd.chime(); toast('Note pinned to board! 📌');
        });

        /* ===== FORTUNE SCRATCH CARD ===== */
        const FORTUNES_COMP = [
            "Your bestie was just bragging about you to someone else.",
            "Plot twist: You are legally the favorite friend.",
            "Your loyalty will be repaid in free snacks this month.",
            "Warning: Excessive compliments headed your way!",
            "You are the main character in all your friend group's funniest stories.",
            "Scientists confirm: You give the absolute best advice (even if nobody listens).",
            "You have a 100% success rate of turning bad days into core memories.",
            "Your playlist taste single-handedly saves every road trip vibe.",
            "You're the friend everyone trusts with their secrets and worst photos.",
            "10/10 bestie rating: Excellent listener, certified chaos coordinator.",
            "You are the human equivalent of a warm cup of coffee on a rainy day.",
            "Your laughter is officially contagious. 10 out of 10 doctors agree!",
            "You are the friend who makes 'doing nothing together' feel like the highlight of the week.",
            "Your loyalty rating is literally off the charts. FBI level trustworthy.",
            "You have an unmatchable talent for remembering inside jokes from 6 years ago.",
            "The group chat would be dead silent without your iconic commentary.",
            "If friendship were an Olympic sport, you'd be bringing home gold every single year.",
            "You are the designated vibe-checker and you never miss.",
            "Your energy level when your favorite song comes on is unmatched in human history.",
            "You're the kind of bestie people write songs and make feel-good movies about.",
            "Thank you for existing. Seriously. Life is 100x more fun with you around.",
            "You are 50% chaotic genius, 50% pure golden heart."
        ];
        const FORTUNES_PRED = [
            "Your next inside joke will be the funniest one yet.",
            "A surprise midnight road trip is in your near future.",
            "The group chat will survive another decade. Guaranteed.",
            "You will laugh so hard next week that your stomach hurts.",
            "An unexpected meme sent at 3 AM will solve all your problems.",
            "You and your bestie will accidentally dress in matching outfits soon.",
            "A 2-hour 'quick chat' is scheduled to happen later tonight.",
            "You will discover a new favorite food spot together this weekend.",
            "Someone in the group chat is about to make a chaotic life update.",
            "Future forecast: 100% chance of spontaneous laughter & late-night snacks.",
            "You will look back at this year and realize it was the golden era.",
            "A random song will become your permanent duo anthem by next month.",
            "You and your bestie will spend 45 minutes debating what to eat before picking the usual spot.",
            "A sudden fit of uncontrollable giggles in public is guaranteed within 48 hours.",
            "You will receive a voice note that is over 4 minutes long containing urgent tea.",
            "Your phone battery will drop to 3% because of a late-night deep talk session.",
            "A epic road trip you've been talking about for years is finally getting planned.",
            "You will find money in your jacket pocket right before buying snacks together.",
            "The next reel you send will be re-watched at least 10 times with tears of laughter.",
            "A legendary new inside joke will be born this weekend during a random conversation.",
            "You will both order the exact same drink without even consulting each other.",
            "Your group chat name will be changed to something unhinged by midnight."
        ];
        const FORTUNES_QUEST = [
            "Quest: Text your bestie an embarrassing 2016 photo right now.",
            "Quest: Send a voice note dramatically singing their favorite song.",
            "Quest: Treat them to their favorite iced coffee or boba tomorrow.",
            "Quest: Hug your bestie for a full 10 seconds without laughing!",
            "Quest: Send them a random sticker with zero context and see what happens.",
            "Quest: Plan a 3-song playlist that screams 'OUR ENERGY' and share it.",
            "Quest: Drop a wholesome message telling them why they're awesome.",
            "Quest: Challenge your bestie to a rock-paper-scissors rematch.",
            "Quest: Send them a reel that made you immediately think of them.",
            "Quest: Screenshot this card and send it to your top 3 favorite humans.",
            "Quest: Order pizza or snacks for your next hangout right now!",
            "Quest: Recreate a photo from 5 years ago with the exact same pose.",
            "Quest: Send your bestie an audio message only using your worst fake accent.",
            "Quest: Drop your favorite embarrassing nickname for them in the group chat right now.",
            "Quest: Remind them of that one super iconic thing that happened 3 years ago.",
            "Quest: Send a screenshot of your home screen wallpaper to your best friend.",
            "Quest: Rate your bestie's fashion taste out of 10 in a dramatic text.",
            "Quest: Send a random emoji every 10 minutes until they reply asking if you're okay.",
            "Quest: Promise to treat them to their favorite snacks the next time you meet.",
            "Quest: Send a selfie making the most absurd face you can physically pull.",
            "Quest: Send them a song that always makes you think of your funniest memory together.",
            "Quest: Text 'I have a confession...' and wait 2 minutes before saying 'You're awesome'."
        ];

        let currentCategory = 'comp', lastF = -1, revealed = false, strokeCount = 0, sDown = false;
        const sWrap = $('#scratchWrap'), sCv = $('#scratch'), sCtx = sCv.getContext('2d');
        let lastTouchX = 0, lastTouchY = 0;

        function getActiveFortunes() {
            return currentCategory === 'comp' ? FORTUNES_COMP : currentCategory === 'pred' ? FORTUNES_PRED : FORTUNES_QUEST;
        }

        function setFortune() {
            const list = getActiveFortunes();
            let i; do { i = (Math.random() * list.length) | 0 } while (i === lastF && list.length > 1);
            lastF = i; $('#fortuneText').textContent = '🔮 ' + list[i];
        }

        function drawCoat(w, h) {
            sCtx.globalCompositeOperation = 'source-over'; sCtx.fillStyle = '#263143'; sCtx.fillRect(0, 0, w, h);
            sCtx.save(); sCtx.translate(w / 2, h / 2); sCtx.rotate(-.32); sCtx.fillStyle = 'rgba(255,152,56,.9)';
            for (let x = -w; x < w; x += 34) sCtx.fillRect(x, -h, 14, h * 2); sCtx.restore();
            sCtx.strokeStyle = 'rgba(255,244,224,.85)'; sCtx.lineWidth = 2; sCtx.setLineDash([7, 7]); sCtx.strokeRect(10, 10, w - 20, h - 20); sCtx.setLineDash([]);
            sCtx.fillStyle = '#FFF4E0'; sCtx.textAlign = 'center';
            sCtx.font = '700 ' + Math.min(26, w * .07) + 'px "Space Grotesk"'; sCtx.fillText('SCRATCH HERE ✦', w / 2, h / 2 - 4);
            sCtx.font = '600 ' + Math.min(14, w * .042) + 'px "Space Grotesk"'; sCtx.fillStyle = 'rgba(255,244,224,.85)'; sCtx.fillText('rub with your finger to reveal', w / 2, h / 2 + 22);
        }

        function sizeScratch() {
            const r = sWrap.getBoundingClientRect(); const d = Math.min(devicePixelRatio || 1, 2);
            sCv.width = r.width * d; sCv.height = r.height * d; sCv.style.width = r.width + 'px'; sCv.style.height = r.height + 'px';
            sCtx.setTransform(d, 0, 0, d, 0, 0); drawCoat(r.width, r.height);
        }

        function scratchAt(x, y) {
            const r = sCv.getBoundingClientRect();
            const currX = x - r.left, currY = y - r.top;
            sCtx.globalCompositeOperation = 'destination-out';
            sCtx.lineWidth = 50; sCtx.lineCap = 'round'; sCtx.lineJoin = 'round';
            sCtx.beginPath();
            if (lastTouchX && lastTouchY) {
                sCtx.moveTo(lastTouchX, lastTouchY); sCtx.lineTo(currX, currY); sCtx.stroke();
            } else {
                sCtx.arc(currX, currY, 26, 0, Math.PI * 2); sCtx.fill();
            }
            lastTouchX = currX; lastTouchY = currY;
            snd.scratch();
            if (++strokeCount % 12 === 0) checkReveal();
        }

        function checkReveal() {
            const img = sCtx.getImageData(0, 0, sCv.width, sCv.height); let clear = 0, tot = 0;
            for (let i = 3; i < img.data.length; i += 96) { tot++; if (img.data[i] === 0) clear++; }
            if (clear / tot > .5) reveal();
        }

        function reveal() {
            revealed = true; sCv.style.transition = 'opacity .5s'; sCv.style.opacity = '0'; sCv.style.pointerEvents = 'none';
            const r = sWrap.getBoundingClientRect(); snd.tada(); fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 30, power: 8 });
            $('#newFortune').classList.add('show'); toast('Fortune unlocked 🔮');
        }

        sCv.addEventListener('pointerdown', e => {
            if (revealed) return; e.preventDefault(); sDown = true;
            lastTouchX = 0; lastTouchY = 0; scratchAt(e.clientX, e.clientY);
        });
        sCv.addEventListener('pointermove', e => { if (sDown && !revealed) scratchAt(e.clientX, e.clientY); });
        addEventListener('pointerup', () => { sDown = false; lastTouchX = 0; lastTouchY = 0; }, { passive: true });

        $('#newFortune').addEventListener('click', e => {
            e.stopPropagation(); setFortune(); revealed = false; strokeCount = 0;
            sCv.style.transition = 'none'; sCv.style.opacity = '1'; sCv.style.pointerEvents = 'auto'; sizeScratch();
            e.currentTarget.classList.remove('show'); snd.chime();
        });

        $('#catComp').addEventListener('click', () => { currentCategory = 'comp'; $$('.f-categories .filter-btn').forEach(b => b.classList.remove('active')); $('#catComp').classList.add('active'); setFortune(); sizeScratch(); });
        $('#catPred').addEventListener('click', () => { currentCategory = 'pred'; $$('.f-categories .filter-btn').forEach(b => b.classList.remove('active')); $('#catPred').classList.add('active'); setFortune(); sizeScratch(); });
        $('#catQuest').addEventListener('click', () => { currentCategory = 'quest'; $$('.f-categories .filter-btn').forEach(b => b.classList.remove('active')); $('#catQuest').classList.add('active'); setFortune(); sizeScratch(); });

        setFortune(); sizeScratch();

        /* ===== VIP PASS GENERATOR & PNG DOWNLOAD ENGINE ===== */
        const nA = $('#nameA'), nB = $('#nameB'), passTitleSelect = $('#passTitleSelect'), passThemeSelect = $('#passThemeSelect');
        const passCard = $('#passCard');

        nA.addEventListener('input', updatePassUI);
        nB.addEventListener('input', updatePassUI);
        passTitleSelect.addEventListener('change', updatePassUI);
        passThemeSelect.addEventListener('change', () => {
            passCard.className = 'pass rv in theme-' + passThemeSelect.value;
            if (passThemeSelect.value === 'kraft') passCard.style.background = '#E9D3AE';
            else if (passThemeSelect.value === 'neon') passCard.style.background = '#17A398';
            else if (passThemeSelect.value === 'pink') passCard.style.background = '#FF6584';
            else passCard.style.background = '#FFF4E0';
        });

        function updatePassUI() {
            $('#passA').textContent = nA.value.trim() || 'You';
            $('#passB').textContent = nB.value.trim() || 'Your Bestie';
            $('#passDuoTitle').textContent = passTitleSelect.value;
        }

        function passMsg() {
            const a = nA.value.trim() || 'You', b = nB.value.trim() || 'Your Bestie';
            return `🎫 VIP PASS — Friendship Day Block Party 2026\n${a} + ${b} · ${passTitleSelect.value}\nALL ACCESS · Valid till 3026 🌇🎉`;
        }

        $('#copyBtn').addEventListener('click', e => { e.stopPropagation(); copyTxt(passMsg()); });
        $('#shareBtn').addEventListener('click', e => {
            e.stopPropagation(); const m = passMsg();
            if (navigator.share) { navigator.share({ title: 'Friendship Day \'26 VIP Pass', text: m }).catch(() => { }); } else copyTxt(m);
            fx.burst(innerWidth / 2, innerHeight * .6, { n: 24, power: 7 }); snd.tada();
        });
        $('#waBtn').addEventListener('click', e => { e.stopPropagation(); window.open('https://wa.me/?text=' + encodeURIComponent(passMsg()), '_blank'); snd.chime(); });

        // High-Res Canvas VIP Pass Image Exporter
        $('#downloadPassBtn').addEventListener('click', e => {
            e.stopPropagation();
            const cv = document.createElement('canvas'); cv.width = 700; cv.height = 920;
            const ctx = cv.getContext('2d');
            const name1 = nA.value.trim() || 'YOU';
            const name2 = nB.value.trim() || 'YOUR BESTIE';
            const duo = passTitleSelect.value;

            // Background Card
            ctx.fillStyle = passThemeSelect.value === 'kraft' ? '#E9D3AE' : passThemeSelect.value === 'neon' ? '#17A398' : passThemeSelect.value === 'pink' ? '#FF6584' : '#FFF4E0';
            ctx.fillRect(0, 0, 700, 920);
            ctx.strokeStyle = '#263143'; ctx.lineWidth = 14; ctx.strokeRect(0, 0, 700, 920);

            // Header Banner
            ctx.fillStyle = '#263143'; ctx.fillRect(0, 0, 700, 180);
            ctx.fillStyle = '#FFC94B'; ctx.beginPath(); ctx.arc(350, 45, 24, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#FFF4E0'; ctx.font = 'bold 26px "Space Grotesk"'; ctx.textAlign = 'left';
            ctx.fillText('FRIENDSHIP DAY \'26', 40, 120);
            ctx.textAlign = 'right'; ctx.fillText('VIP PASS', 660, 120);

            // Pass Body Content
            ctx.fillStyle = '#FF6B4A'; ctx.font = 'bold 44px "Anton"'; ctx.textAlign = 'center';
            ctx.fillText(duo, 350, 300);

            ctx.fillStyle = '#263143'; ctx.font = 'bold 54px "Anton"';
            ctx.fillText(`${name1.toUpperCase()} + ${name2.toUpperCase()}`, 350, 430);

            ctx.font = 'bold 22px "Space Grotesk"'; ctx.fillStyle = '#263143';
            ctx.fillText('BACKSTAGE · GROUP CHAT · SNACK TENT', 350, 530);
            ctx.fillText('VALID TILL YEAR 3026', 350, 570);

            // Barcode
            ctx.fillStyle = '#263143';
            for (let i = 80; i < 620; i += Math.random() * 16 + 6) {
                ctx.fillRect(i, 660, Math.random() * 8 + 3, 130);
            }

            ctx.font = 'bold 20px "Space Grotesk"'; ctx.fillText('BESTIE LABS © 2026', 350, 850);

            const a = document.createElement('a'); a.download = `VIP_Pass_${name1}_${name2}.png`;
            a.href = cv.toDataURL('image/png'); a.click();
            toast('VIP Ticket Image Downloaded! 📸'); snd.tada();
        });

        /* ===== FLOATING BALLOONS ===== */
        const BCOL = ['#FFC94B', '#FF6B4A', '#17A398', '#FF9838', '#FF6584']; let nBal = 0; const MAXB = isCoarse ? 3 : 5;
        function spawnBalloon() {
            if (nBal >= MAXB) return; const b = document.createElement('div'); b.className = 'balloon';
            b.style.setProperty('--bc', BCOL[(Math.random() * BCOL.length) | 0]); b.style.left = rand(2, 82) + 'vw';
            b.style.setProperty('--sway', rand(12, 26) + 'px'); b.style.animationDuration = rand(9, 14) + 's';
            b.innerHTML = '<span class="bbody"></span><span class="bstr"></span>'; document.body.appendChild(b); nBal++;
            b.addEventListener('pointerdown', e => {
                e.stopPropagation(); const r = b.getBoundingClientRect();
                fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 14, power: 6 });
                snd.pop(); b.remove(); nBal--;
            }, { passive: true });
            b.addEventListener('animationend', () => { b.remove(); nBal--; });
        }
        if (!reduced) { setTimeout(spawnBalloon, 2500); setInterval(() => { if (!document.hidden) spawnBalloon(); }, isCoarse ? 7500 : 5200); }

        /* ===== SCROLL PROGRESS & REVEALS ===== */
        const fab = $('#fab');
        addEventListener('scroll', () => {
            const h = document.documentElement; const p = h.scrollTop / ((h.scrollHeight - h.clientHeight) || 1);
            $('#pbar').style.width = (p * 100) + '%'; fab.classList.toggle('show', h.scrollTop > 500);
        }, { passive: true });

        fab.addEventListener('click', e => {
            e.stopPropagation(); scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
            fx.burst(innerWidth / 2, innerHeight * .3, { n: 18, power: 7 }); snd.chime();
        });

        const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: .12 });
        $$('.rv').forEach(el => io.observe(el));

        /* ===== NAV SLIDER & SCROLL SPY ===== */
        const navLinks = $$('.nav-link');
        const navContainer = $('#navLinks');
        const sections = $$('section[id], header[id]');

        $('#navPrev')?.addEventListener('click', () => {
            navContainer.scrollBy({ left: -140, behavior: 'smooth' });
        });
        $('#navNext')?.addEventListener('click', () => {
            navContainer.scrollBy({ left: 140, behavior: 'smooth' });
        });

        const navObs = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    navLinks.forEach(link => {
                        const isActive = link.getAttribute('href') === '#' + id;
                        link.classList.toggle('active', isActive);
                        if (isActive) {
                            link.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                        }
                    });
                }
            });
        }, { threshold: 0.25 });
        sections.forEach(s => navObs.observe(s));

        /* ===== WELCOME CONFETTI ===== */
        setTimeout(() => {
            fx.burst(innerWidth * .3, innerHeight * .25, { n: isCoarse ? 24 : 40, power: 8 });
            fx.burst(innerWidth * .72, innerHeight * .32, { n: isCoarse ? 24 : 40, power: 8 });
            snd.tada();
        }, 600);