import { getProject, updateProjectStatus } from '@/lib/db';
import { fetchRequirements, Requirement } from '@/lib/gas';
import styles from './project.module.css';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { editProject } from '@/app/actions';

export const dynamic = 'force-dynamic';

export default async function ProjectDetail({ params }: { params: { id: string } }) {
  const project = await getProject(params.id);

  if (!project) {
    return <div style={{ padding: '4rem', textAlign: 'center' }}>Project not found</div>;
  }

  let requirements: Requirement[] = [];
  let error = null;

  if (project.gasUrl) {
    try {
      requirements = await fetchRequirements(project.gasUrl);
    } catch (e: any) {
      error = e.message;
    }
  }

  const syncAction = async () => {
    'use server';
    await updateProjectStatus(params.id, 'active', new Date().toISOString());
    revalidatePath(`/projects/${params.id}`);
  };

  const editAction = editProject.bind(null, params.id);

  return (
    <main className={styles.main}>
      <header className={`${styles.header} animate-fade`}>
        <Link href="/" className={styles.backLink}>← Back to Hub</Link>
        <div className={styles.headerTitle}>
           <h1 className="title-glow">{project.name}</h1>
           <span className={styles.statusBadge} style={{ background: project.status === 'active' ? '#10b981' : '#f59e0b' }}>
              {project.status.toUpperCase()}
           </span>
        </div>
        <p className={styles.path}>Root: {project.androidPath}</p>
      </header>

      <div className={styles.content}>
        {/* Edit Card */}
        <div className={`${styles.card} glass-panel animate-fade`}>
          <div className={styles.cardHeader}>
            <h2>Project Settings</h2>
          </div>
          <form action={editAction} className={styles.editForm}>
            <div className={styles.editGrid}>
              <div className={styles.editField}>
                <label>Project Name</label>
                <input name="name" defaultValue={project.name} required />
              </div>
              <div className={styles.editField}>
                <label>GAS Web App URL <span style={{ color: '#f59e0b', fontSize: '0.8rem' }}>(Optional)</span></label>
                <input name="gasUrl" defaultValue={project.gasUrl ?? ''} placeholder="https://script.google.com/..." />
              </div>
              <div className={styles.editField}>
                <label>Android Project Path</label>
                <input name="androidPath" defaultValue={project.androidPath} required />
              </div>
              <div className={styles.editField}>
                <label>Description</label>
                <input name="description" defaultValue={project.description ?? ''} placeholder="Project description..." />
              </div>
            </div>
            <button type="submit" className={styles.syncButton}>Save Changes</button>
          </form>
        </div>

        {/* Requirements Card */}
        <div className={`${styles.card} glass-panel animate-fade`}>
          <div className={styles.cardHeader}>
             <h2>Development Roadmap</h2>
             {project.gasUrl && (
               <form action={syncAction}>
                  <button type="submit" className={styles.syncButton}>Refresh from GAS</button>
               </form>
             )}
             {!project.gasUrl && (
               <span style={{ fontSize: '0.85rem', color: '#f59e0b' }}>GAS URL を設定すると要件を同期できます</span>
             )}
          </div>

          {error && <div className={styles.errorBanner}>Sync Error: {error}</div>}

          {!project.gasUrl && (
            <p className={styles.empty} style={{ color: '#a0aec0' }}>
              Project Settings で GAS Web App URL を設定してください。
            </p>
          )}

          <div className={styles.requirementList}>
             {project.gasUrl && requirements.length === 0 && !error && (
               <p className={styles.empty}>No requirements found in spreadsheet.</p>
             )}
             {requirements.map((req) => (
               <div key={req.id} className={styles.reqItem}>
                  <div className={styles.reqStatus}>
                     <div className={styles.statusIcon}
                          style={{ borderColor: req.status === 'Done' ? '#10b981' : req.status === 'In Progress' ? '#3b82f6' : '#6b7280' }}>
                        {req.status === 'Done' && '✓'}
                     </div>
                  </div>
                  <div className={styles.reqInfo}>
                     <div className={styles.reqHeader}>
                        <span className={styles.reqId}>{req.id}</span>
                        <h3>{req.title}</h3>
                     </div>
                     <p className={styles.reqDesc}>{req.description}</p>
                     {req.target && <span className={styles.reqTarget}>Target: {req.target}</span>}
                  </div>
                  <div className={styles.badge} style={{ background: req.status === 'Done' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)' }}>
                     {req.status}
                  </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </main>
  );
}
