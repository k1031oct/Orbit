import { Command } from '@tauri-apps/plugin-shell';

/**
 * Git 操作（クローン、プル、ステータス確認）を統括するリポジトリ
 */
export const GitRepository = {
  /**
   * リモートリポジトリをローカルにクローンする
   */
  async clone(url: string, targetPath: string): Promise<{ success: boolean, error?: string }> {
    if (!url || url.trim() === '') {
      return { success: false, error: 'Repository URL is required for cloning.' };
    }
    try {
      const command = Command.create('git-cmd', ['clone', url, targetPath]);
      const output = await command.execute();
      return { 
        success: output.code === 0, 
        error: output.code === 0 ? undefined : output.stderr 
      };
    } catch (e: any) {
      console.error('Git clone failed:', e);
      return { success: false, error: String(e) };
    }
  },

  /**
   * 最新の変更をプルする
   */
  async pull(projectPath: string): Promise<{ success: boolean, error?: string }> {
    try {
      const command = Command.create('git-cmd', ['pull'], { cwd: projectPath });
      const output = await command.execute();
      return { 
        success: output.code === 0, 
        error: output.code === 0 ? undefined : output.stderr 
      };
    } catch (e: any) {
      console.error('Git pull failed:', e);
      return { success: false, error: String(e) };
    }
  },

  /**
   * 変更をコミットしてプッシュする
   */
  async commitAndPush(projectPath: string, message: string): Promise<{ success: boolean, error?: string }> {
    try {
      // 1. Add
      await Command.create('git-cmd', ['add', '.'], { cwd: projectPath }).execute();
      // 2. Commit
      await Command.create('git-cmd', ['commit', '-m', message], { cwd: projectPath }).execute();
      // 3. Push
      const pushRes = await Command.create('git-cmd', ['push', 'origin', 'main'], { cwd: projectPath }).execute();
      
      return { 
        success: pushRes.code === 0, 
        error: pushRes.code === 0 ? undefined : pushRes.stderr 
      };
    } catch (e: any) {
      console.error('Git sync failed:', e);
      return { success: false, error: String(e) };
    }
  },

  /**
   * バージョンを確認（接続テスト用）
   */
  async getVersion(): Promise<string> {
    try {
      const command = Command.create('git-cmd', ['version']);
      const output = await command.execute();
      return output.stdout.trim();
    } catch (e) {
      return 'Git not found';
    }
  }
};
