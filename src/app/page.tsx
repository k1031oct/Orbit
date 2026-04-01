import styles from './page.module.css';
import { getProjects } from '@/lib/db';
import { createProject, removeProject } from './actions';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const projects = await getProjects();

  return (
    <main className={styles.main}>
      <div className={`${styles.header} animate-fade`}>
        <div className={styles.titleContainer}>
          <h1 className="title-glow" style={{ fontSize: '3.5rem', fontWeight: 800 }}>UAAM HUB</h1>
          <p className={styles.subtitle}>Unified Autonomous Android Management</p>
        </div>
      </div>

      <div className={`${styles.grid} animate-fade`}>
        {/* New Project Card */}
        <div className={`${styles.card} glass-panel ${styles.addCard}`}>
          <h2 className={styles.cardTitle}>Add New Project</h2>
          <form action={createProject} className={styles.form}>
            <div className={styles.inputGroup}>
               <input name="name" placeholder="Project Name" required />
               <input name="gasUrl" placeholder="GAS Web App URL (optional)" />
               <input name="androidPath" placeholder="C:\Path\To\Android\Project" required />
            </div>
            <button type="submit" className={styles.primaryButton}>Create Project</button>
          </form>
        </div>

        {/* Existing Project Cards */}
        {projects.map((project) => (
          <div key={project.id} className={`${styles.card} glass-panel`}>
             <div className={styles.cardHeader}>
                <div className={styles.statusDot} style={{ background: project.status === 'active' ? '#10b981' : '#f59e0b' }} />
                <h2 className={styles.cardTitle}>{project.name}</h2>
             </div>

             <div className={styles.cardBody}>
                <div className={styles.infoRow}>
                   <span className={styles.label}>ID</span>
                   <span className={styles.value}>{project.id}</span>
                </div>
                {project.gasUrl && (
                  <div className={styles.infoRow}>
                    <span className={styles.label}>GAS URL</span>
                    <span className={styles.value}>{project.gasUrl.substring(0, 30)}...</span>
                  </div>
                )}
                {!project.gasUrl && (
                  <div className={styles.infoRow}>
                    <span className={styles.label}>GAS URL</span>
                    <span style={{ fontSize: '0.85rem', color: '#f59e0b' }}>未設定</span>
                  </div>
                )}
                <div className={styles.infoRow}>
                   <span className={styles.label}>PATH</span>
                   <span className={styles.value}>{project.androidPath.substring(0, 30)}...</span>
                </div>
             </div>

             <div className={styles.cardActions}>
                <Link href={`/projects/${project.id}`} className={styles.secondaryButton}>View Details</Link>
                <form action={async () => {
                  'use server';
                  await removeProject(project.id);
                }}>
                  <button type="submit" className={styles.deleteButton}>Remove</button>
                </form>
             </div>
          </div>
        ))}
      </div>
    </main>
  );
}
