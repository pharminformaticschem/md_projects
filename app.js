// ============================================================
// PART 3 — app.js  (type="text/babel")
// Main App component: all React state, form logic, hero &
// submission-console JSX.
// To add a new page section: drop a new GMX.XxxSection here.
// ============================================================

(function() {
const { useState, useEffect, useRef } = React;
const { MolCanvas, NavBar, AnalyticsSection, PublicationsSection, FaqSection, Footer, SketcherModal } = GMX;

const App = () => {
    const [step,               setStep]               = useState(1);
    const [loading,            setLoading]             = useState(false);
    const [trackingId,         setTrackingId]          = useState(null);
    const [activeTooltip,      setActiveTooltip]       = useState(null);
    const [showSketcher,       setShowSketcher]        = useState(false);
    const [currentSketchIndex, setCurrentSketchIndex]  = useState(null);

    const iframeRef = useRef(null);
    const [isKetcherReady, setIsKetcherReady] = useState(false);

    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', project: '',
        mdJobs: 4, duration: '0.1', voucher: ''
    });

    const [proteins, setProteins] = useState([
        { id: 1, pdbCode: '', status: 'empty', labelMessage: '' }
    ]);

    const [ligands, setLigands] = useState([
        { id: 1, type: 'smiles', name: '', data: '', classification: 'test', fileName: '' }
    ]);

    // ── PDB verification ──
    const verifyPdbStructure = async (index, value) => {
        const updated    = [...proteins];
        const cleanValue = value.trim();
        updated[index].pdbCode = cleanValue;

        if (!cleanValue || cleanValue.length < 4) {
            updated[index].status = 'empty'; updated[index].labelMessage = '';
            setProteins(updated); return;
        }
        updated[index].status = 'verifying';
        updated[index].labelMessage = 'Querying structural alignment repositories...';
        setProteins(updated);

        await new Promise(resolve => setTimeout(resolve, 800));
        const finalUpdated = [...proteins];
        if (cleanValue.length >= 4 && cleanValue.length <= 12) {
            finalUpdated[index].status = 'valid';
            finalUpdated[index].labelMessage = `Verified protein structure resolved successfully [Structure ID: ${cleanValue.toUpperCase()}]. Ready for target grid mapping.`;
        } else {
            finalUpdated[index].status = 'invalid';
            finalUpdated[index].labelMessage = 'Structural validation alert. Please confirm notation contains 4 to 12 characters.';
        }
        setProteins(finalUpdated);
    };

    const addProteinRow    = () => setProteins([...proteins, { id: Date.now(), pdbCode: '', status: 'empty', labelMessage: '' }]);
    const removeProteinRow = (id) => { if (proteins.length > 1) setProteins(proteins.filter(p => p.id !== id)); };

    const addLigandRow    = (inputType) => setLigands([...ligands, { id: Date.now(), type: inputType, name: '', data: '', classification: 'test', fileName: '' }]);
    const removeLigandRow = (id)        => { if (ligands.length > 1) setLigands(ligands.filter(l => l.id !== id)); };

    const handleFileUpload = (index, file) => {
        const updated = [...ligands];
        updated[index].fileName = file ? file.name : '';
        updated[index].data     = file;
        setLigands(updated);
    };

    // Receive SMILES payload from Ketcher iframe via postMessage bridge
    useEffect(() => {
        const handleKetcherMessage = (event) => {
            if (event.data && event.data.source === 'ketcher-bridge-payload') {
                if (currentSketchIndex !== null) {
                    const updated = [...ligands];
                    updated[currentSketchIndex].data = event.data.smiles || '';
                    setLigands(updated);
                }
                setShowSketcher(false);
                setCurrentSketchIndex(null);
            }
        };
        window.addEventListener('message', handleKetcherMessage);
        return () => window.removeEventListener('message', handleKetcherMessage);
    }, [currentSketchIndex, ligands]);

    // Send extraction trigger into the Ketcher iframe
    const triggerKetcherExtraction = () => {
        if (iframeRef.current) {
            iframeRef.current.contentWindow.postMessage({ action: 'extract-smiles' }, '*');
        }
    };

    const triggerSubmit = async () => {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 2200));
        setLoading(false);
        setTrackingId(`HPC-${Date.now().toString(36).toUpperCase()}`);
    };

    const rates = GMX.calculatePrice(formData.mdJobs);

    return (
        <div className="w-full">
            <MolCanvas />
            <NavBar formData={formData} proteins={proteins} />

            <main className="max-w-7xl mx-auto py-12 md:py-16 px-6 space-y-32">

                {/* ── HERO SECTION ──────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

                    {/* LEFT: Text matrix */}
                    <div className="lg:col-span-6 space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-300 text-xs font-mono">
                            ⚙️ Dedicated AMD ROCm™ Linux Architecture
                        </div>
                        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white leading-none">
                            Automated Docking, MDRun, and <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Reports on Demand</span>
                        </h1>
                        <p className="text-slate-300 text-sm leading-relaxed">
                            Accelerate your drug discovery project workflow with end-to-end automation. Effortlessly stream your chemical compound libraries through high-throughput docking, launch production-grade molecular dynamics (MDRun) simulations instantly, and generate presentation-ready analytical reports on demand—all from a single, unified interface.
                        </p>

                        {/* Microsecond Calculator */}
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

                        {/* Ecosystem infocard */}
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
                                        Our automation layer seamlessly maps and accelerates your operational workflow. No automated algorithmic entity or generative model overrides your core science; instead, we implement a strict Human-in-the-Loop (HITL) validation framework. Every project receives dedicated, one-on-one professional assistance to manually verify and tailor custom parametric requirements—ensuring your unique molecular insights remain mathematically sound and biologically viable.
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
                                            <img src="assets/images/thumbs/your-profile-pic.webp" alt="Dr. Ravi Rawat"
                                                 className="w-10 h-10 rounded-full border-2 border-cyan-400 object-cover shadow-md shadow-cyan-500/20"
                                                 onError={(e) => { e.target.src = "https://via.placeholder.com/150"; }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Neural network diagram */}
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
                                    {[1,2,3,4].map(n => <div key={n} className="h-3 w-3 rounded-full bg-purple-500 dl-node" style={{animationDelay:'0.4s'}}></div>)}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="h-4 w-4 rounded-full bg-emerald-400 dl-node" style={{animationDelay:'0.8s'}}></div>
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
                    </div>
                </div>

                {/* ── SUBMISSION CONSOLE ────────────────────────── */}
                <section id="submission-console" className="pt-8">
                    <div className="w-full text-center max-w-2xl mx-auto mb-10 space-y-2">
                        <div className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold flex items-center justify-center gap-2">
                            <span className="h-1 w-3 bg-cyan-400 inline-block"></span>PRIMARY CONTROL DECK<span className="h-1 w-3 bg-cyan-400 inline-block"></span>
                        </div>
                        <h2 className="font-display text-3xl font-bold text-white tracking-tight">Initialize GROMACS Cloud Workspace with AI</h2>
                        <p className="text-xs text-slate-400">Please prioritize launching the docking screening/simulations immediately by providing receptor PDB ID and ligand structures.</p>
                    </div>

                    <div className="w-full mx-auto">
                        {trackingId ? (
                            /* ── POST-SUBMIT TRACKED WORKSPACE ── */
                            <div className="robotics-glass p-8 md:p-12 rounded-3xl space-y-8 max-w-5xl mx-auto border-t-4 border-purple-500">
                                <div className="border-b border-slate-800 pb-4">
                                    <span className="text-xs font-mono text-purple-400 uppercase tracking-widest block mb-1">Instance Secure Allocation Lock Verified</span>
                                    <h3 className="font-display text-2xl font-bold text-white">Input Workflow Molecular Parameters</h3>
                                    <p className="text-xs text-slate-500 font-mono mt-1">HPC Workspace ID: {trackingId}</p>
                                </div>
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] uppercase font-mono text-slate-400 tracking-wider">Academic / Enterprise Designation</label>
                                            <input className="input-cyber" placeholder="e.g. Senior Research Fellow / Principal Scientist" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] uppercase font-mono text-slate-400 tracking-wider">Affiliated Research Institution</label>
                                            <input className="input-cyber" placeholder="University, Department, or Lab Group" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] uppercase font-mono text-slate-400 tracking-wider">Target Disease Indication</label>
                                            <input className="input-cyber" placeholder="e.g. Oncology, Malarial, Neuro" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] uppercase font-mono text-slate-400 tracking-wider">Target Receptor PDB Notation</label>
                                            <input className="input-cyber" placeholder="Primary PDB Array" defaultValue={proteins.map(p => p.pdbCode).filter(Boolean).join(', ')} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] uppercase font-mono text-slate-400 tracking-wider">Apoprotein Variable Configuration</label>
                                            <input className="input-cyber" placeholder="Unbound structural constraints" />
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => alert("Scientific parameters loaded. Deploying target routines on compute nodes.")}
                                        className="w-full btn-action py-4 rounded-xl font-bold text-white text-xs uppercase tracking-widest shadow-xl">
                                    Engage Automated Production Topologies
                                </button>
                            </div>
                        ) : (
                            /* ── MULTI-STEP SUBMISSION FORM ── */
                            <div className="robotics-glass rounded-3xl overflow-hidden flex flex-col lg:flex-row max-w-6xl mx-auto shadow-2xl border border-cyan-500/30">
                                <div className="flex-1 p-8 md:p-12 space-y-8">
                                    <div className="flex justify-between items-center border-b border-slate-800 pb-5">
                                        <div>
                                            <h3 className="font-display font-bold text-xl text-white tracking-wide">
                                                {step === 1 ? "Step 01: Researcher Clearance Identity" : "Step 02: Cluster Configuration Metrics"}
                                            </h3>
                                            <p className="text-xs text-slate-400 mt-1">Please provide accurate contact parameters to route your direct analysis workspace report lines safely.</p>
                                        </div>
                                        <span className="text-xs font-mono bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-3 py-1 rounded-md">Stage {step} of 2</span>
                                    </div>

                                    {step === 1 ? (
                                        <div className="space-y-5">
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Researcher Full Name</label>
                                                <input className="input-cyber" placeholder="Dr. / Professor / Researcher Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                <div className="space-y-1.5 relative">
                                                    <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                        Email Address (Account Token Reference)
                                                        <button type="button" onClick={() => setActiveTooltip(activeTooltip === 'email' ? null : 'email')} className="text-cyan-400 font-bold font-mono">ⓘ</button>
                                                    </label>
                                                    {activeTooltip === 'email' && <div className="absolute z-50 bg-slate-950 border border-cyan-400 text-[11px] text-slate-300 p-3 rounded-lg shadow-xl top-14 left-0 w-full">{GMX.TOOLTIPS.email}</div>}
                                                    <input type="email" className="input-cyber" placeholder="name@institution.edu" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Active Contact Phone / WhatsApp Sequence</label>
                                                    <input type="tel" className="input-cyber" placeholder="+91 XXXXX XXXXX" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Project Short Title Tracking-Alias</label>
                                                <input className="input-cyber" placeholder="e.g. Kinase_Inhibitors_2026" value={formData.project} onChange={e => setFormData({...formData, project: e.target.value})} />
                                            </div>
                                            <div className="pt-4">
                                                <button type="button"
                                                        onClick={() => { if(formData.name && formData.email) setStep(2); else alert('Complete required identification tracks before proceeding.'); }}
                                                        className="w-full btn-action py-4 rounded-xl font-bold text-white text-xs uppercase tracking-widest shadow-xl">
                                                    Proceed → Configure Molecular Cluster Metrics
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            {/* PROTEIN INPUT DECK */}
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                        Target Receptor PDB ID(s)
                                                        <button type="button" onClick={() => setActiveTooltip(activeTooltip === 'pdb' ? null : 'pdb')} className="text-cyan-400 font-bold">ⓘ</button>
                                                    </label>
                                                    {activeTooltip === 'pdb' && <div className="absolute z-50 bg-slate-950 border border-cyan-400 text-[11px] text-slate-300 p-3 rounded-lg shadow-xl mt-8 w-72">{GMX.TOOLTIPS.pdb}</div>}
                                                    <button type="button" onClick={addProteinRow} className="text-[10px] font-mono text-cyan-400 hover:text-white border border-cyan-500/30 px-2 py-1 rounded-md transition">+ Add Protein</button>
                                                </div>
                                                {proteins.map((protein, index) => (
                                                    <div key={protein.id} className="space-y-1">
                                                        <div className="flex gap-2">
                                                            <input className="input-cyber flex-1" placeholder="e.g. 1HSG, 6LU7" maxLength={12}
                                                                   value={protein.pdbCode}
                                                                   onChange={e => verifyPdbStructure(index, e.target.value)} />
                                                            {proteins.length > 1 && (
                                                                <button type="button" onClick={() => removeProteinRow(protein.id)} className="text-slate-500 hover:text-red-400 text-xs px-2 border border-slate-800 rounded-lg transition">✕</button>
                                                            )}
                                                        </div>
                                                        {protein.labelMessage && (
                                                            <p className={`text-[10px] font-mono ${protein.status === 'valid' ? 'text-emerald-400' : protein.status === 'verifying' ? 'text-cyan-400 animate-pulse' : 'text-red-400'}`}>
                                                                {protein.status === 'verifying' ? '⏳ ' : protein.status === 'valid' ? '✔ ' : '⚠ '}{protein.labelMessage}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* LIGAND ENTRANCE DECK */}
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Ligand / Compound Library</label>
                                                    <div className="flex gap-2">
                                                        <button type="button" onClick={() => addLigandRow('smiles')} className="text-[10px] font-mono text-cyan-400 hover:text-white border border-cyan-500/30 px-2 py-1 rounded-md transition">+ SMILES</button>
                                                        <button type="button" onClick={() => addLigandRow('file')}   className="text-[10px] font-mono text-purple-400 hover:text-white border border-purple-500/30 px-2 py-1 rounded-md transition">+ Upload File</button>
                                                        <button type="button" onClick={() => addLigandRow('sketch')} className="text-[10px] font-mono text-emerald-400 hover:text-white border border-emerald-500/30 px-2 py-1 rounded-md transition">+ Sketch</button>
                                                    </div>
                                                </div>
                                                {ligands.map((ligand, index) => (
                                                    <div key={ligand.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-900 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-mono text-slate-500 uppercase">Ligand {index + 1} — {ligand.type}</span>
                                                            {ligands.length > 1 && (
                                                                <button type="button" onClick={() => removeLigandRow(ligand.id)} className="text-slate-600 hover:text-red-400 text-[10px] font-mono transition">✕ Remove</button>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                            <input type="text" className="input-cyber py-1.5 text-xs font-mono" placeholder="Name (e.g. Lead-1a)" value={ligand.name} onChange={e => { const u=[...ligands]; u[index].name=e.target.value; setLigands(u); }} />
                                                            <div className="sm:col-span-2">
                                                                {ligand.type === 'smiles' && (
                                                                    <input type="text" className="input-cyber py-1.5 text-xs font-mono flex-1 w-full" placeholder="Paste SMILES string representation" value={ligand.data} onChange={e => { const u=[...ligands]; u[index].data=e.target.value; setLigands(u); }} />
                                                                )}
                                                                {ligand.type === 'file' && (
                                                                    <div className="input-cyber py-1.5 text-xs font-mono flex items-center gap-2 cursor-pointer" onClick={() => document.getElementById(`file-upload-${ligand.id}`).click()}>
                                                                        <span className="text-cyan-400">📁</span>
                                                                        <span className="text-slate-400">{ligand.fileName || 'Click to upload .mol2 / .sdf / .pdb'}</span>
                                                                        <input id={`file-upload-${ligand.id}`} type="file" accept=".mol2,.sdf,.pdb,.mol" className="hidden" onChange={e => handleFileUpload(index, e.target.files[0])} />
                                                                    </div>
                                                                )}
                                                                {ligand.type === 'sketch' && (
                                                                    <button type="button"
                                                                            onClick={() => { setCurrentSketchIndex(index); setShowSketcher(true); }}
                                                                            className="input-cyber py-1.5 text-xs font-mono text-left w-full text-emerald-400 hover:border-emerald-500/50">
                                                                        ✏️ {ligand.data ? `SMILES: ${ligand.data.substring(0,30)}...` : 'Open Molecule Sketcher Canvas'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <label className="text-[10px] font-mono text-slate-500 uppercase">Classification:</label>
                                                            <select className="input-cyber py-1.5 text-xs font-mono bg-slate-950 w-auto" value={ligand.classification} onChange={e => { const u=[...ligands]; u[index].classification=e.target.value; setLigands(u); }}>
                                                                <option value="test">Test Ligand</option>
                                                                <option value="control">Standard Control</option>
                                                            </select>
                                                            {activeTooltip === 'ligandClass' && <div className="absolute z-50 bg-slate-950 border border-cyan-400 text-[11px] text-slate-300 p-3 rounded-lg shadow-xl w-72">{GMX.TOOLTIPS.ligandClass}</div>}
                                                            <button type="button" onClick={() => setActiveTooltip(activeTooltip === 'ligandClass' ? null : 'ligandClass')} className="text-cyan-400 text-xs">ⓘ</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* CLUSTER RUN DIMENSIONS */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Number of MD Jobs / Parallel Runs</label>
                                                    <input type="number" min="1" max="20" className="input-cyber" value={formData.mdJobs} onChange={e => setFormData({...formData, mdJobs: e.target.value})} />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Simulation Duration (µs)</label>
                                                    <input type="number" min="0.001" max="1.0" step="0.001" className="input-cyber" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} />
                                                    <p className="text-[10px] font-mono text-slate-600">= {Math.round(parseFloat(formData.duration||0)*1000) || 0} ns</p>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Discount Voucher Code</label>
                                                    <input className="input-cyber" placeholder="Enter code if applicable" value={formData.voucher} onChange={e => setFormData({...formData, voucher: e.target.value})} />
                                                </div>
                                            </div>

                                            <div className="flex gap-4 pt-2">
                                                <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition">
                                                    ← Back
                                                </button>
                                                <button type="button" onClick={triggerSubmit} disabled={loading}
                                                        className="flex-1 btn-action py-4 rounded-xl font-bold text-white text-xs uppercase tracking-widest shadow-xl disabled:opacity-60">
                                                    {loading ? '⏳ Initializing Workspace Node...' : '🚀 Launch Molecular Workspace'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* PRICE SIDEBAR */}
                                <div className="lg:w-72 p-8 bg-slate-950/80 border-t lg:border-t-0 lg:border-l border-slate-900 space-y-6 flex flex-col justify-between">
                                    <div className="space-y-4">
                                        <div className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></span> Live Estimate
                                        </div>
                                        <div className="space-y-2 text-xs font-mono">
                                            <div className="flex justify-between text-slate-400"><span>MD Jobs:</span><span className="text-white font-bold">{formData.mdJobs}</span></div>
                                            <div className="flex justify-between text-slate-400"><span>Duration:</span><span className="text-white font-bold">{Math.round(parseFloat(formData.duration||0)*1000)||0} ns</span></div>
                                            <div className="flex justify-between text-slate-400"><span>Ligands:</span><span className="text-white font-bold">{ligands.length}</span></div>
                                            <div className="flex justify-between text-slate-400"><span>Proteins:</span><span className="text-white font-bold">{proteins.filter(p=>p.pdbCode).length}</span></div>
                                        </div>
                                        <div className="border-t border-slate-900 pt-4 space-y-1">
                                            <div className="text-[10px] text-slate-500 font-mono uppercase">Estimated Cost</div>
                                            <div className="font-display text-2xl font-bold text-white">₹{rates.inr.toLocaleString()}</div>
                                            <div className="text-xs text-slate-500 font-mono">≈ ${rates.usd} USD</div>
                                        </div>
                                        <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20 text-[10px] text-slate-400 font-mono leading-relaxed">
                                            ✅ Includes RMSD, RMSF, PCA, FEL, H-Bond, MMPBSA + LLM Multimodal Report
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <a href={GMX.generateMailtoLink(formData, proteins)} className="block w-full text-center py-3 rounded-xl border border-cyan-500/30 text-cyan-400 text-xs font-mono hover:bg-cyan-500/10 transition">
                                            📧 Email Inquiry
                                        </a>
                                        <a href={GMX.generateWhatsappLink(formData, proteins, ligands)} target="_blank" rel="noopener noreferrer" className="block w-full text-center py-3 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-xs font-mono hover:bg-emerald-600/30 transition">
                                            💬 WhatsApp Consult
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* ── ANALYTICS, PUBLICATIONS, FAQS ─────────────── */}
                <AnalyticsSection />
                <PublicationsSection />
                <FaqSection />

            </main>

            <Footer formData={formData} proteins={proteins} ligands={ligands} />
            <SketcherModal
                show={showSketcher}
                iframeRef={iframeRef}
                onClose={() => { setShowSketcher(false); setCurrentSketchIndex(null); }}
                onExtract={triggerKetcherExtraction}
            />
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
console.log("[GMX] app.js mounted ✔");
})();
