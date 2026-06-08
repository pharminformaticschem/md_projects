// ============================================================
// components.js (type="text/babel")
// Shared React UI components for GMX modular app.
// Built to preserve earlier contracts while safely extending UI.
// Exports are attached on window.GMX.
// ============================================================

window.GMX = window.GMX || {};

(function () {
    const { useState, useEffect, useMemo, useRef } = React;

    // Register GSAP ScrollTrigger plugin once (safe to call multiple times)
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
    }

    // ── SMALL HELPERS ─────────────────────────────────────────
    function statusClass(status) {
        const s = String(status || '').toUpperCase();
        if (['VERIFIED', 'PAID', 'ACTIVE', 'SUCCESS'].includes(s)) return 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10';
        if (['VERIFICATION_PENDING', 'AWAITING_PAYMENT', 'OTP_SENT', 'PROCESSING'].includes(s)) return 'text-amber-300 border-amber-500/30 bg-amber-500/10';
        if (['REJECTED', 'ERROR', 'FAILED', 'INVALID'].includes(s)) return 'text-red-300 border-red-500/30 bg-red-500/10';
        return 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10';
    }

    // ── ANIMATED BACKGROUND CANVAS ────────────────────────────
    GMX.MolCanvas = function MolCanvas() {
        useEffect(() => {
            const canvas = document.getElementById('mol-canvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            let atoms = [];
            let animationFrameId = null;

            function resize() {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }

            resize();
            window.addEventListener('resize', resize);

            atoms = Array.from({ length: 45 }).map(() => ({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 2 + 1.5,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
            }));

            function animate() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
                ctx.strokeStyle = 'rgba(6, 182, 212, 0.05)';
                ctx.lineWidth = 1;

                atoms.forEach((a, idx) => {
                    a.x += a.vx;
                    a.y += a.vy;
                    if (a.x < 0 || a.x > canvas.width) a.vx *= -1;
                    if (a.y < 0 || a.y > canvas.height) a.vy *= -1;

                    ctx.beginPath();
                    ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
                    ctx.fill();

                    for (let j = idx + 1; j < atoms.length; j++) {
                        const b = atoms[j];
                        const dist = Math.hypot(a.x - b.x, a.y - b.y);
                        if (dist < 110) {
                            ctx.beginPath();
                            ctx.moveTo(a.x, a.y);
                            ctx.lineTo(b.x, b.y);
                            ctx.stroke();
                        }
                    }
                });

                animationFrameId = requestAnimationFrame(animate);
            }

            animate();
            return () => {
                window.removeEventListener('resize', resize);
                if (animationFrameId) cancelAnimationFrame(animationFrameId);
            };
        }, []);

        return null;
    };

    // ── TOOLTIP BUBBLE ───────────────────────────────────────
    GMX.TooltipBubble = function TooltipBubble({ id, active, onToggle, className = '' }) {
        const text = GMX.TOOLTIPS && GMX.TOOLTIPS[id] ? GMX.TOOLTIPS[id] : 'More information.';
        return (
            <div className={`relative inline-block ${className}`}>
                <button
                    type="button"
                    onClick={() => onToggle(active === id ? null : id)}
                    className="text-cyan-400 font-bold text-xs hover:text-white transition"
                    aria-label={`Toggle ${id} help`}
                >
                    ⓘ
                </button>
                {active === id && (
                    <div className="absolute z-50 top-7 left-0 w-72 rounded-xl border border-cyan-500/30 bg-slate-950/95 shadow-2xl p-3 text-[11px] leading-relaxed text-slate-300 font-sans">
                        {text}
                    </div>
                )}
            </div>
        );
    };

    // ── TOP NAVIGATION ───────────────────────────────────────
    GMX.NavBar = function NavBar({ formData = {}, proteins = [] }) {
        return (
            <nav className="border-b border-cyan-500/15 bg-slate-950/80 backdrop-blur-lg sticky top-0 z-50 px-6 py-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-purple-600 flex items-center justify-center font-bold text-white tracking-tighter text-sm">GMX</div>
                        <span className="font-display font-bold text-base tracking-wide text-white truncate">
                            GROMACS <span className="text-cyan-400 font-light">Cloud Workspace with AI</span>
                        </span>
                    </div>

                    <div className="hidden lg:flex items-center gap-8 text-xs font-semibold uppercase tracking-widest text-slate-300">
                        <a href="#pipeline" className="hover:text-cyan-400 transition">Workflow</a>
                        <a href="#submission-console" className="text-cyan-400 font-bold hover:underline transition">Submit your Job</a>
                        <a href="#pricing" className="hover:text-cyan-400 transition">Pricing</a>
                        <a href="#analytics" className="hover:text-purple-400 transition">Analytics</a>
                        <a href="#publications" className="hover:text-cyan-400 transition">Literature</a>
                    </div>

                    <a
                        href={GMX.generateMailtoLink ? GMX.generateMailtoLink(formData, proteins) : '#'}
                        className="text-xs text-slate-300 border border-cyan-500/30 rounded-lg px-3 py-2 bg-cyan-950/50 hover:bg-slate-900 hover:text-cyan-400 transition font-mono shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                    >
                        {GMX.CONTACT?.email || 'support@example.com'}
                    </a>
                </div>
            </nav>
        );
    };

    // ── AUTH PANEL ───────────────────────────────────────────
    GMX.AuthPanel = function AuthPanel({
        authState = 'EMAIL_ENTRY',
        email = '',
        otp = '',
        onEmailChange,
        onOtpChange,
        onRequestOtp,
        onVerifyOtp,
        onResendOtp,
        sessionInfo = null,
        busy = false,
        message = '',
    }) {
        return (
            <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/60 p-6 space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h3 className="text-white font-bold font-display text-xl">Email Verification Gateway</h3>
                        <p className="text-xs text-slate-400 mt-1">Use email first. Returning users can continue without OTP while the remembered session remains valid.</p>
                    </div>
                    <span className={`text-[10px] uppercase tracking-widest font-mono px-2.5 py-1 rounded-full border ${statusClass(authState)}`}>
                        {String(authState).replaceAll('_', ' ')}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Email Address</label>
                        <input
                            type="email"
                            className="input-cyber"
                            placeholder="name@institution.edu"
                            value={email}
                            onChange={e => onEmailChange && onEmailChange(e.target.value)}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={onRequestOtp}
                        disabled={busy || !email}
                        className="btn-action px-5 py-3 rounded-xl font-bold text-white text-xs uppercase tracking-widest disabled:opacity-60 transition-transform hover:-translate-y-0.5 hover:shadow-md hover:shadow-cyan-500/20"
                    >
                        {busy ? 'Processing...' : 'Continue'}
                    </button>
                </div>

                {(authState === 'OTP_SENT' || authState === 'OTP_REQUIRED') && (
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-4 items-end">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Email OTP</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                className="input-cyber"
                                placeholder="Enter 6-digit OTP"
                                value={otp}
                                onChange={e => onOtpChange && onOtpChange(e.target.value)}
                            />
                        </div>
                        <button type="button" onClick={onVerifyOtp} disabled={busy || otp.length < 4} className="btn-action px-5 py-3 rounded-xl font-bold text-white text-xs uppercase tracking-widest disabled:opacity-60 transition-transform hover:-translate-y-0.5 hover:shadow-md hover:shadow-cyan-500/20">
                            Verify OTP
                        </button>
                        <button type="button" onClick={onResendOtp} disabled={busy || !email} className="px-5 py-3 rounded-xl border border-slate-700 text-slate-300 text-xs uppercase tracking-widest hover:border-cyan-500/40 hover:text-white transition disabled:opacity-60">
                            Resend
                        </button>
                    </div>
                )}

                {message && <div className="text-xs text-slate-300 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">{message}</div>}

                {sessionInfo && (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-200">
                        Verified session active for <strong>{sessionInfo.email}</strong> · valid until {sessionInfo.expiresAt ? new Date(sessionInfo.expiresAt).toLocaleDateString() : '—'}
                    </div>
                )}
            </div>
        );
    };

    // ── PROFILE PREFILL CARD ─────────────────────────────────
    GMX.ProfilePrefillCard = function ProfilePrefillCard({ profile = null, onApply, onEdit }) {
        if (!profile) return null;
        return (
            <div className="rounded-2xl border border-purple-500/20 bg-slate-950/60 p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h4 className="text-white font-bold text-base">Returning Researcher Profile Detected</h4>
                        <p className="text-xs text-slate-400 mt-1">Saved non-project details can be applied instantly and edited later.</p>
                    </div>
                    <span className="text-[10px] px-2.5 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 uppercase tracking-widest font-mono">Autofill Ready</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3 text-slate-300"><span className="text-slate-500">Name:</span> {profile.fullName || '—'}</div>
                    <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3 text-slate-300"><span className="text-slate-500">Institution:</span> {profile.institution || '—'}</div>
                    <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3 text-slate-300"><span className="text-slate-500">Designation:</span> {profile.designation || '—'}</div>
                    <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3 text-slate-300"><span className="text-slate-500">Phone:</span> {profile.countryCode || ''} {profile.phone || '—'}</div>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={onApply} className="btn-action px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-white transition-transform hover:-translate-y-0.5 hover:shadow-md hover:shadow-cyan-500/20">Apply Saved Details</button>
                    <button type="button" onClick={onEdit} className="px-4 py-3 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold uppercase tracking-widest hover:text-white hover:border-slate-600 transition">Review / Edit</button>
                </div>
            </div>
        );
    };

    // ── PLAN PICKER ──────────────────────────────────────────
    // ScrollTrigger: fades in the whole picker block, then staggers each plan card.
    GMX.PlanPicker = function PlanPicker({ selectedPlanId, onSelect, includeApo, onToggleApo }) {
        const plans = GMX.MD_PLANS || [];
        const pickerRef = useRef(null);

        useEffect(() => {
            if (typeof gsap === 'undefined' || !pickerRef.current) return;
            const ctx = gsap.context(() => {
                // Fade-in + translate the whole picker block
                gsap.from(pickerRef.current, {
                    opacity: 0,
                    y: 50,
                    duration: 0.85,
                    ease: 'power3.out',
                    scrollTrigger: {
                        trigger: pickerRef.current,
                        start: 'top 88%',
                        toggleActions: 'play none none none',
                    },
                });
                // Stagger the individual plan cards
                gsap.from('.plan-picker-card', {
                    opacity: 0,
                    y: 25,
                    duration: 0.55,
                    stagger: 0.1,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: pickerRef.current,
                        start: 'top 85%',
                        toggleActions: 'play none none none',
                    },
                });
            }, pickerRef);
            return () => ctx.revert();
        }, []);

        return (
            <div ref={pickerRef} className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h4 className="text-white font-bold text-sm uppercase tracking-widest font-mono">Simulation Plan Builder</h4>
                        <p className="text-xs text-slate-400 mt-1">Select a run bundle first, then add apoprotein if required.</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {plans.map(plan => {
                        const active = selectedPlanId === plan.id;
                        return (
                            <button
                                key={plan.id}
                                type="button"
                                onClick={() => onSelect && onSelect(plan.id)}
                                className={`plan-picker-card rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:shadow-cyan-500/20 ${active ? 'border-cyan-400/60 bg-cyan-500/10 shadow-[0_0_18px_rgba(6,182,212,0.18)]' : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'}`}
                            >
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <div className={`text-sm font-bold ${active ? 'text-cyan-200' : 'text-white'}`}>{plan.label}</div>
                                    {plan.badge && <span className="text-[9px] px-2 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 uppercase tracking-widest font-mono">{plan.badge}</span>}
                                </div>
                                <div className="text-xs text-slate-300">{plan.tag}</div>
                                <div className="text-[10px] text-slate-500 mt-2">{plan.tip}</div>
                            </button>
                        );
                    })}
                </div>

                <button
                    type="button"
                    onClick={onToggleApo}
                    className={`w-full rounded-2xl border p-4 flex items-start justify-between gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm hover:shadow-purple-500/20 ${includeApo ? 'border-purple-400/60 bg-purple-500/10' : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'}`}
                >
                    <div className="flex items-start gap-3 text-left">
                        <span className={`mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center ${includeApo ? 'bg-purple-500 border-purple-400' : 'border-slate-600 bg-slate-900'}`}>
                            {includeApo && <span className="text-white text-[9px] font-bold">✓</span>}
                        </span>
                        <div>
                            <div className={`text-sm font-bold ${includeApo ? 'text-purple-300' : 'text-slate-300'}`}>{GMX.APO_ADDON?.label || 'Apoprotein Run'}</div>
                            <div className="text-xs text-slate-400 mt-1">{GMX.APO_ADDON?.tip || 'Optional ligand-free protein dynamics reference.'}</div>
                        </div>
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 whitespace-nowrap">+{GMX.APO_ADDON?.extraRuns || 1} Run</span>
                </button>
            </div>
        );
    };

    // ── PAYMENT PANEL ────────────────────────────────────────
    GMX.PaymentPanel = function PaymentPanel({ payment = null, instructions = null, onMarkPaid, onRetry }) {
        if (!instructions) return null;

        return (
            <div className="rounded-2xl border border-emerald-500/20 bg-slate-950/70 p-6 space-y-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h4 className="text-white font-bold text-lg">Payment Console</h4>
                        <p className="text-xs text-slate-400 mt-1">Use UPI QR for Indian users or bank transfer fallback. Access remains under verification until approved.</p>
                    </div>
                    <span className={`text-[10px] uppercase tracking-widest font-mono px-2.5 py-1 rounded-full border ${statusClass(payment?.status || 'AWAITING_PAYMENT')}`}>
                        {String(payment?.status || 'AWAITING_PAYMENT').replaceAll('_', ' ')}
                    </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 items-start">
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 flex flex-col items-center text-center gap-3">
                        <div className="text-[10px] uppercase tracking-widest font-mono text-slate-500">UPI QR</div>
                        <img
                            src={instructions.upiQrImage}
                            alt="UPI QR code"
                            className="w-40 h-40 rounded-xl border border-slate-800 object-cover bg-white"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                        <div className="text-xs text-slate-300 font-mono break-all">{instructions.upiId}</div>
                        <div className="text-[11px] text-slate-500">Ref: {instructions.paymentReference}</div>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-slate-300"><span className="text-slate-500">Payee:</span> {instructions.payeeName}</div>
                            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-slate-300"><span className="text-slate-500">Amount:</span> ₹{Number(instructions.amountInr || 0).toLocaleString()}</div>
                            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-slate-300"><span className="text-slate-500">Bank:</span> {instructions.bankName}</div>
                            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-slate-300"><span className="text-slate-500">IFSC:</span> {instructions.bankIfsc}</div>
                            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-slate-300"><span className="text-slate-500">Account:</span> {instructions.bankAccount}</div>
                            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-slate-300"><span className="text-slate-500">Note:</span> {instructions.note}</div>
                        </div>

                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-100">
                            Clicking "I Have Paid" does not auto-approve the job. It only places the payment into verification review.
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button type="button" onClick={onMarkPaid} className="btn-action px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-white transition-transform hover:-translate-y-0.5 hover:shadow-md hover:shadow-cyan-500/20">I Have Paid</button>
                            <button type="button" onClick={onRetry} className="px-4 py-3 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold uppercase tracking-widest hover:text-white hover:border-slate-600 transition">Attempt Payment Again</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // ── PDB SUMMARY PANEL ────────────────────────────────────
    GMX.PdbSummaryPanel = function PdbSummaryPanel({ profile = null, selectedChains = [], onToggleChain }) {
        if (!profile) return null;
        return (
            <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/70 p-5 space-y-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h4 className="text-white font-bold text-base">PDB Structural Summary</h4>
                        <p className="text-xs text-slate-400 mt-1">Waters and simple ions are hidden conceptually; focus on chains, ligands, and cofactors.</p>
                    </div>
                    <span className="text-[10px] uppercase tracking-widest font-mono px-2.5 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">{profile.pdbId}</span>
                </div>

                {!!profile.title && <div className="text-sm text-slate-300">{profile.title}</div>}

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                    <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3 text-slate-300"><span className="text-slate-500">Chains:</span> {profile.displaySummary?.chainCount ?? 0}</div>
                    <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3 text-slate-300"><span className="text-slate-500">Ligands:</span> {profile.displaySummary?.ligandCount ?? 0}</div>
                    <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3 text-slate-300"><span className="text-slate-500">Cofactors:</span> {profile.displaySummary?.cofactorCount ?? 0}</div>
                    <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3 text-slate-300"><span className="text-slate-500">Waters hidden:</span> {profile.displaySummary?.waterCount ?? 0}</div>
                    <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3 text-slate-300"><span className="text-slate-500">Ions hidden:</span> {profile.displaySummary?.ionCount ?? 0}</div>
                </div>

                <div className="space-y-3">
                    <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Select Chains</div>
                    <div className="flex flex-wrap gap-2">
                        {(profile.chains || []).map(chain => {
                            const key = chain.authAsymId || chain.asymId;
                            const active = selectedChains.includes(key);
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => onToggleChain && onToggleChain(key)}
                                    className={`px-3 py-2 rounded-xl border text-xs transition ${active ? 'border-cyan-400/50 bg-cyan-500/10 text-cyan-200' : 'border-slate-800 bg-slate-900/50 text-slate-300 hover:border-slate-700'}`}
                                >
                                    {chain.label} · {chain.description}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                        <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-2">Ligands</div>
                        <div className="space-y-2 text-slate-300 max-h-40 overflow-auto">
                            {(profile.ligands || []).length ? profile.ligands.map((x, i) => <div key={`${x.compId}-${i}`}>{x.compId} · {x.name} {x.chain ? `(Chain ${x.chain})` : ''}</div>) : <div className="text-slate-500">No ligand record found.</div>}
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                        <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-2">Cofactors</div>
                        <div className="space-y-2 text-slate-300 max-h-40 overflow-auto">
                            {(profile.cofactors || []).length ? profile.cofactors.map((x, i) => <div key={`${x.compId}-${i}`}>{x.compId} · {x.name} {x.chain ? `(Chain ${x.chain})` : ''}</div>) : <div className="text-slate-500">No cofactor record found.</div>}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // ── VIEWER PANEL ─────────────────────────────────────────
    GMX.ViewerPanel = function ViewerPanel({ containerId = 'ngl-viewer', viewerState = null, gridSpec = null }) {
        return (
            <div className="rounded-2xl border border-purple-500/20 bg-slate-950/70 p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h4 className="text-white font-bold text-base">Protein-Ligand Visualizer</h4>
                        <p className="text-xs text-slate-400 mt-1">Viewer container for chain-focused structural review and docking grid planning.</p>
                    </div>
                    <span className={`text-[10px] uppercase tracking-widest font-mono px-2.5 py-1 rounded-full border ${viewerState?.mounted ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' : 'text-slate-300 border-slate-700 bg-slate-900/80'}`}>
                        {viewerState?.mounted ? 'Viewer Active' : 'Viewer Idle'}
                    </span>
                </div>

                <div id={containerId} className="w-full h-[360px] rounded-2xl border border-slate-800 bg-[#02050e] overflow-hidden flex items-center justify-center text-slate-500 text-xs font-mono">
                    NGL viewer will mount here
                </div>

                {gridSpec && (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-xs text-slate-300 font-mono">
                        {gridSpec.overlayText}
                    </div>
                )}
            </div>
        );
    };

    // ── ANALYTICS SECTION ────────────────────────────────────
    // ScrollTrigger: the whole section fades up, then analytics cards stagger in.
    GMX.AnalyticsSection = function AnalyticsSection() {
        const cards = GMX.ANALYTICS_CARDS || [];
        const sectionRef = useRef(null);

        useEffect(() => {
            if (typeof gsap === 'undefined' || !sectionRef.current) return;
            const ctx = gsap.context(() => {
                // Section container fades up first
                gsap.from(sectionRef.current, {
                    opacity: 0,
                    y: 50,
                    duration: 0.9,
                    ease: 'power3.out',
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: 'top 85%',
                        toggleActions: 'play none none none',
                    },
                });
                // Each card staggers in behind the section
                gsap.from('.analytics-card', {
                    opacity: 0,
                    y: 30,
                    duration: 0.6,
                    stagger: 0.1,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: 'top 80%',
                        toggleActions: 'play none none none',
                    },
                });
            }, sectionRef);
            return () => ctx.revert();
        }, []);

        return (
            <section id="analytics" ref={sectionRef} className="space-y-8">
                <div className="border-l-2 border-cyan-400 pl-4">
                    <h2 className="font-display text-2xl font-bold text-white">Automated Comprehensive Analytics Suite</h2>
                    <p className="text-xs text-slate-400 mt-0.5">High-resolution scientific metrics are automatically synthesized and outputted directly inside your complete production bundle at no extra charge.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cards.map((card, idx) => (
                        <div key={idx} className="analytics-card rounded-2xl bg-slate-950/90 border border-slate-800 overflow-hidden flex flex-col justify-between p-5 relative">
                            <div className="text-[10px] font-mono text-slate-500 uppercase flex justify-between">
                                <span>{card.label}</span>
                                <span className="text-cyan-500 text-[9px]">🔍 Click to zoom</span>
                            </div>
                            <div className="my-6 border border-slate-900/60 aspect-video rounded-xl bg-slate-950/40 overflow-hidden">
                                <a href={card.orig} target="_blank" rel="noopener noreferrer" className="cursor-zoom-in block w-full h-full">
                                    <img src={card.thumb} alt={card.alt} loading="lazy" className="w-full h-full object-cover transition duration-300 hover:scale-105" onError={(e) => { e.target.style.display = 'none'; }} />
                                </a>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-200">{card.title}</h4>
                                <p className="text-xs text-cyan-400 font-mono mt-0.5">{card.sub}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        );
    };

    // ── PUBLICATIONS SECTION ─────────────────────────────────
    GMX.PublicationsSection = function PublicationsSection() {
        const items = GMX.PUBLICATIONS || [];
        return (
            <section id="publications" className="space-y-8">
                <div className="border-l-2 border-purple-400 pl-4">
                    <h2 className="font-display text-2xl font-bold text-white">Peer-Reviewed Validation Proof</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Established molecular docking and GROMACS methodology architectures published with <strong>Dr. Ravi Rawat</strong> as Lead Corresponding Author (*).</p>
                </div>
                <div className="space-y-4 max-w-6xl">
                    {items.map((item, idx) => {
                        const parts = String(item.cite || '').split('Ravi Rawat*');
                        return (
                            <div key={idx} className="p-4 rounded-xl bg-slate-950/40 border border-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                                <p className="text-slate-300 leading-relaxed flex-1">
                                    <span className="text-slate-600 font-mono inline-block w-6 font-bold">{idx + 1}.</span>
                                    {parts[0] || ''}<strong className="text-white underline">Ravi Rawat*</strong>{parts[1] || ''}
                                </p>
                                <div className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-mono text-[10px] px-2 py-0.5 rounded font-bold whitespace-nowrap">Impact Factor: {item.factor}</div>
                            </div>
                        );
                    })}
                </div>
            </section>
        );
    };

    // ── FAQ SECTION ──────────────────────────────────────────
    GMX.FaqSection = function FaqSection() {
        const faqs = GMX.FAQS || [];
        return (
            <section id="faqs" className="max-w-5xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                    <h2 className="font-display text-2xl font-bold text-white">Operational Framework FAQ</h2>
                    <p className="text-xs text-slate-400">Clear scientific guidelines across Docking and Dynamics workflows.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed">
                    {faqs.map((faq, idx) => (
                        <div key={idx} className="p-5 rounded-2xl bg-slate-950/80 border border-slate-900 space-y-3">
                            <h4 className="font-bold text-cyan-400 uppercase tracking-wide">{faq.q}</h4>
                            {faq.preamble && <p className="text-slate-400">{faq.preamble}</p>}
                            {faq.bullets && (
                                <ul className="space-y-2 pl-2 border-l border-cyan-500/20 text-slate-300 font-sans">
                                    {faq.bullets.map((b, i) => <li key={i} dangerouslySetInnerHTML={{ __html: b }} />)}
                                </ul>
                            )}
                            {faq.body && <p className="text-slate-400">{faq.body}</p>}
                        </div>
                    ))}
                </div>
            </section>
        );
    };

    // ── FOOTER ───────────────────────────────────────────────
    GMX.Footer = function Footer({ formData = {}, proteins = [], ligands = [] }) {
        return (
            <>
                <div className="fixed bottom-6 right-6 z-50">
                    <a
                        href={GMX.generateWhatsappLink ? GMX.generateWhatsappLink(formData, proteins, ligands) : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-3.5 rounded-full shadow-xl transition text-xs tracking-wider uppercase"
                    >
                        <span className="h-2 w-2 rounded-full bg-white animate-ping"></span>
                        WhatsApp Assistance Desk
                    </a>
                </div>

                <footer className="border-t border-slate-900 bg-slate-950 text-[11px] text-slate-500 py-10 text-center px-6">
                    <p className="max-w-xl mx-auto mb-1.5">GROMACS Cloud Workspace with AI is an independent structural chemistry processing pipeline console.</p>
                    <p>
                        © 2026 GROMACS Cloud Workspace with AI. Built and used under supervision of{' '}
                        <a href={GMX.generateMailtoLink ? GMX.generateMailtoLink(formData || {}, proteins || []) : '#'} className="text-slate-400 hover:text-cyan-400 underline transition">Dr. Ravi Rawat</a>.
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-4 text-[10px] font-mono text-slate-600">
                        <a href="#pipeline" className="hover:text-slate-400 transition">Pipeline</a>
                        <a href="#submission-console" className="hover:text-slate-400 transition">Submit Job</a>
                        <a href="#pricing" className="hover:text-slate-400 transition">Pricing</a>
                        <a href="#analytics" className="hover:text-slate-400 transition">Analytics</a>
                        <a href="#publications" className="hover:text-slate-400 transition">Literature</a>
                        <a href="#faqs" className="hover:text-slate-400 transition">FAQ</a>
                    </div>
                </footer>
            </>
        );
    };

    // ── MOLECULE SKETCHER MODAL ──────────────────────────────
    GMX.SketcherModal = function SketcherModal({ show, onClose, onExtract }) {
        if (!show) return null;

        const extractCurrent = () => {
            const input = document.getElementById('mock-smiles-buffer');
            const val = input ? input.value : '';
            if (onExtract) onExtract(val);
        };

        return (
            <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-6 max-w-xl w-full space-y-4 shadow-2xl">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <h4 className="text-sm font-mono font-bold text-white">JSME Interactive Molecule Builder</h4>
                        <button type="button" onClick={onClose} className="text-xs text-slate-400 hover:text-white font-mono">✕ Close</button>
                    </div>

                    <div className="aspect-video w-full bg-slate-950 border border-slate-800 rounded-xl flex flex-col items-center justify-center text-xs text-slate-500 font-mono p-4 relative gap-2">
                        <p>Sketcher integration placeholder active.</p>
                        <p className="text-[10px] text-slate-600 text-center">Replace this with real JSME/Ketcher mount when ready. Current fallback preserves form flow.</p>
                        <div className="absolute bottom-4 left-4 right-4">
                            <input id="mock-smiles-buffer" type="text" className="input-cyber text-center font-mono py-1 text-xs" placeholder="[SMILES output]" defaultValue="CC(=O)NC1=CC=C(C=C1)O" />
                        </div>
                    </div>

                    <button type="button" onClick={extractCurrent} className="w-full btn-action py-3 rounded-xl font-bold text-white text-xs uppercase tracking-widest transition-transform hover:-translate-y-0.5 hover:shadow-md hover:shadow-cyan-500/20">
                        ✔ Extract SMILES to Ligand Row
                    </button>
                </div>
            </div>
        );
    };

    // ── PIPELINE SECTION ─────────────────────────────────────
    // ScrollTrigger: the section header fades up, then each step card staggers in.
    GMX.PipelineSection = function PipelineSection() {
        const sectionRef = useRef(null);

        useEffect(() => {
            if (typeof gsap === 'undefined' || !sectionRef.current) return;
            const ctx = gsap.context(() => {
                // Whole section translates up on scroll-in
                gsap.from(sectionRef.current, {
                    opacity: 0,
                    y: 50,
                    duration: 0.9,
                    ease: 'power3.out',
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: 'top 85%',
                        toggleActions: 'play none none none',
                    },
                });
                // Step cards stagger in
                gsap.from('.pipeline-step-card', {
                    opacity: 0,
                    y: 30,
                    duration: 0.6,
                    stagger: 0.12,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: 'top 80%',
                        toggleActions: 'play none none none',
                    },
                });
            }, sectionRef);
            return () => ctx.revert();
        }, []);

        const steps = [
            {
                icon: '🔬',
                num: '01',
                title: 'Protein Preparation',
                desc: 'PDB code or file upload. Multi-chain support with ligand/cofactor detection. Automatic protonation using AMBER14sb + TIP3P water model.',
                tag: 'Input',
                accent: 'border-cyan-500/30 hover:border-cyan-500/60 hover:shadow-cyan-500/10',
            },
            {
                icon: '🧪',
                num: '02',
                title: 'Ligand Parameterization',
                desc: 'SMILES, SDF, or sketched structures. GAFF2 force-field via Antechamber. AM1-BCC partial charge generation with OpenBabel geometry optimization.',
                tag: 'Chemistry',
                accent: 'border-purple-500/30 hover:border-purple-500/60 hover:shadow-purple-500/10',
            },
            {
                icon: '⚙️',
                num: '03',
                title: 'Docking & Pose Ranking',
                desc: 'AutoDock Vina 1.2 with Exhaustiveness-32. Top-N poses RMSD-clustered. Best binding pose auto-selected as the MD simulation seed.',
                tag: 'Docking',
                accent: 'border-amber-500/30 hover:border-amber-500/60 hover:shadow-amber-500/10',
            },
            {
                icon: '🚀',
                num: '04',
                title: 'MD Production Run',
                desc: 'Full GROMACS 2024 solvated NPT equilibration followed by production MD. Scalable from 100 ps to 1 µs per trajectory.',
                tag: 'Dynamics',
                accent: 'border-emerald-500/30 hover:border-emerald-500/60 hover:shadow-emerald-500/10',
            },
            {
                icon: '📊',
                num: '05',
                title: 'AI Analytics Report',
                desc: 'Auto-computed RMSD, RMSF, Rg, PCA, FEL, H-bond, MM-PBSA/GBSA. LLM-generated multimodal PDF report with trajectory visualizations.',
                tag: 'Output',
                accent: 'border-cyan-500/30 hover:border-cyan-400/60 hover:shadow-cyan-500/10',
            },
        ];

        return (
            <section id="pipeline" ref={sectionRef} className="space-y-10">
                <div className="border-l-2 border-purple-400 pl-4">
                    <h2 className="font-display text-2xl font-bold text-white">End-to-End Automated Pipeline</h2>
                    <p className="text-xs text-slate-400 mt-0.5">From receptor PDB ID to publication-ready MD report — fully automated with Human-in-the-Loop validation at every key checkpoint.</p>
                </div>

                <div className="relative">
                    {/* Subtle connector line visible on desktop */}
                    <div className="hidden lg:block absolute top-8 left-8 right-8 h-px bg-gradient-to-r from-transparent via-slate-700/60 to-transparent pointer-events-none" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                        {steps.map((step, idx) => (
                            <div
                                key={idx}
                                className={`pipeline-step-card relative rounded-2xl bg-slate-950/80 border p-5 flex flex-col gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${step.accent}`}
                            >
                                {/* Step number watermark */}
                                <div className="absolute top-3 right-4 text-[10px] font-mono text-slate-700 font-bold select-none">{step.num}</div>

                                <span className="text-2xl">{step.icon}</span>

                                <div className="space-y-1.5">
                                    <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 px-2 py-0.5 bg-slate-900 rounded-full w-fit block border border-slate-800">{step.tag}</span>
                                    <h4 className="text-sm font-bold text-white leading-tight">{step.title}</h4>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>

                                {/* Active connector dot (desktop) */}
                                <div className="hidden lg:block absolute -right-2.5 top-6 h-4 w-4 rounded-full bg-slate-900 border border-slate-700 z-10 last:hidden" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom summary strip */}
                <div className="flex flex-wrap items-center justify-center gap-6 p-4 rounded-2xl bg-slate-950/60 border border-slate-900 text-[11px] font-mono text-slate-500">
                    <span className="text-cyan-400 font-bold">AutoDock Vina 1.2</span>
                    <span className="text-slate-700">·</span>
                    <span className="text-purple-400 font-bold">GROMACS 2024</span>
                    <span className="text-slate-700">·</span>
                    <span>AMBER14sb + GAFF2</span>
                    <span className="text-slate-700">·</span>
                    <span>AM1-BCC Charges</span>
                    <span className="text-slate-700">·</span>
                    <span className="text-emerald-400 font-bold">ROCm Radeon™ GPU Accelerated</span>
                    <span className="text-slate-700">·</span>
                    <span>LLM Report Generation</span>
                </div>
            </section>
        );
    };

    // ── PRICING TABLE SECTION ────────────────────────────────
    // Displays MD plans from GMX.MD_PLANS with hover micro-interactions on cards and CTA buttons.
    GMX.PricingTableSection = function PricingTableSection() {
        const plans = GMX.MD_PLANS || [];

        return (
            <section id="pricing" className="space-y-10">
                <div className="border-l-2 border-cyan-400 pl-4">
                    <h2 className="font-display text-2xl font-bold text-white">Transparent Simulation Pricing</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Scholar discount auto-applied. All plans include full analytics suite (RMSD, RMSF, PCA, FEL, H-bond, MM-PBSA) and an LLM-generated multimodal report.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {plans.map((plan, idx) => (
                        <div
                            key={plan.id || idx}
                            className="group relative rounded-2xl bg-slate-950/90 border border-slate-800 p-6 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/20 cursor-default"
                        >
                            {plan.badge && (
                                <span className="absolute top-4 right-4 text-[9px] px-2 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 uppercase tracking-widest font-mono">
                                    {plan.badge}
                                </span>
                            )}

                            <div className="space-y-1">
                                <h3 className="font-display text-lg font-bold text-white group-hover:text-cyan-100 transition-colors duration-200">{plan.label}</h3>
                                <p className="text-xs text-cyan-400 font-mono">{plan.tag}</p>
                            </div>

                            <div className="space-y-0 text-xs flex-1">
                                <div className="flex justify-between items-center py-2 border-b border-slate-900/80">
                                    <span className="text-slate-500">Test Ligands</span>
                                    <span className="font-bold text-white font-mono">{plan.testRuns}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-900/80">
                                    <span className="text-slate-500">Control Runs</span>
                                    <span className="font-bold text-white font-mono">{plan.controlRuns}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-900/80">
                                    <span className="text-slate-500">Total MD Runs</span>
                                    <span className="font-bold text-cyan-300 font-mono">{plan.totalRuns}</span>
                                </div>
                                <div className="pt-3 space-y-1.5 text-[11px] text-slate-500 leading-relaxed">
                                    <div className="flex items-start gap-1.5"><span className="text-emerald-500 mt-0.5">✓</span><span>Full analytics suite included</span></div>
                                    <div className="flex items-start gap-1.5"><span className="text-emerald-500 mt-0.5">✓</span><span>LLM multimodal report</span></div>
                                    <div className="flex items-start gap-1.5"><span className="text-emerald-500 mt-0.5">✓</span><span>Raw trajectory outputs</span></div>
                                    {plan.tip && <p className="text-slate-600 italic pt-1">{plan.tip}</p>}
                                </div>
                            </div>

                            <a
                                href="#submission-console"
                                className="block w-full text-center py-3 rounded-xl btn-action font-bold text-white text-xs uppercase tracking-widest transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-cyan-500/20"
                            >
                                Select Plan →
                            </a>
                        </div>
                    ))}
                </div>

                {/* Pricing note and custom quote CTA */}
                <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                        <h4 className="text-sm font-bold text-white">Need a custom-scale run?</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">For large compound libraries, multi-target campaigns, µs-scale trajectories, or institutional bulk pricing — request a tailored quote directly.</p>
                    </div>
                    <a
                        href={GMX.generateWhatsappLink ? GMX.generateWhatsappLink({}, [], []) : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 py-3 px-5 rounded-xl border border-emerald-500/30 bg-emerald-600/10 text-emerald-400 text-xs font-mono font-bold transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-600/20 hover:shadow-md hover:shadow-emerald-500/20 whitespace-nowrap"
                    >
                        💬 Request Custom Quote
                    </a>
                </div>

                {/* Scholar discount reminder */}
                <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/15 text-[11px] font-mono text-slate-400 text-center">
                    <span className="text-cyan-400 font-bold">Scholar Discount</span> is automatically applied at checkout. Final price depends on atom count, trajectory duration, and your institution code.{' '}
                    <a href="#submission-console" className="text-cyan-400 underline hover:text-cyan-300 transition">Configure your run</a> for a live estimate.
                </div>
            </section>
        );
    };

    // ── LIGAND INFO PANEL ────────────────────────────────────
    // Static informational hint panel rendered above the ligand row list.
    // No props required — purely contextual guidance for the researcher.
    GMX.LigandInfoPanel = function LigandInfoPanel() {
        return (
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 px-4 py-3 text-[11px] font-mono leading-relaxed">
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                    <span>
                        <span className="text-cyan-400 font-bold">🧪 Test Ligand —</span>
                        <span className="text-slate-400"> Novel compound being screened against the receptor target.</span>
                    </span>
                    <span>
                        <span className="text-purple-400 font-bold">💊 Standard Control —</span>
                        <span className="text-slate-400"> Known binder used as a reference baseline for relative binding energy comparison.</span>
                    </span>
                </div>
                <div className="mt-2 text-slate-600 italic">
                    SMILES strings, SDF/MOL2 file uploads, and sketched structures are all supported. Name each compound clearly — labels appear verbatim in the analytics report.
                </div>
            </div>
        );
    };

    console.log('[GMX] components.js loaded ✔');
})();