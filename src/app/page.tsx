'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Search, Plus, Settings, Globe, Package, Terminal, 
  RefreshCw, Rocket, Database, Trash2, X, Check,
  ChevronRight, Brain, Shield, Laptop, Zap, Link as LinkIcon, Edit2
} from 'lucide-react';
import { useHomeViewModel } from '../viewmodels/HomeViewModel';
import { useProjectDetailViewModel } from '../viewmodels/ProjectDetailViewModel';
import { useToast } from '../context/ToastContext';
import Link from 'next/link';

export default function Dashboard() {
  const { state: homeState, loadData: loadHome, setAddModalOpen, handleScan, handleRemoveProject, handleCreateProject } = useHomeViewModel();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { 
    state: detailState, 
    loadData: loadDetail, 
    handleBuild, 
    handleDeploy, 
    handleSyncRemote,
    handleUpdateProject,
    handleUpdateRequirement,
    handleAddRequirement,
    handleRemoveRequirement,
    handleChangeRequirementStatus,
    toggleConsole
  } = useProjectDetailViewModel(selectedProjectId);

  const { toasts } = useToast();
  const lastLogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHome();
  }, [loadHome]);

  useEffect(() => {
    if (selectedProjectId) loadDetail();
  }, [selectedProjectId, loadDetail]);

  useEffect(() => {
    if (lastLogRef.current) {
      lastLogRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [detailState.consoleLogs, toasts]);

  return (
    <div className="orbit-dashboard animate-fade">
      {/* Header HUD: Branding & Global Actions */}
      <header className="shrink-0 flex flex-row items-center justify-between px-2">
        <div className="flex flex-row items-center gap-10">
          <div className="flex flex-col">
            <h1 className="orbit-brand-title text-5xl leading-none italic">ORBIT</h1>
            <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.5em] italic mt-1 font-mono">Control Engine v0.5.3</p>
          </div>
          <div className="h-10 w-[1px] bg-white/5" />
          <nav className="flex flex-row items-center gap-8 text-[11px] font-black uppercase tracking-widest italic text-white/40">
             <span className="text-indigo-400 cursor-default">Dashboard</span>
             <Link href="/settings" className="hover:text-white transition-colors">Settings</Link>
          </nav>
        </div>

        <div className="flex flex-row items-center gap-6">
          <button 
            onClick={() => setAddModalOpen(true)}
            className="orbit-btn orbit-btn-primary h-12 px-8"
          >
            <Plus size={16} /> <span>Initialize Node</span>
          </button>
          <div className="w-12 h-12 bg-white/5 flex items-center justify-center rounded-xl">
             <Brain size={20} className="text-white/20" />
          </div>
        </div>
      </header>

      {/* Primary Command Hull */}
      <main className="orbit-command-hull">
        
        {/* Sidebar: Project Registry */}
        <aside className="orbit-sidebar">
          <div className="flex flex-row items-center justify-between px-2 opacity-40">
            <div className="flex flex-row items-center gap-4">
              <Database size={16} />
              <h2 className="text-[11px] font-black uppercase tracking-[0.4em] italic">Registry</h2>
            </div>
            <button onClick={handleScan} className="hover:text-indigo-400 transition-colors">
              <RefreshCw size={14} className={homeState.isScanning ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3 custom-scrollbar">
            {homeState.projects.map((p) => (
              <div 
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                className={`orbit-card-refined orbit-card-interactive cursor-pointer group flex flex-col gap-4 ${selectedProjectId === p.id ? 'border-indigo-500/40 bg-indigo-500/5' : ''}`}
              >
                <div className="flex flex-row items-center justify-between">
                  <div className={`orbit-badge ${selectedProjectId === p.id ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/20' : 'text-white/20'}`}>
                    STANDBY
                  </div>
                  <span className="text-[10px] font-mono text-white/10 group-hover:text-white/30 transition-colors">NODE_{p.id.slice(0,4)}</span>
                </div>
                <div className="flex flex-row items-center justify-between">
                  <h3 className={`text-2xl font-black italic tracking-tighter uppercase ${selectedProjectId === p.id ? 'text-white' : 'text-white/60'}`}>
                    {p.name}
                  </h3>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleRemoveProject(p.id, p.name); }}
                    className="opacity-0 group-hover:opacity-40 hover:!opacity-100 p-2 text-rose-500 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {homeState.projects.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center opacity-10 gap-4">
                 <Search size={48} />
                 <p className="text-xs font-mono uppercase tracking-widest">Registry Empty</p>
              </div>
            )}
          </div>
        </aside>

        {/* Main Canvas: Mission Control */}
        <section className="orbit-canvas">
          {selectedProjectId ? (
            <ProjectDetailView 
              projectId={selectedProjectId} 
              state={detailState}
              onBuild={handleBuild}
              onDeploy={handleDeploy}
              onSync={handleSyncRemote}
              onUpdateProject={handleUpdateProject}
              onUpdateRequirement={handleUpdateRequirement}
              onAddRequirement={handleAddRequirement}
              onRemoveRequirement={handleRemoveRequirement}
              onChangeRequirementStatus={handleChangeRequirementStatus}
              onToggleConsole={toggleConsole}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 opacity-20">
               <Zap size={64} className="text-indigo-400 animate-pulse" />
               <div className="text-center">
                 <h2 className="text-2xl font-black italic tracking-tighter uppercase">No Active Mission</h2>
                 <p className="text-[10px] font-mono tracking-[0.4em] uppercase mt-2">Select a tactical node from registry</p>
               </div>
            </div>
          )}
        </section>
      </main>

      {/* Footer HUD: Heartbeat & Logs */}
      <footer className="orbit-hud">
        <div className="flex flex-row items-center gap-10">
          <div className="flex flex-row items-center gap-3 text-indigo-400">
             <Zap size={16} fill="currentColor" />
             <span className="text-[11px] font-black uppercase tracking-[0.4em] italic">Heartbeat</span>
          </div>
          <div className="h-6 w-[1px] bg-white/5" />
          <div className="flex-1 flex flex-row items-center gap-6 overflow-hidden">
            {toasts.length > 0 ? (
              toasts.map((t, i) => (
                <div key={i} className="flex flex-row items-center gap-3 animate-fade whitespace-nowrap">
                  <span className="text-[9px] font-mono text-white/20">[{new Date().toLocaleTimeString()}]</span>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${t.type === 'error' ? 'text-rose-500' : 'text-white/60'}`}>
                    {t.message}
                  </span>
                </div>
              ))
            ) : (
              <span className="text-[10px] font-mono text-white/5 uppercase italic tracking-widest">
                Registry Standby... Awaiting command
              </span>
            )}
            <div ref={lastLogRef} />
          </div>
        </div>
      </footer>

      {/* Initializer Modal: Fix (v1.5) */}
      {homeState.isAddModalOpen && (
        <div className="orbit-modal-overlay">
           <div className="orbit-modal-content p-12">
              <header className="flex flex-row items-center justify-between mb-12">
                 <div className="flex flex-col">
                    <h2 className="orbit-brand-title text-4xl italic">Bootstrap Node</h2>
                    <p className="text-[9px] font-mono text-indigo-400 uppercase tracking-widest mt-1">Establishing Deployment Environment</p>
                 </div>
                 <button onClick={() => setAddModalOpen(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                    <X size={24} />
                 </button>
              </header>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleCreateProject(
                   formData.get('name') as string,
                   formData.get('gasUrl') as string,
                   formData.get('gitUrl') as string
                );
              }} className="flex flex-col gap-10">
                 <div className="flex flex-col gap-4">
                    <label className="orbit-label ml-2">Node Identifier</label>
                    <input 
                      name="name"
                      required
                      placeholder="MISSION_NAME"
                      className="orbit-input py-6 px-10 text-2xl font-black italic tracking-tight uppercase placeholder:text-white/5 focus:border-indigo-500/40 outline-none transition-all w-full"
                    />
                 </div>

                 <div className="grid grid-cols-1 gap-10">
                    <div className="flex flex-col gap-4">
                        <label className="orbit-label ml-2">Git Remote Hub (Optional)</label>
                        <input 
                          id="gitUrl"
                          name="gitUrl"
                          placeholder="https://github.com/command/node.git"
                          className="orbit-input py-4 px-6 font-mono text-sm text-white placeholder:text-white/5 focus:border-indigo-500/20 outline-none transition-all w-full"
                        />
                    </div>
                    <div className="flex flex-col gap-4">
                        <label className="orbit-label ml-2">Sync Hub URL (GAS)</label>
                        <input 
                          name="gasUrl"
                          placeholder="https://script.google.com/macros/s/..."
                          className="orbit-input py-4 px-6 font-mono text-sm text-white placeholder:text-white/5 focus:border-indigo-500/20 outline-none transition-all w-full"
                        />
                    </div>
                 </div>

                 <div className="pt-8 flex flex-row gap-4">
                    <button 
                      type="submit"
                      className="flex-1 orbit-btn orbit-btn-primary h-20 text-sm shadow-[0_30px_60px_-15px_hsla(var(--indigo),0.3)]"
                    >
                       <Rocket size={20} /> <span>任務を起動する</span>
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}

function ProjectDetailView({ 
  projectId, 
  state, 
  onBuild, 
  onDeploy, 
  onSync,
  onUpdateProject,
  onUpdateRequirement,
  onAddRequirement,
  onRemoveRequirement,
  onChangeRequirementStatus,
  onToggleConsole 
}: any) {
  const [newReq, setNewReq] = useState({ title: '', target: 'Core' });
  const project = state.project;

  // In-place editing state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (id: number | null, field: string, value: string) => {
    setEditingId(id);
    setEditingField(field);
    setEditValue(value || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingField(null);
  };

  const saveEdit = () => {
    if (editingId === null) {
      // Special case: editing project metadata (use -1 or specific string target)
      if (editingField === 'gitUrl') onUpdateProject({ gitUrl: editValue });
      if (editingField === 'gasUrl') onUpdateProject({ gasUrl: editValue });
    } else {
      onUpdateRequirement(editingId, { [editingField!]: editValue });
    }
    cancelEdit();
  };

  if (state.isLoading) return <div className="flex-1 flex items-center justify-center animate-pulse text-white/20 font-black italic tracking-widest uppercase">Syncing Node...</div>;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Detail Header: Interactive & Localized */}
      <header className="p-10 pb-0 shrink-0">
        <div className="flex flex-row items-center justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex flex-row items-center gap-4">
              <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl">
                 <Package size={24} />
              </div>
              <h2 className="orbit-brand-title text-4xl italic text-white uppercase">{project?.name}</h2>
            </div>
            <p className="text-[10px] font-mono tracking-[0.3em] uppercase text-white/20 mt-2 italic px-2">MISSION ACTIVE | {project?.androidPath}</p>
          </div>

          <div className="flex flex-row items-center gap-4">
            <div className="flex flex-row p-1 bg-white/[0.02] border border-white/5 rounded-xl gap-3">
              <button 
                onClick={onSync} 
                title="同期: リモートから最新の要件・コードを読み込みます"
                className="orbit-btn orbit-btn-ghost border-none px-6"
              >
                 <Globe size={14} className="text-indigo-400 opacity-60" />
                 <span>同期</span>
              </button>
              <button 
                onClick={onBuild} 
                title="ビルド: ソースコードから実行バイナリ(APK)を生成します"
                className={`orbit-btn orbit-btn-ghost border-none px-6 ${state.isBuilding ? 'animate-pulse text-indigo-400' : ''}`}
              >
                 <Zap size={14} className="text-indigo-400 opacity-60" />
                 <span>ビルド</span>
              </button>
              <button 
                onClick={onDeploy} 
                title="配備: ビルドしたアプリを実機へインストール・起動します"
                className={`orbit-btn orbit-btn-ghost border-none px-6 ${state.isDeploying ? 'animate-pulse text-indigo-400' : ''}`}
              >
                 <Rocket size={14} className="text-indigo-400 opacity-60" />
                 <span>配備</span>
              </button>
              <div className="w-[1px] h-6 bg-white/5 mx-2" />
              <button onClick={() => onToggleConsole()} className="orbit-btn orbit-btn-ghost border-none px-6">
                 <Terminal size={14} className="text-white/40" />
                 <span>コンソール</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Detail Hull */}
      <div className="flex-1 flex flex-row gap-10 p-10 min-h-0 overflow-y-auto custom-scrollbar">
        
        {/* Objectives: Interactive Requirements Stream */}
        <div className="flex-[1.5] flex flex-col gap-8">
           <div className="flex flex-row items-center gap-4 ml-4 opacity-30">
              <Shield size={18} className="text-indigo-400" />
              <h3 className="text-[11px] font-black uppercase tracking-[0.4em] italic text-white font-mono">主要任務 / Objectives</h3>
           </div>
           
           <div className="flex flex-col gap-4">
              <div className="flex flex-row gap-4 px-2">
                 <input 
                   placeholder="新しい任務を入力..." 
                   value={newReq.title}
                   onChange={(e) => setNewReq({...newReq, title: e.target.value})}
                   onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onAddRequirement(newReq.title, '', newReq.target);
                        setNewReq({ title: '', target: 'Core' });
                      }
                   }}
                   className="flex-1 orbit-input py-4 px-8 font-mono text-sm border-white/10 focus:border-indigo-500/20 outline-none italic"
                 />
                 <select 
                   value={newReq.target}
                   onChange={(e) => setNewReq({...newReq, target: e.target.value})}
                   className="orbit-card-refined bg-black/40 py-4 px-6 font-mono text-[10px] uppercase border-white/5 outline-none cursor-pointer text-indigo-400"
                 >
                    <option value="Core">Core</option>
                    <option value="UI">UI</option>
                    <option value="Native">Native</option>
                 </select>
              </div>

              {state.requirements.map((req: any) => (
                <div key={req.id} className="orbit-card-refined p-8 bg-white/[0.01] hover:bg-white/[0.03] flex flex-row items-center gap-8 group animate-fade relative border-white/5 transition-all">
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${req.status === 'Done' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-white/10 text-white/5'}`}>
                       {req.status === 'Done' && <Check size={16} />}
                    </div>
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="flex flex-row items-center gap-4">
                       <span className="text-[9px] font-mono text-indigo-500/40 font-bold uppercase tracking-widest">{req.target || 'Core'}</span>
                       {editingId === req.id && editingField === 'title' ? (
                          <div className="flex flex-row items-center gap-2 flex-1">
                             <input 
                               autoFocus
                               value={editValue}
                               onChange={(e) => setEditValue(e.target.value)}
                               onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                               onBlur={saveEdit}
                               className="bg-black border-b border-indigo-500/40 text-xl font-black italic tracking-tighter uppercase outline-none flex-1 text-white px-2 py-1"
                               style={{ background: '#000' }}
                             />
                          </div>
                       ) : (
                          <div 
                            onClick={() => startEdit(req.id, 'title', req.title)}
                            className="flex flex-row items-center gap-3 cursor-text group/title"
                          >
                            <h4 className="text-xl font-black italic tracking-tighter uppercase text-white/80 group-hover/title:text-white transition-colors">{req.title}</h4>
                            <Edit2 size={12} className="opacity-0 group-hover/title:opacity-40" />
                          </div>
                       )}
                    </div>
                    <p className="text-xs text-white/20 font-mono italic leading-relaxed truncate">{req.description || 'No detailed briefing added.'}</p>
                  </div>

                  <div className="flex flex-row items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button 
                       onClick={() => onChangeRequirementStatus(req.id, req.status === 'Done' ? 'Todo' : 'Done')}
                       className={`orbit-btn h-10 w-24 p-0 text-[10px] ${req.status === 'Done' ? 'bg-black/40 text-white/40 border-white/10' : 'orbit-btn-primary border-none shadow-lg'}`}
                     >
                        {req.status === 'Done' ? '未完了' : '達成'}
                     </button>
                     <button 
                       onClick={() => onRemoveRequirement(req.id)}
                       className="p-3 text-white/10 hover:text-rose-500 transition-colors"
                     >
                        <Trash2 size={14} />
                     </button>
                  </div>
                </div>
              ))}
           </div>
        </div>

        {/* Mission Metadata: Tactical Info Hub */}
        <div className="flex-1 flex flex-col gap-8">
           <div className="flex flex-row items-center gap-4 ml-4 opacity-30">
              <Laptop size={18} className="text-indigo-400" />
              <h3 className="text-[11px] font-black uppercase tracking-[0.4em] italic text-white font-mono">メタデータ / Metadata</h3>
           </div>
           
           <div className="orbit-card-refined p-10 bg-white/[0.01] flex flex-col gap-10">
              {/* Local Path */}
              <div className="flex flex-row gap-6">
                 <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <Database size={20} className="text-white/20" />
                 </div>
                 <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Local Tactical Path</span>
                    <span className="text-xs font-mono text-white/40 break-all leading-relaxed italic">{project?.androidPath}</span>
                 </div>
              </div>

              {/* Git URL: Interactive */}
              <div className="flex flex-row gap-6">
                 <div className="w-12 h-12 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center shrink-0">
                    <Globe size={20} className="text-indigo-400/60" />
                 </div>
                 <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400/40">GitHub Remote Origin</span>
                    {editingId === null && editingField === 'gitUrl' ? (
                       <input 
                         autoFocus
                         value={editValue}
                         onChange={(e) => setEditValue(e.target.value)}
                         onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                         onBlur={saveEdit}
                         className="orbit-input border-b border-indigo-500/40 text-xs font-mono text-white outline-none w-full italic py-1 px-2"
                       />
                    ) : (
                       <div 
                         onClick={() => startEdit(null, 'gitUrl', project?.gitUrl)}
                         className="flex flex-row items-center gap-2 cursor-text group/meta"
                       >
                         <span className="text-xs font-mono text-white/60 truncate italic max-w-full group-hover/meta:text-white transition-colors">{project?.gitUrl || 'Empty Origin'}</span>
                         <Edit2 size={12} className="opacity-0 group-hover/meta:opacity-40 shrink-0" />
                       </div>
                    )}
                 </div>
              </div>

              {/* GAS URL: Interactive */}
              <div className="flex flex-row gap-6">
                 <div className="w-12 h-12 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center shrink-0">
                    <LinkIcon size={20} className="text-emerald-400/60" />
                 </div>
                 <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400/40">Sync Hub URL (GAS)</span>
                    {editingId === null && editingField === 'gasUrl' ? (
                       <input 
                         autoFocus
                         value={editValue}
                         onChange={(e) => setEditValue(e.target.value)}
                         onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                         onBlur={saveEdit}
                         className="orbit-input border-b border-indigo-500/40 text-xs font-mono text-white outline-none w-full italic py-1 px-2"
                       />
                    ) : (
                       <div 
                         onClick={() => startEdit(null, 'gasUrl', project?.gasUrl)}
                         className="flex flex-row items-center gap-2 cursor-text group/meta"
                       >
                         <span className="text-xs font-mono text-white/60 truncate italic max-w-full group-hover/meta:text-white transition-colors">{project?.gasUrl || 'Missing Hub Link'}</span>
                         <Edit2 size={12} className="opacity-0 group-hover/meta:opacity-40 shrink-0" />
                       </div>
                    )}
                 </div>
              </div>

              {/* Status HUD Inside Info Hub */}
              <div className="flex flex-row items-center justify-between pt-10 border-t border-white/5 opacity-40">
                 <div className="flex flex-row items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-mono uppercase tracking-[0.2em] italic">System Integrated</span>
                 </div>
                 <span className="text-[10px] font-black italic tracking-widest uppercase">UPTIME: 100%</span>
              </div>
           </div>
        </div>
      </div>
      
      {/* Dynamic Overlay Components */}
      {state.isConsoleVisible && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-3xl z-50 flex flex-col p-16 animate-fade">
           <header className="shrink-0 flex flex-row items-center justify-between mb-8">
              <div className="flex flex-row items-center gap-6">
                 <div className="p-3 bg-white/5 rounded-xl">
                    <Terminal size={24} className="text-indigo-400" />
                 </div>
                 <h2 className="orbit-brand-title text-4xl italic uppercase">Tactical Console</h2>
              </div>
              <button onClick={() => onToggleConsole(false)} className="orbit-btn orbit-btn-ghost h-14 px-8 border-white/10">
                 <ChevronRight size={18} /> <span>Close Feed</span>
              </button>
           </header>
           <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-10 font-mono text-sm overflow-y-auto custom-scrollbar">
              {state.consoleLogs.map((log: string, idx: number) => (
                <div key={idx} className="flex flex-row gap-6 mb-2 border-l border-white/5 pl-4 hover:border-indigo-500/40 transition-colors">
                  <span className="text-white/20 shrink-0">[{idx.toString().padStart(3, '0')}]</span>
                  <span className="text-white/60 leading-relaxed italic">{log}</span>
                </div>
              ))}
              {state.consoleLogs.length === 0 && (
                 <div className="h-full flex items-center justify-center text-white/5 italic">No telemetry data received...</div>
              )}
           </div>
        </div>
      )}
    </div>
  );
}
