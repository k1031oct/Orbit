'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Plus, Trash2, ShieldCheck, 
  RefreshCw, CheckCircle2, 
  History, Target, Layers, Globe, Terminal,
  Play, Rocket, Bot, ShieldAlert, X
} from 'lucide-react';
import { useProjectDetailViewModel } from '../../../viewmodels/ProjectDetailViewModel';
import { LocalRequirement, DecisionLog } from '../../../lib/models/types';
import { ConsoleViewer } from '../../../components/ConsoleViewer';

function ProjectDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const { 
    state, 
    loadData, 
    handleAddRequirement, 
    handleChangeRequirementStatus, 
    handleRemoveRequirement, 
    handleScanProject,
    handleSyncRemote,
    handleBuild,
    handleDeploy,
    toggleConsole,
    appendLog
  } = useProjectDetailViewModel(id);

  const { project, requirements, logs, isLoading, isScanning, isBuilding, isDeploying } = state;

  useEffect(() => {
    if (id) loadData();
  }, [id, loadData]);

  if (isLoading) {
    return <div className="orbit-w-full h-screen flex justify-center items-center text-white/10 font-black uppercase tracking-[0.4em] animate-pulse italic">Initializing Control Engine...</div>;
  }

  if (!project) {
    return (
      <div className="orbit-w-full h-screen flex flex-col justify-center items-center gap-10 text-white">
        <h1 className="orbit-brand-title text-4xl">Node Not Found</h1>
        <Link href="/" className="orbit-button orbit-button-primary px-10 py-5">Return to Registry</Link>
      </div>
    );
  }

  const onAddReqSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const target = formData.get('target') as string;
    handleAddRequirement(title, description, target);
    setIsAddModalOpen(false);
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col" style={{ background: '#050505' }}>
      
      {/* 🚀 Header: Stabilized Quad-Directional Layout */}
      <header className="shrink-0 flex flex-row items-center justify-between px-10 py-8 border-b border-white/[0.03] bg-black/40 backdrop-blur-xl z-20">
        
        {/* Top-Left: Identity Area */}
        <div className="flex flex-row items-center gap-8">
          <Link href="/" className="orbit-button orbit-button-ghost w-14 h-14 rounded-2xl flex justify-center items-center p-0 border-white/10">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex flex-col">
            <div className="flex flex-row items-center gap-4">
              <h1 className="orbit-brand-title text-4xl leading-none">{project.name}</h1>
              <div className="orbit-badge orbit-badge-active">
                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                <span className="text-[10px]">Mission Active</span>
              </div>
            </div>
            <p className="text-[9px] text-white/20 font-mono uppercase tracking-[0.3em] mt-1 italic">ENDPOINT: <span className="text-white/40">{project.androidPath}</span></p>
          </div>
        </div>
        
        {/* Top-Right: Unified Control Center */}
        <div className="flex flex-row items-center gap-6">
           
           <button 
             onClick={() => setIsAddModalOpen(true)}
             className="orbit-button orbit-button-primary px-10 py-5 rounded-2xl shadow-[0_20px_40px_rgba(255,255,255,0.05)]"
           >
              <Plus size={18} />
              <span>New Task</span>
           </button>

           <div className="w-[1px] h-8 bg-white/5 mx-2" />

           <div className="flex flex-row p-1.5 bg-white/[0.02] border border-white/5 rounded-2xl items-center">
             <button onClick={handleSyncRemote} className="orbit-button orbit-button-ghost border-none hover:bg-white/5 px-5 py-3 group">
                <Globe size={16} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                <span className="text-indigo-400">Sync</span>
             </button>
             <div className="w-[1px] h-4 bg-white/5 mx-1" />
             <button onClick={handleBuild} disabled={isBuilding} className="orbit-button orbit-button-ghost border-none hover:bg-white/5 px-5 py-3 group disabled:opacity-30">
                <Play size={16} className={`group-hover:scale-110 ${isBuilding ? 'animate-pulse text-emerald-500' : 'text-white/20'}`} />
                <span className={isBuilding ? 'text-emerald-400 font-black' : 'text-white/20'}>Build</span>
             </button>
             <button onClick={handleDeploy} disabled={isDeploying} className="orbit-button orbit-button-ghost border-none hover:bg-white/5 px-5 py-3 group disabled:opacity-30">
                <Rocket size={16} className={`group-hover:scale-110 ${isDeploying ? 'animate-bounce text-indigo-400' : 'text-indigo-400'}`} />
                <span className="text-indigo-400 font-black">Deploy</span>
             </button>
           </div>

           <button onClick={handleScanProject} disabled={isScanning} className="orbit-button orbit-button-ghost w-14 h-14 border-white/5 rounded-2xl p-0 hover:bg-white/5">
              <RefreshCw size={22} className={isScanning ? 'animate-spin text-white' : 'opacity-20'} />
           </button>
        </div>
      </header>

      {/* 🎯 Main Canvas: Physical Grid Container */}
      <main className="flex-1 overflow-y-auto px-10 py-12 custom-scrollbar bg-black/10">
        <div className="max-w-6xl mx-auto flex flex-col gap-12">
          
          <div className="flex flex-col gap-6">
             <div className="flex flex-row items-center gap-3 ml-2 opacity-30">
                <Target size={18} />
                <h2 className="text-[10px] font-black uppercase tracking-[0.5em] italic text-white">Objective Stream</h2>
             </div>

             <div className="flex flex-col gap-4">
               {requirements.length === 0 ? (
                 <div className="orbit-card py-40 border-dashed border-white/5 flex flex-col justify-center items-center gap-5 opacity-10">
                    <Layers size={48} />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em]">Empty Canvas</span>
                 </div>
               ) : (
                 requirements.map((req: LocalRequirement) => (
                    <div key={req.id} className="orbit-group orbit-relative orbit-card orbit-card-interactive p-12 pr-40 transition-all hover:bg-indigo-500/[0.01]">
                       <div className="flex flex-row items-start gap-8">
                          <button 
                            onClick={() => handleChangeRequirementStatus(req.id, req.status === 'Done' ? 'Todo' : 'Done')}
                            className={`transition-all hover:scale-110 mt-1 ${req.status === 'Done' ? 'text-emerald-500' : 'text-white/10 hover:text-white'}`}
                          >
                             <CheckCircle2 size={32} />
                          </button>
                          <div className="flex flex-col gap-2">
                             <div className="flex flex-row items-center gap-3">
                                <span className={`text-xl font-black italic tracking-tighter uppercase ${req.status === 'Done' ? 'line-through text-white/10' : 'text-white'}`}>{req.title}</span>
                                {req.target && <span className="orbit-badge bg-indigo-500/10 border-indigo-500/10 text-indigo-400 px-2 py-0.5">{req.target}</span>}
                             </div>
                             {req.description && <p className="text-xs text-white/30 leading-relaxed font-mono italic max-w-xl">{req.description}</p>}
                          </div>
                       </div>
                       
                       {/* 🗑️ Trash: Anchored Right Centralized */}
                       <button 
                        onClick={() => handleRemoveRequirement(req.id)}
                        className="orbit-absolute-right on-orbit-group-hover w-12 h-12 bg-white/[0.02] border border-white/5 rounded-2xl flex justify-center items-center text-white/10 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                       >
                          <Trash2 size={20} />
                       </button>
                    </div>
                 ))
               )}
             </div>
          </div>
          
          <div className="w-[1px] h-24 bg-white/[0.03] mx-auto" />

          {/* Monitoring Area: Physical Spacing */}
          <div className="flex flex-row items-stretch gap-8 pb-32">
             <div className="flex-1 orbit-card p-12 bg-rose-500/[0.01] border-rose-500/10">
                <div className="flex flex-row items-center gap-4 mb-8">
                   <ShieldAlert size={20} className="text-rose-500/50" />
                   <h3 className="text-[11px] font-black uppercase tracking-[0.3em] italic text-rose-500/80">Physical Guardrails</h3>
                </div>
                <div className="flex flex-col gap-4">
                   <div className="p-6 bg-black/40 rounded-2xl border border-white/[0.03]">
                      <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest italic opacity-60 mb-2">Strict No-XML</div>
                      <p className="text-[10px] text-white/20 font-mono leading-relaxed">Core layout inflation via XML is physically blocked by the brand harvester system.</p>
                   </div>
                </div>
             </div>

             <div className="flex-1 orbit-card p-12 bg-white/[0.01]">
                <div className="flex flex-row items-center gap-4 mb-8">
                   <ShieldCheck size={20} className="text-emerald-500/50" />
                   <h3 className="text-[11px] font-black uppercase tracking-[0.3em] italic text-white/60">Node Metrics</h3>
                </div>
                <div className="flex flex-col gap-6">
                   <div className="flex justify-between border-b border-white/5 pb-6">
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Compiler v.</span>
                      <span className="text-[10px] font-mono text-white/40">{project.latestVersion || 'STAB_V0.4.1'}</span>
                   </div>
                   <div className="flex justify-between">
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Node Flow</span>
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">Connection High</span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </main>

      {/* 🛡️ Consolidated Bottom HUD: Rigidly Anchored */}
      <footer className="shrink-0 h-16 border-t border-white/[0.03] bg-black/80 backdrop-blur-3xl px-10 flex flex-row items-center justify-between z-20">
         <div className="flex flex-row items-center gap-12 min-w-0">
            <div className="flex flex-row items-center gap-3">
               <Bot size={18} className="text-white/20 animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 italic">Control Engine</span>
            </div>
            <div className="flex flex-row items-center gap-4 min-w-0 opacity-20">
               <History size={16} className="shrink-0" />
               <p className="text-[11px] font-mono truncate tracking-tight text-white/80 uppercase">
                 {logs.length > 0 ? `Latest: ${logs[0].decision}` : 'Monitoring autonomous heartbeat signals...'}
               </p>
            </div>
         </div>

         <div className="flex flex-row items-center gap-8">
            <div className="flex flex-row items-center gap-4 text-[9px] font-black tracking-[0.5em] text-white/10 uppercase italic">
               <span>Mem: Ready</span>
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
               <span>Buffer: Clean</span>
            </div>
            <button onClick={() => toggleConsole()} className="w-10 h-10 flex justify-center items-center rounded-xl bg-white/[0.02] border border-white/5 text-white/20 hover:text-white transition-all p-0">
                <Terminal size={18} className={state.isConsoleVisible ? 'text-indigo-400' : ''} />
            </button>
         </div>
      </footer>

      {/* 🚀 System Modal Layer: Physics Fixed */}
      {isAddModalOpen && (
        <div className="orbit-modal-overlay">
           <div className="orbit-modal-content orbit-card" style={{ padding: '0px' }}>
              <div className="flex flex-row items-center justify-between p-10 border-b border-white/5">
                 <div className="flex flex-row items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex justify-center items-center text-white/40">
                       <Plus size={24} />
                    </div>
                    <h2 className="orbit-brand-title text-2xl">Activate Task</h2>
                 </div>
                 <button onClick={() => setIsAddModalOpen(false)} className="w-10 h-10 flex justify-center items-center rounded-full hover:bg-white/5 text-white/10 transition-all">
                    <X size={20} />
                 </button>
              </div>

              <form onSubmit={onAddReqSubmit} className="p-10 flex flex-col gap-10">
                 <div className="flex flex-col">
                    <label className="orbit-label">Objective Label</label>
                    <input name="title" className="orbit-input py-6 px-10 text-xl font-black" placeholder="Define mission goal..." required autoFocus />
                 </div>
                 
                 <div className="flex flex-col">
                    <label className="orbit-label">Domain Scope</label>
                    <input name="target" className="orbit-input py-5 px-8 text-sm font-mono" placeholder="UI, Logic, DB etc..." />
                 </div>

                 <div className="flex flex-col">
                    <label className="orbit-label">Engineering Spec</label>
                    <textarea name="description" className="orbit-input py-6 px-10 text-sm font-mono min-h-[140px] leading-relaxed" placeholder="Detailed engineering documentation..." />
                 </div>

                 <button type="submit" className="orbit-button orbit-button-primary w-full py-7 rounded-[32px] shadow-[0_30px_60px_-10px_rgba(255,255,255,0.05)]">
                    Activate Engineering Cycle
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* Real-time Console Drawer */}
      <ConsoleViewer 
        logs={state.consoleLogs} 
        isVisible={state.isConsoleVisible} 
        onClose={() => toggleConsole(false)}
        onClear={() => {}}
      />
    </div>
  );
}

export default function ProjectDetail() {
  return (
    <Suspense fallback={<div>Loading Page...</div>}>
      <ProjectDetailContent />
    </Suspense>
  );
}
