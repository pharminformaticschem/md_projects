// ============================================================
// PART 3 — app.js  (load as type="text/babel")
// Main React app: state, orchestration, hero, multi-step form,
// pricing sidebar, and section composition.
//
// LOAD ORDER:
//   1. globals.js
//   2. components.js
//   3. app.js
// ============================================================

(function () {
    const { useState, useMemo, useEffect } = React;

    const {
        MolCanvas,
        NavBar,
        PipelineSection,
        PricingTableSection,
        AnalyticsSection,
        PublicationsSection,
        FaqSection,
        Footer,
        SketcherModal,
        TooltipBubble,
        PlanPicker,
        LigandInfoPanel,
    } = GMX;

    const App = () => {
        // ── UI STATE ────────────────────────────────────────────
        const [step, setStep] = useState(1);
        const [loading, setLoading] = useState(false);
        const [trackingId, setTrackingId] = useState('');
        const [activeTooltip, setActiveTooltip] = useState(null);
        const [showSketcher, setShowSketcher] = useState(false);
        const [currentSketchIndex, setCurrentSketchIndex] = useState(null);

        // ── FORM STATE ──────────────────────────────────────────
        const [formData, setFormData] = useState({
            name: '',
            email: '',
            countryCode: '+91',
            phone: '',
            project: '',
            trackingAlias: '',
            atomCount: 25000,
            duration: 100,
            discountCode: GMX.AUTO_DISCOUNT_CODE,
            planId: 'starter',
            includeApo: false,
            voucher: '',
            gridSize: 25,
            institution: '',
            designation: '',
            diseaseArea: '',
        });

        // ── PROTEINS ────────────────────────────────────────────
        const [proteins, setProteins] = useState([
            {
                id: 1,
                pdbCode: '',
                status: 'empty',
                labelMessage: '',
                ligandInfo: null,
            }
        ]);

        // ── LIGANDS ─────────────────────────────────────────────
        const [ligands, setLigands] = useState([
            {
                id: 1,
                type: 'smiles',
                name: '',
                data: '',
                classification: 'test',
                fileName: '',
            }
        ]);

        // ── AUTO-GUESS NAME FROM EMAIL ─────────────────────────
        useEffect(() => {
            if (!formData.name && formData.email) {
                const guessed = GMX.guessNameFromEmail(formData.email);
                if (guessed) {
                    setFormData(prev => ({ ...prev, name: guessed }));
                }
            }
        }, [formData.email]);

        // ── HERO ENTRANCE ANIMATION ────────────────────────────
        // Runs once on mount. gsap.context() scopes all selectors to the live
        // DOM and hands back a revert() cleanup so GSAP cleans up on unmount.
        // Targets are stamped with data-hero="*" attributes in the JSX below.
        useEffect(() => {
            const ctx = gsap.context(() => {
                gsap.timeline({ defaults: { ease: 'power3.out' } })
                    // 1. Badge pill fades up first
                    .from('[data-hero="badge"]',    { opacity: 0, y: 20, duration: 0.55 })
                    // 2. Headline sweeps up while badge is still settling
                    .from('[data-hero="headline"]', { opacity: 0, y: 30, duration: 0.85 }, '-=0.30')
                    // 3. Sub-paragraph follows closely behind
                    .from('[data-hero="subpara"]',  { opacity: 0, y: 30, duration: 0.70 }, '-=0.60')
                    // 4. Four status cards stagger in from below
                    .from('[data-hero="card"]',     { opacity: 0, y: 30, duration: 0.60, stagger: 0.10 }, '-=0.45');
            });
            return () => ctx.revert(); // GSAP cleanup on unmount
        }, []);

        // ── PRICING DERIVATIONS ────────────────────────────────
        const selectedPlan = useMemo(
            () => GMX.MD_PLANS.find(p => p.id === formData.planId) || GMX.MD_PLANS[1],
            [formData.planId]
        );

        const totalRuns = useMemo(
            () => selectedPlan.totalRuns + (formData.includeApo ? GMX.APO_ADDON.extraRuns : 0),
            [selectedPlan, formData.includeApo]
        );

        const priceInfo = useMemo(
            () => GMX.calculatePrice(formData.atomCount, parseInt(formData.duration), totalRuns, formData.discountCode),
            [formData.atomCount, formData.duration, totalRuns, formData.discountCode]
        );

        // ── HELPERS ─────────────────────────────────────────────
        const updateForm = (key, value) => {
            setFormData(prev => ({ ...prev, [key]: value }));
        };

        const countLigandsByClass = (cls) => ligands.filter(l => l.classification === cls).length;

        const addProteinRow = () => {
            setProteins(prev => [
                ...prev,
                { id: Date.now() + Math.random(), pdbCode: '', status: 'empty', labelMessage: '', ligandInfo: null }
            ]);
        };

        const removeProteinRow = (id) => {
            if (proteins.length > 1) setProteins(prev => prev.filter(p => p.id !== id));
        };

        const addLigandRow = (type) => {
            setLigands(prev => [
                ...prev,
                { id: Date.now() + Math.random(), type, name: '', data: '', classification: 'test', fileName: '' }
            ]);
        };

        const removeLigandRow = (id) => {
            if (ligands.length > 1) setLigands(prev => prev.filter(l => l.id !== id));
        };

        const handleFileUpload = (index, file) => {
            const updated = [...ligands];
            updated[index].fileName = file ? file.name : '';
            updated[index].data = file || '';
            setLigands(updated);
        };

        const closeAndExtractSketch = (smilesString) => {
            if (currentSketchIndex !== null) {
                const updated = [...ligands];
                updated[currentSketchIndex].data = smilesString;
                updated[currentSketchIndex].type = 'sketch';
                if (!updated[currentSketchIndex].name) {
                    updated[currentSketchIndex].name = `Sketch_${currentSketchIndex + 1}`;
                }
                setLigands(updated);
            }
            setCurrentSketchIndex(null);
            setShowSketcher(false);
        };

        // ── PDB VALIDATION + CO-CRYSTAL LOOKUP ─────────────────
        const verifyPdbStructure = async (index, value) => {
            const cleanValue = value.trim().toUpperCase();
            const updated = [...proteins];
            updated[index].pdbCode = cleanValue;

            if (!cleanValue || cleanValue.length < 4) {
                updated[index].status = 'empty';
                updated[index].labelMessage = '';
                updated[index].ligandInfo = null;
                setProteins(updated);
                return;
            }

            updated[index].status = 'verifying';
            updated[index].labelMessage = 'Querying structural alignment repositories...';
            updated[index].ligandInfo = null;
            setProteins(updated);

            await new Promise(resolve => setTimeout(resolve, 700));

            const finalUpdated = [...updated];
            if (cleanValue.length >= 4 && cleanValue.length <= 12) {
                finalUpdated[index].status = 'valid';
                const ligandInfo = GMX.lookupPdbLigand(cleanValue);
                finalUpdated[index].ligandInfo = ligandInfo;
                finalUpdated[index].labelMessage = ligandInfo
                    ? `Verified [${cleanValue}] — Co-crystallized ligand(s): ${ligandInfo.ligands.join(', ')} | ${ligandInfo.organism} | Grid hint: ${ligandInfo.hint}`
                    : `Verified protein structure resolved successfully [Structure ID: ${cleanValue}]. Ready for target grid mapping.`;
            } else {
                finalUpdated[index].status = 'invalid';
                finalUpdated[index].labelMessage = 'Structural validation alert. Please confirm notation contains 4 to 12 characters.';
                finalUpdated[index].ligandInfo = null;
            }
            setProteins(finalUpdated);
        };

        // ── TRACKING ID GENERATION ──────────────────────────────
        const buildTrackingId = () => {
            const prefix = GMX.generateTrackingPrefix();
            const rawText = formData.trackingAlias || formData.project || formData.name || 'Project';
            const safeText = GMX.sanitizeTrackingText(rawText) || 'Project';
            return `${prefix}${safeText}`;
        };

        // ── VALIDATION ──────────────────────────────────────────
        const canProceedStep1 = () => {
            return Boolean(formData.name && formData.email);
        };

        const canSubmit = () => {
            const proteinOk = proteins.some(p => p.pdbCode && p.status === 'valid');
            const ligandOk = ligands.some(l => l.name && (l.data || l.fileName));
            return proteinOk && ligandOk;
        };

        // ── SUBMIT ──────────────────────────────────────────────
        const triggerSubmit = async () => {
            if (!canSubmit()) {
                alert('Please provide at least one validated PDB target and one ligand entry before launching the workspace.');
                return;
            }
            setLoading(true);
            await new Promise(resolve => setTimeout(resolve, 1800));
            const generatedId = buildTrackingId();
            setTrackingId(generatedId);
            setLoading(false);
        };

        // ── HERO DISPLAY COUNTS ─────────────────────────────────
        const validProteinCount = proteins.filter(p => p.pdbCode).length;
        const testLigandCount = countLigandsByClass('test');
        const controlLigandCount = countLigandsByClass('control') + countLigandsByClass('standard');

        return (
            <div className="w-full">
                <MolCanvas />
                <NavBar formData={{ ...formData, trackingId }} proteins={proteins} />

                <main className="max-w-7xl mx-auto py-12 md:py-16 px-6 space-y-32">

                    {/* ── HERO SECTION ───────────────────────────── */}
                    <section className="relative overflow-hidden rounded-2xl">

                        {/* Cinematic background video ─ source driven by GMX.ASSETS.heroVideo.
                            autoPlay + muted is required by browsers for auto-play to work.
                            playsInline prevents full-screen takeover on iOS Safari.         */}
                        <video
                            src={GMX.ASSETS.heroVideo}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="absolute inset-0 w-full h-full object-cover z-0"
                        />

                        {/* Dark overlay — bg-slate-950/80 keeps cyan/purple text highly legible
                            regardless of what the video frame shows at any given moment.     */}
                        <div className="absolute inset-0 bg-slate-950/80 z-[1]" />

                        {/* All hero content sits on top of the video + overlay */}
                        <div className="relative z-[2] grid grid-cols-1 lg:grid-cols-12 gap-12 items-center py-8">

                        {/* LEFT SIDE TEXT MATRIX */}
                        <div className="lg:col-span-6 space-y-6">
                            <div data-hero="badge" className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-300 text-xs font-mono">
                                ⚙️ Dedicated AMD ROCm™ Linux Architecture
                            </div>
                            <h1 data-hero="headline" className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white leading-none">
                                Automated Docking, MDRun, and <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Reports on Demand</span>
                            </h1>
                            <p data-hero="subpara" className="text-slate-300 text-sm leading-relaxed">
                                Accelerate your drug discovery workflow with end-to-end automation. Stream your compound libraries through docking, launch production-grade molecular dynamics instantly, and receive presentation-ready reports from a single unified console.
                            </p>

                            {/* QUICK STATUS CARDS */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div data-hero="card" className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                                    <div className="text-[10px] text-slate-500 font-mono uppercase">Targets</div>
                                    <div className="text-xl font-bold text-white">{validProteinCount}</div>
                                </div>
                                <div data-hero="card" className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                                    <div className="text-[10px] text-slate-500 font-mono uppercase">Test Ligands</div>
                                    <div className="text-xl font-bold text-cyan-300">{testLigandCount}</div>
                                </div>
                                <div data-hero="card" className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                                    <div className="text-[10px] text-slate-500 font-mono uppercase">Controls</div>
                                    <div className="text-xl font-bold text-purple-300">{controlLigandCount}</div>
                                </div>
                                <div data-hero="card" className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                                    <div className="text-[10px] text-slate-500 font-mono uppercase">MD Runs</div>
                                    <div className="text-xl font-bold text-emerald-300">{totalRuns}</div>
                                </div>
                            </div>

                            {/* MICROSECOND CALCULATOR CALIBRATION DISPLAY */}
                            <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>
                                        Microsecond Scale Parameters
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-500">GROMACS Target Architecture</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-xs font-mono border-t border-b border-slate-900 py-3">
                                    <div className="space-y-1">
                                        <div className="text-slate-500 text-[10px]">TRAJECTORY RANGE SCALE:</div>
                                        <div className="text-slate-200 font-bold">Scalable up to 1.0 µs</div>
                                        <div className="text-[10px] text-slate-500 font-sans">(Equivalent to 1000 ns)</div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-slate-500 text-[10px]">CORE CONFIGURE VALUE:</div>
                                        <div className="text-purple-400 font-bold">nsteps = 250000000</div>
                                        <div className="text-[10px] text-slate-400 font-sans mt-0.5">(500,000 ps / 0.5 µs per track run)</div>
                                    </div>
                                </div>
                            </div>

                            {/* UNIFIED ECOSYSTEM INFOCARD */}
                            <div className="p-5 rounded-xl border border-cyan-500/20 bg-gradient-to-r from-slate-950 to-slate-900 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3 text-cyan-500/10 text-3xl font-mono font-bold">AI</div>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 mt-0.5">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                    </div>
                                    <div className="space-y-3 flex-1">
                                        <h4 className="text-xs font-bold font-mono tracking-wider text-white uppercase flex items-center gap-2">
                                            💡 Unified Automation Ecosystem with Human-in-the-Loop
                                        </h4>
                                        <p className="text-xs text-slate-300 leading-relaxed">
                                            Our automation layer accelerates the pipeline without overriding your science. Every project remains under Human-in-the-Loop (HITL) validation so target preparation, forcefield choices, and biological interpretation stay scientifically consistent.
                                        </p>
                                        <div className="flex items-center justify-between border-t border-slate-800/60 pt-3 gap-4">
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono">
                                                <a href={GMX.generateWhatsappLink(formData, proteins, ligands)} target="_blank" rel="noopener noreferrer" className="text-emerald-400 font-bold hover:underline flex items-center gap-1.5">
                                                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                                                    🟢 Connect with the Human (WhatsApp Helpline)
                                                </a>
                                                <span className="text-slate-700">|</span>
                                                <span className="text-slate-400 font-sans italic">Free Assistance — No Extra Charges</span>
                                            </div>
                                            <div className="flex-shrink-0">
                                                <img
                                                    src="assets/images/thumbs/your-profile-pic.webp"
                                                    alt="Dr. Ravi Rawat"
                                                    width="40"
                                                    height="40"
                                                    loading="lazy"
                                                    className="w-10 h-10 rounded-full border-2 border-cyan-400 object-cover shadow-md shadow-cyan-500/20"
                                                    onError={(e) => { e.target.src = 'https://via.placeholder.com/150'; }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT SIDE VISUAL NODE GRAPH */}
                        <div className="lg:col-span-6 space-y-6">
                            <div className="p-6 rounded-2xl bg-slate-950/90 border border-cyan-500/30 relative overflow-hidden aspect-[4/3] flex flex-col justify-between">
                                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#06b6d4_1.5px,transparent_1.5px)] [background-size:24px_24px]"></div>
                                <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-purple-500/10 to-transparent pointer-events-none"></div>
                                <div className="absolute top-12 left-12 w-0.5 h-32 bg-cyan-400/30 hpc-scan-line"></div>
                                <div className="flex justify-between items-center z-10">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping"></span>
                                        <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold">AI Powered Docking and Simulation Core</span>
                                    </div>
                                    <span className="text-[9px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">ROCm Radeon™ Powerhouse Enabled</span>
                                </div>
                                <div className="relative h-44 w-full flex items-center justify-between px-8 z-10">
                                    <div className="flex flex-col gap-4">
                                        {[1,2,3].map(n => <div key={n} className="h-3 w-3 rounded-full bg-cyan-400 dl-node"></div>)}
                                    </div>
                                    <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
                                        <line x1="15%" y1="25%" x2="50%" y2="20%" stroke="#06b6d4" strokeWidth="1" />
                                        <line x1="15%" y1="25%" x2="50%" y2="50%" stroke="#06b6d4" strokeWidth="1" />
                                        <line x1="15%" y1="50%" x2="50%" y2="20%" stroke="#06b6d4" strokeWidth="1" />
                                        <line x1="15%" y1="50%" x2="50%" y2="50%" stroke="#06b6d4" strokeWidth="1" />
                                        <line x1="15%" y1="50%" x2="50%" y2="80%" stroke="#06b6d4" strokeWidth="1" />
                                        <line x1="15%" y1="75%" x2="50%" y2="50%" stroke="#06b6d4" strokeWidth="1" />
                                        <line x1="15%" y1="75%" x2="50%" y2="80%" stroke="#06b6d4" strokeWidth="1" />
                                        <line x1="50%" y1="20%" x2="85%" y2="50%" stroke="#a855f7" strokeWidth="1" />
                                        <line x1="50%" y1="50%" x2="85%" y2="50%" stroke="#a855f7" strokeWidth="1" />
                                        <line x1="50%" y1="80%" x2="85%" y2="50%" stroke="#a855f7" strokeWidth="1" />
                                    </svg>
                                    <div className="flex flex-col gap-6">
                                        {[1,2,3,4].map(n => <div key={n} className="h-3 w-3 rounded-full bg-purple-500 dl-node" style={{ animationDelay: '0.4s' }}></div>)}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <div className="h-4 w-4 rounded-full bg-emerald-400 dl-node" style={{ animationDelay: '0.8s' }}></div>
                                    </div>
                                </div>
                                <div className="text-[11px] font-mono text-slate-400 z-10 flex justify-between border-t border-slate-900 pt-3">
                                    <span>🧬 Atom-Level Geometries: Active</span>
                                    <span className="text-cyan-400">🧠 LLM-Synthesized Multimodal Data: Active</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-900 flex items-center gap-3">
                                    <div className="h-2 w-2 rounded-full bg-cyan-400"></div>
                                    <div>
                                        <h4 className="text-xs font-bold text-white font-mono">AutoDock ROCm Radeon™ Engine</h4>
                                        <p className="text-[10px] text-slate-500">Pre-simulation Screening</p>
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-900 flex items-center gap-3">
                                    <div className="h-2 w-2 rounded-full bg-purple-400"></div>
                                    <div>
                                        <h4 className="text-xs font-bold text-white font-mono">GROMACS ROCm Radeon™ Engine</h4>
                                        <p className="text-[10px] text-slate-500">Molecular Simulations with GROMACS</p>
                                    </div>
                                </div>
                            </div>
                        </div>{/* end right column */}
                    </div>{/* end hero grid */}
                    </section>{/* end hero section */}

                    <PipelineSection />

                    {/* ── SUBMISSION CONSOLE ─────────────────────── */}
                    <section id="submission-console" className="pt-8">
                        <div className="w-full text-center max-w-2xl mx-auto mb-10 space-y-2">
                            <div className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold flex items-center justify-center gap-2">
                                <span className="h-1 w-3 bg-cyan-400 inline-block"></span>PRIMARY CONTROL DECK<span className="h-1 w-3 bg-cyan-400 inline-block"></span>
                            </div>
                            <h2 className="font-display text-3xl font-bold text-white tracking-tight">Initialize GROMACS Cloud Workspace with AI</h2>
                            <p className="text-xs text-slate-400">Provide receptor PDB ID(s), compound structures, and simulation settings to launch docking and MD trajectories.</p>
                        </div>

                        <div className="w-full mx-auto">
                            {trackingId ? (
                                // ── POST-SUBMIT SUCCESS PANEL ──
                                <div className="robotics-glass p-8 md:p-12 rounded-3xl space-y-8 max-w-5xl mx-auto border-t-4 border-purple-500">
                                    <div className="border-b border-slate-800 pb-4">
                                        <span className="text-xs font-mono text-purple-400 uppercase tracking-widest block mb-1">Instance Secure Allocation Lock Verified</span>
                                        <h3 className="font-display text-2xl font-bold text-white">Workspace Provisioned Successfully</h3>
                                        <p className="text-xs text-slate-500 font-mono mt-1">Project Tracking ID: {trackingId}</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                        <div className="p-5 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-2">
                                            <h4 className="text-xs font-mono text-cyan-400 uppercase font-bold">Submission Summary</h4>
                                            <p className="text-slate-300"><span className="text-slate-500">Researcher:</span> {formData.name || '—'}</p>
                                            <p className="text-slate-300"><span className="text-slate-500">Email:</span> {formData.email || '—'}</p>
                                            <p className="text-slate-300"><span className="text-slate-500">PDB Targets:</span> {proteins.map(p => p.pdbCode).filter(Boolean).join(', ') || '—'}</p>
                                            <p className="text-slate-300"><span className="text-slate-500">Plan:</span> {selectedPlan.label} {formData.includeApo ? '+ Apoprotein' : ''}</p>
                                            <p className="text-slate-300"><span className="text-slate-500">Duration:</span> {formData.duration} ns</p>
                                        </div>
                                        <div className="p-5 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-2">
                                            <h4 className="text-xs font-mono text-purple-400 uppercase font-bold">Billing Snapshot</h4>
                                            {priceInfo.custom ? (
                                                <p className="text-amber-400 font-bold">Custom quote required</p>
                                            ) : (
                                                <>
                                                    <p className="text-slate-300"><span className="text-slate-500">Original:</span> <span className="line-through text-slate-500">₹{priceInfo.originalInr.toLocaleString()}</span></p>
                                                    <p className="text-white text-lg font-bold">₹{priceInfo.discountedInr.toLocaleString()}</p>
                                                    <p className="text-emerald-400 text-xs font-mono">Saved ₹{priceInfo.savings.toLocaleString()} via {priceInfo.appliedCode}</p>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <a href={GMX.generateMailtoLink({ ...formData, trackingId }, proteins)} className="flex-1 btn-action py-4 rounded-xl font-bold text-white text-xs uppercase tracking-widest shadow-xl text-center">
                                            📧 Continue by Email
                                        </a>
                                        <a href={GMX.generateWhatsappLink({ ...formData, trackingId }, proteins, ligands)} target="_blank" rel="noopener noreferrer" className="flex-1 py-4 rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl text-center border border-emerald-500/30 bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20 transition">
                                            💬 Continue on WhatsApp
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                // ── LIVE FORM + SIDEBAR ──
                                <div className="robotics-glass rounded-3xl overflow-hidden flex flex-col lg:flex-row max-w-7xl mx-auto shadow-2xl border border-cyan-500/30">
                                    {/* LEFT FORM */}
                                    <div className="flex-1 p-8 md:p-12 space-y-8">
                                        <div className="flex justify-between items-center border-b border-slate-800 pb-5 gap-4">
                                            <div>
                                                <h3 className="font-display font-bold text-xl text-white tracking-wide">
                                                    {step === 1 ? 'Step 01: Researcher Identity & Project Alias' : 'Step 02: Docking + MD Simulation Configuration'}
                                                </h3>
                                                <p className="text-xs text-slate-400 mt-1">All fields stay editable until workspace launch.</p>
                                            </div>
                                            <span className="text-xs font-mono bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-3 py-1 rounded-md whitespace-nowrap">Stage {step} of 2</span>
                                        </div>

                                        {step === 1 ? (
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Researcher Full Name</label>
                                                        <input className="input-cyber" placeholder="Dr. / Professor / Researcher Name" value={formData.name} onChange={e => updateForm('name', e.target.value)} />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                            Email Address
                                                            <TooltipBubble id="email" active={activeTooltip} onToggle={setActiveTooltip} />
                                                        </label>
                                                        <input type="email" className="input-cyber" placeholder="name@institution.edu" value={formData.email} onChange={e => updateForm('email', e.target.value)} />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Country Code</label>
                                                        <select className="input-cyber bg-slate-950" value={formData.countryCode} onChange={e => updateForm('countryCode', e.target.value)}>
                                                            {GMX.COUNTRY_CODES.map(c => (
                                                                <option key={`${c.code}-${c.name}`} value={c.code}>{c.flag} {c.code} — {c.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Phone / WhatsApp Number</label>
                                                        <input type="tel" className="input-cyber" placeholder="Enter mobile number" value={formData.phone} onChange={e => updateForm('phone', e.target.value)} />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Project Short Title</label>
                                                        <input className="input-cyber" placeholder="e.g. EGFR_Leads_June2026" value={formData.project} onChange={e => updateForm('project', e.target.value)} />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Tracking Alias (max 15 chars)</label>
                                                        <input className="input-cyber font-mono" placeholder="e.g. EGFR_Run1" maxLength={15} value={formData.trackingAlias} onChange={e => updateForm('trackingAlias', e.target.value)} />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Designation</label>
                                                        <input className="input-cyber" placeholder="Assistant Professor / Scientist" value={formData.designation} onChange={e => updateForm('designation', e.target.value)} />
                                                    </div>
                                                    <div className="space-y-1.5 md:col-span-2">
                                                        <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Institution / Lab</label>
                                                        <input className="input-cyber" placeholder="University / Institute / R&D Organization" value={formData.institution} onChange={e => updateForm('institution', e.target.value)} />
                                                    </div>
                                                </div>

                                                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-xs font-mono text-slate-400 leading-relaxed">
                                                    <div className="text-cyan-400 font-bold uppercase tracking-wider mb-1">Preview Tracking ID</div>
                                                    <div className="text-white break-all">{buildTrackingId()}</div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (canProceedStep1()) setStep(2);
                                                        else alert('Please complete your name and email before continuing.');
                                                    }}
                                                    className="w-full btn-action py-4 rounded-xl font-bold text-white text-xs uppercase tracking-widest shadow-xl"
                                                >
                                                    Proceed → Configure Molecular Workflow
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-8">
                                                {/* PDB SECTION */}
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center border-b border-slate-900 pb-2 gap-3">
                                                        <h4 className="text-xs font-mono tracking-wider text-cyan-400 uppercase font-bold flex items-center gap-1.5">
                                                            Target Receptor PDB ID(s)
                                                            <TooltipBubble id="pdb" active={activeTooltip} onToggle={setActiveTooltip} />
                                                        </h4>
                                                        <button type="button" onClick={addProteinRow} className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 px-2.5 py-1 rounded font-mono hover:text-cyan-400 transition">+ Add Protein</button>
                                                    </div>

                                                    <div className="space-y-3">
                                                        {proteins.map((protein, index) => (
                                                            <div key={protein.id} className="p-4 rounded-xl bg-slate-950/40 border border-slate-900 space-y-2">
                                                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                                                    <span className="text-xs font-mono text-slate-500 md:w-20">Target #{index + 1}</span>
                                                                    <input
                                                                        type="text"
                                                                        maxLength={12}
                                                                        className="input-cyber md:max-w-sm font-mono uppercase tracking-widest py-2 text-xs"
                                                                        placeholder="Enter PDB ID (4 to 12 chars)"
                                                                        value={protein.pdbCode}
                                                                        onChange={e => verifyPdbStructure(index, e.target.value)}
                                                                    />
                                                                    {proteins.length > 1 && (
                                                                        <button type="button" onClick={() => removeProteinRow(protein.id)} className="text-xs text-red-400 font-mono hover:underline">Delete</button>
                                                                    )}
                                                                </div>
                                                                {protein.status !== 'empty' && (
                                                                    <div className={`text-[11px] font-mono px-3 py-1.5 rounded-md flex items-start gap-2 leading-relaxed ${
                                                                        protein.status === 'verifying' ? 'bg-amber-500/5 text-amber-400 border border-amber-500/10' :
                                                                        protein.status === 'valid' ? 'bg-emerald-500/5 text-emerald-400 border border-emerald-500/10' :
                                                                        'bg-red-500/5 text-red-400 border border-red-500/10'
                                                                    }`}>
                                                                        <span className={`mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0 ${protein.status === 'verifying' ? 'bg-amber-400 animate-spin' : protein.status === 'valid' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                                                                        <span>{protein.labelMessage}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* LIGAND SECTION */}
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center border-b border-slate-900 pb-2 gap-3">
                                                        <h4 className="text-xs font-mono tracking-wider text-cyan-400 uppercase font-bold flex items-center gap-1.5">
                                                            Ligand Screening Setup Library
                                                            <TooltipBubble id="ligandClass" active={activeTooltip} onToggle={setActiveTooltip} />
                                                        </h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            <button type="button" onClick={() => addLigandRow('smiles')} className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 px-2.5 py-1 rounded font-mono hover:text-cyan-400 transition">+ SMILES</button>
                                                            <button type="button" onClick={() => addLigandRow('file')} className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 px-2.5 py-1 rounded font-mono hover:text-cyan-400 transition">+ File Upload</button>
                                                            <button type="button" onClick={() => addLigandRow('sketch')} className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 px-2.5 py-1 rounded font-mono hover:text-cyan-400 transition">+ Sketch</button>
                                                        </div>
                                                    </div>

                                                    <LigandInfoPanel />

                                                    <div className="space-y-3">
                                                        {ligands.map((ligand, index) => (
                                                            <div key={ligand.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 rounded-xl bg-slate-950/40 border border-slate-900 items-start">
                                                                <div className="md:col-span-3 space-y-1">
                                                                    <label className="text-[10px] text-slate-500 font-mono uppercase">Ligand Name</label>
                                                                    <input
                                                                        type="text"
                                                                        className="input-cyber py-1.5 text-xs font-mono"
                                                                        placeholder="e.g. Lead-1a"
                                                                        value={ligand.name}
                                                                        onChange={e => {
                                                                            const u = [...ligands];
                                                                            u[index].name = e.target.value;
                                                                            setLigands(u);
                                                                        }}
                                                                    />
                                                                </div>

                                                                <div className="md:col-span-5 space-y-1">
                                                                    <label className="text-[10px] text-slate-500 font-mono uppercase">Structure Input</label>

                                                                    {ligand.type === 'smiles' && (
                                                                        <input
                                                                            type="text"
                                                                            className="input-cyber py-1.5 text-xs font-mono flex-1"
                                                                            placeholder="Paste SMILES string"
                                                                            value={typeof ligand.data === 'string' ? ligand.data : ''}
                                                                            onChange={e => {
                                                                                const u = [...ligands];
                                                                                u[index].data = e.target.value;
                                                                                setLigands(u);
                                                                            }}
                                                                        />
                                                                    )}

                                                                    {ligand.type === 'file' && (
                                                                        <div className="flex items-center gap-3">
                                                                            <input
                                                                                type="file"
                                                                                accept=".sdf,.mae,.maegz,.mol2,.pdb,.mol,.zip"
                                                                                className="hidden"
                                                                                id={`file-input-${ligand.id}`}
                                                                                onChange={e => handleFileUpload(index, e.target.files[0])}
                                                                            />
                                                                            <label htmlFor={`file-input-${ligand.id}`} className="text-xs bg-slate-900 border border-slate-800 text-slate-300 px-3 py-2 rounded cursor-pointer hover:border-cyan-500/40 font-mono text-center flex-1 truncate">
                                                                                {ligand.fileName || 'Upload (.mol2, .sdf, .pdb, .zip)'}
                                                                            </label>
                                                                        </div>
                                                                    )}

                                                                    {ligand.type === 'sketch' && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => { setCurrentSketchIndex(index); setShowSketcher(true); }}
                                                                            className="text-xs bg-purple-500/10 border border-purple-500/30 text-purple-300 px-3 py-2 rounded font-mono hover:bg-purple-500/20 whitespace-nowrap w-full text-left"
                                                                        >
                                                                            ✏️ {ligand.data ? `SMILES: ${String(ligand.data).slice(0, 60)}${String(ligand.data).length > 60 ? '...' : ''}` : 'Open Molecule Sketcher'}
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                <div className="md:col-span-3 space-y-1">
                                                                    <label className="text-[10px] text-slate-500 font-mono uppercase">Classification</label>
                                                                    <select
                                                                        className="input-cyber py-1.5 text-xs font-mono bg-slate-950"
                                                                        value={ligand.classification}
                                                                        onChange={e => {
                                                                            const u = [...ligands];
                                                                            u[index].classification = e.target.value;
                                                                            setLigands(u);
                                                                        }}
                                                                    >
                                                                        <option value="test">🧪 Test Ligand</option>
                                                                        <option value="control">💊 Standard Control</option>
                                                                    </select>
                                                                </div>

                                                                <div className="md:col-span-1 pt-6 text-center">
                                                                    {ligands.length > 1 && (
                                                                        <button type="button" onClick={() => removeLigandRow(ligand.id)} className="text-xs text-red-400 font-mono hover:underline">Remove</button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* PLAN SECTION */}
                                                <PlanPicker
                                                    selectedPlanId={formData.planId}
                                                    onSelect={(id) => updateForm('planId', id)}
                                                    includeApo={formData.includeApo}
                                                    onToggleApo={() => updateForm('includeApo', !formData.includeApo)}
                                                />

                                                {/* RUN PARAMETERS */}
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                            Atom Count
                                                            <TooltipBubble id="atomCount" active={activeTooltip} onToggle={setActiveTooltip} />
                                                        </label>
                                                        <input type="number" min="1000" step="1000" className="input-cyber" value={formData.atomCount} onChange={e => updateForm('atomCount', parseInt(e.target.value) || 0)} />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                            Duration (ns)
                                                            <TooltipBubble id="duration" active={activeTooltip} onToggle={setActiveTooltip} />
                                                        </label>
                                                        <select className="input-cyber bg-slate-950" value={formData.duration} onChange={e => updateForm('duration', parseInt(e.target.value))}>
                                                            {GMX.DURATION_COLS.map(d => <option key={d} value={d}>{d} ns</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                            Grid Box Size
                                                            <TooltipBubble id="grid" active={activeTooltip} onToggle={setActiveTooltip} />
                                                        </label>
                                                        <select className="input-cyber bg-slate-950" value={formData.gridSize} onChange={e => updateForm('gridSize', parseInt(e.target.value))}>
                                                            {GMX.GRID_SIZES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Discount / Voucher Code</label>
                                                        <input className="input-cyber font-mono" placeholder="Scholar code auto-applied" value={formData.discountCode} onChange={e => updateForm('discountCode', e.target.value.toUpperCase())} />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Disease / Target Area</label>
                                                        <input className="input-cyber" placeholder="e.g. Oncology / Antimalarial / Neurodegeneration" value={formData.diseaseArea} onChange={e => updateForm('diseaseArea', e.target.value)} />
                                                    </div>
                                                </div>

                                                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                                                    <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition">← Back</button>
                                                    <button type="button" onClick={triggerSubmit} disabled={loading} className="flex-1 btn-action py-4 rounded-xl font-bold text-white text-xs uppercase tracking-widest shadow-xl disabled:opacity-60">
                                                        {loading ? '⏳ Initializing Workspace Node...' : '🚀 Launch Molecular Workspace'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* RIGHT SIDEBAR */}
                                    <div className="lg:w-[360px] p-8 bg-slate-950/80 border-t lg:border-t-0 lg:border-l border-slate-900 space-y-6 flex flex-col justify-between">
                                        <div className="space-y-5">
                                            <div className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold flex items-center gap-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></span> Live Estimate
                                            </div>

                                            <div className="space-y-2 text-xs font-mono">
                                                <div className="flex justify-between text-slate-400"><span>Plan:</span><span className="text-white font-bold">{selectedPlan.label}</span></div>
                                                <div className="flex justify-between text-slate-400"><span>Total Runs:</span><span className="text-white font-bold">{totalRuns}</span></div>
                                                <div className="flex justify-between text-slate-400"><span>Duration:</span><span className="text-white font-bold">{formData.duration} ns</span></div>
                                                <div className="flex justify-between text-slate-400"><span>Atom Count:</span><span className="text-white font-bold">~{Number(formData.atomCount).toLocaleString()}</span></div>
                                                <div className="flex justify-between text-slate-400"><span>Targets:</span><span className="text-white font-bold">{validProteinCount}</span></div>
                                                <div className="flex justify-between text-slate-400"><span>Ligands:</span><span className="text-white font-bold">{ligands.length}</span></div>
                                            </div>

                                            <div className="border-t border-slate-900 pt-4 space-y-1">
                                                <div className="text-[10px] text-slate-500 font-mono uppercase">Pricing Snapshot</div>
                                                {priceInfo.custom ? (
                                                    <>
                                                        <div className="font-display text-2xl font-bold text-amber-400">Custom Quote</div>
                                                        <div className="text-xs text-slate-500 font-mono">System exceeds standard pricing tiers</div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="text-sm text-slate-500 line-through font-mono">₹{priceInfo.originalInr.toLocaleString()}</div>
                                                        <div className="font-display text-3xl font-bold text-white">₹{priceInfo.discountedInr.toLocaleString()}</div>
                                                        <div className="text-xs text-slate-500 font-mono">≈ ${priceInfo.discountedUsd} USD</div>
                                                        <div className="text-[11px] font-mono text-emerald-400">{priceInfo.discountPct}% off via {priceInfo.appliedCode}</div>
                                                        <div className="text-[11px] font-mono text-slate-500">You save ₹{priceInfo.savings.toLocaleString()}</div>
                                                    </>
                                                )}
                                            </div>

                                            <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20 text-[10px] text-slate-400 font-mono leading-relaxed space-y-1">
                                                <div>✅ Includes RMSD, RMSF, PCA, FEL, H-Bond, MM-PBSA</div>
                                                <div>✅ Includes LLM-generated multimodal summary report</div>
                                                <div>✅ Includes raw trajectory + top pose outputs</div>
                                                <div>✅ Scholar discount is auto-applied</div>
                                            </div>

                                            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2 text-xs">
                                                <div className="text-cyan-400 font-bold font-mono uppercase tracking-wider">Plan Breakdown</div>
                                                <div className="flex justify-between text-slate-400"><span>Test Ligands</span><span className="text-white">{selectedPlan.testRuns}</span></div>
                                                <div className="flex justify-between text-slate-400"><span>Standard Controls</span><span className="text-white">{selectedPlan.controlRuns}</span></div>
                                                <div className="flex justify-between text-slate-400"><span>Apoprotein</span><span className="text-white">{formData.includeApo ? GMX.APO_ADDON.extraRuns : 0}</span></div>
                                                <div className="border-t border-slate-900 pt-2 flex justify-between text-slate-300 font-bold"><span>Total MD Runs</span><span>{totalRuns}</span></div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <a href={GMX.generateMailtoLink({ ...formData, trackingId }, proteins)} className="block w-full text-center py-3 rounded-xl border border-cyan-500/30 text-cyan-400 text-xs font-mono hover:bg-cyan-500/10 transition">📧 Email Inquiry</a>
                                            <a href={GMX.generateWhatsappLink({ ...formData, trackingId }, proteins, ligands)} target="_blank" rel="noopener noreferrer" className="block w-full text-center py-3 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-xs font-mono hover:bg-emerald-600/30 transition">💬 WhatsApp Consult</a>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    <PricingTableSection />
                    <AnalyticsSection />
                    <PublicationsSection />
                    <FaqSection />
                </main>

                <Footer formData={{ ...formData, trackingId }} proteins={proteins} ligands={ligands} />
                <SketcherModal show={showSketcher} onClose={() => setShowSketcher(false)} onExtract={closeAndExtractSketch} />
            </div>
        );
    };

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);

    console.log('[GMX] app.js mounted ✔');
})();