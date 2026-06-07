// ============================================================
// PART 2 — components.js  (type="text/babel")
// Reusable React sub-components.
// To add a new UI block: define it here, export on window.GMX.
// ============================================================

(function() {
const { useEffect } = React;

// ── ANIMATED BACKGROUND CANVAS ───────────────────────────────
GMX.MolCanvas = function() {
    useEffect(() => {
        const canvas = document.getElementById('mol-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let atoms = [], animationFrameId;

        function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
        window.addEventListener('resize', resize);
        resize();

        for (let i = 0; i < 45; i++) {
            atoms.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height,
                         r: Math.random() * 2 + 1.5, vx: (Math.random()-0.5)*0.3, vy: (Math.random()-0.5)*0.3 });
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "rgba(6, 182, 212, 0.4)";
            ctx.strokeStyle = "rgba(6, 182, 212, 0.05)";
            ctx.lineWidth = 1;
            atoms.forEach((a, idx) => {
                a.x += a.vx; a.y += a.vy;
                if (a.x < 0 || a.x > canvas.width)  a.vx *= -1;
                if (a.y < 0 || a.y > canvas.height)  a.vy *= -1;
                ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
                for (let j = idx + 1; j < atoms.length; j++) {
                    const b = atoms[j], dist = Math.hypot(a.x-b.x, a.y-b.y);
                    if (dist < 110) { ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); }
                }
            });
            animationFrameId = requestAnimationFrame(animate);
        }
        animate();
        return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animationFrameId); };
    }, []);
    return null;
};

// ── TOP NAVIGATION ────────────────────────────────────────────
GMX.NavBar = function({ formData, proteins }) {
    return (
        <nav className="border-b border-cyan-500/15 bg-slate-950/80 backdrop-blur-lg sticky top-0 z-50 px-6 py-4">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-purple-600 flex items-center justify-center font-bold text-white tracking-tighter text-sm">GMX</div>
                    <span className="font-display font-bold text-base tracking-wide text-white">GROMACS <span className="text-cyan-400 font-light">Cloud Workspace with AI</span></span>
                </div>
                <div className="hidden lg:flex items-center gap-8 text-xs font-semibold uppercase tracking-widest text-slate-300">
                    <a href="#pipeline" className="hover:text-cyan-400 transition">WORKFLOW</a>
                    <a href="#submission-console" className="text-cyan-400 font-bold hover:underline transition">Submit your Job</a>
                    <a href="#analytics" className="hover:text-purple-400 transition">Automated Analytics</a>
                    <a href="#publications" className="hover:text-cyan-400 transition">Literature Benchmarks</a>
                </div>
                <a href={GMX.generateMailtoLink(formData || {}, proteins || [])}
                   className="text-xs text-slate-300 border border-cyan-500/30 rounded-lg px-3 py-2 bg-cyan-950/50 hover:bg-slate-900 hover:text-cyan-400 transition font-mono shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                    {GMX.CONTACT.email}
                </a>
            </div>
        </nav>
    );
};

// ── ANALYTICS SECTION ─────────────────────────────────────────
GMX.AnalyticsSection = function() {
    return (
        <section id="analytics" className="space-y-8">
            <div className="border-l-2 border-cyan-400 pl-4">
                <h2 className="font-display text-2xl font-bold text-white">Automated Comprehensive Analytics Suite</h2>
                <p className="text-xs text-slate-400 mt-0.5">High-resolution scientific metrics are automatically synthesized and outputted directly inside your complete production bundle at no extra charge. driven by an advanced Multimodal LLM Engine, the pipeline seamlessly compiles high-fidelity structural images, molecular trajectory videos, comprehensive numerical datasets, and contextual text analysis, delivering a production-ready report alongside your raw simulation data. Click any card preview to open the uncompressed high-resolution diagram in a new tab.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {GMX.ANALYTICS_CARDS.map((card, idx) => (
                    <div key={idx} className="rounded-2xl bg-slate-950/90 border border-slate-800 overflow-hidden flex flex-col justify-between p-5 relative">
                        <div className="text-[10px] font-mono text-slate-500 uppercase flex justify-between">
                            <span>{card.label}</span>
                            <span className={`text-${card.color}-500 text-[9px]`}>🔍 Click to zoom</span>
                        </div>
                        <div className="my-6 border border-slate-900/60 aspect-video rounded-xl bg-slate-950/40 overflow-hidden">
                            <a href={card.orig} target="_blank" rel="noopener noreferrer" className="cursor-zoom-in block w-full h-full">
                                <img src={card.thumb} alt={card.alt} loading="lazy"
                                     className="w-full h-full object-cover transition duration-300 hover:scale-105"
                                     onError={(e) => { e.target.style.display='none'; e.target.parentNode.innerHTML='<span class="text-[11px] text-slate-600 italic font-mono p-2 text-center flex h-full items-center justify-center">[Missing Image File]</span>'; }} />
                            </a>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-200">{card.title}</h4>
                            <p className={`text-xs text-${card.color}-400 font-mono mt-0.5`}>{card.sub}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

// ── PUBLICATIONS SECTION ──────────────────────────────────────
GMX.PublicationsSection = function() {
    return (
        <section id="publications" className="space-y-8">
            <div className="border-l-2 border-purple-400 pl-4">
                <h2 className="font-display text-2xl font-bold text-white">Peer-Reviewed Validation Proof</h2>
                <p className="text-xs text-slate-400 mt-0.5">Established molecular docking and GROMACS methodology architectures published with <strong>Dr. Ravi Rawat</strong> as Lead Corresponding Author (*).</p>
            </div>
            <div className="space-y-4 max-w-6xl">
                {GMX.PUBLICATIONS.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-950/40 border border-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                        <p className="text-slate-300 leading-relaxed flex-1">
                            <span className="text-slate-600 font-mono inline-block w-6 font-bold">{idx+1}.</span>
                            {item.cite.split("Ravi Rawat*")[0]}
                            <strong className="text-white underline">Ravi Rawat*</strong>
                            {item.cite.split("Ravi Rawat*")[1]}
                        </p>
                        <div className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-mono text-[10px] px-2 py-0.5 rounded font-bold whitespace-nowrap">Impact Factor: {item.factor}</div>
                    </div>
                ))}
            </div>
        </section>
    );
};

// ── FAQ SECTION ───────────────────────────────────────────────
GMX.FaqSection = function() {
    return (
        <section id="faqs" className="max-w-5xl mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h2 className="font-display text-2xl font-bold text-white">Operational Framework FAQ</h2>
                <p className="text-xs text-slate-400">Clear scientific guidelines across Docking and Dynamics workflows.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed">
                {GMX.FAQS.map((faq, idx) => (
                    <div key={idx} className="p-5 rounded-2xl bg-slate-950/80 border border-slate-900 space-y-3">
                        <h4 className="font-bold text-cyan-400 uppercase tracking-wide">{faq.q}</h4>
                        {faq.preamble && <p className="text-slate-400">{faq.preamble}</p>}
                        {faq.bullets && (
                            <ul className="space-y-2 pl-2 border-l border-cyan-500/20 text-slate-300 font-sans">
                                {faq.bullets.map((b, i) => <li key={i} dangerouslySetInnerHTML={{__html: b}} />)}
                            </ul>
                        )}
                        {faq.body && <p className="text-slate-400">{faq.body}</p>}
                    </div>
                ))}
            </div>
        </section>
    );
};

// ── FOOTER ────────────────────────────────────────────────────
GMX.Footer = function({ formData, proteins, ligands }) {
    return (
        <>
            <div className="fixed bottom-6 right-6 z-50">
                <a href={GMX.generateWhatsappLink(formData, proteins, ligands)}
                   target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-3.5 rounded-full shadow-xl transition text-xs tracking-wider uppercase">
                    WhatsApp Assistance Desk
                </a>
            </div>
            <footer className="border-t border-slate-900 bg-slate-950 text-[11px] text-slate-500 py-10 text-center px-6">
                <p className="max-w-xl mx-auto mb-1.5">GROMACS Cloud Workspace with AI is an independent structural chemistry processing pipeline console.</p>
                <p>© 2026 GROMACS Cloud Workspace with AI. Built and used under supervision of Dr. Ravi Rawat.</p>
            </footer>
        </>
    );
};

// ── MOLECULE SKETCHER MODAL (Ketcher iframe bridge) ───────────
// Props: show, iframeRef, onClose, onExtract
GMX.SketcherModal = function({ show, iframeRef, onClose, onExtract }) {
    if (!show) return null;
    return (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-6 max-w-3xl w-full space-y-4 shadow-2xl">

                {/* Header */}
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <h4 className="text-sm font-mono font-bold text-white flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-purple-500 animate-ping"></span>
                        Ketcher Cyberpunk Embedded Canvas Vector
                    </h4>
                    <button type="button" onClick={onClose} className="text-xs text-slate-400 hover:text-white font-mono">✕ Close</button>
                </div>

                {/* Ketcher iframe — points to sketcher.html bridge */}
                <div className="w-full h-[470px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 relative">
                    <iframe
                        ref={iframeRef}
                        src="sketcher.html"
                        className="w-full h-full"
                        frameBorder="0"
                        scrolling="no"
                    ></iframe>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 text-xs font-mono pt-2">
                    <button type="button" onClick={onClose}
                            className="px-4 py-2 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition">
                        Cancel
                    </button>
                    <button type="button" onClick={onExtract}
                            className="px-5 py-2 btn-action rounded-lg font-bold text-white">
                        Map Structure To Input Row
                    </button>
                </div>

            </div>
        </div>
    );
};

console.log("[GMX] components.js loaded ✔");
})();
