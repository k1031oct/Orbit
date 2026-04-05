import { Command } from '@tauri-apps/plugin-shell';
import { join } from '@tauri-apps/api/path';
import { exists, readTextFile } from '@tauri-apps/plugin-fs';

export interface AndroidStatus {
  connected: boolean;
  apps?: string[];
}

export type OutputCallback = (line: string) => void;

/**
 * Android 開発実行環境のコア
 */
export const AndroidExecutor = {
  /**
   * 単発のコマンドを実行し、結果を返す
   */
  async runCommand(args: string[], onOutput?: OutputCallback, cwd?: string): Promise<boolean> {
    try {
      const command = Command.create('adb-cmd', args, { cwd });
      
      if (onOutput) {
        command.stdout.on('data', line => onOutput(line));
        command.stderr.on('data', line => onOutput(`[ERROR] ${line}`));
        
        return new Promise(async (resolve) => {
          command.on('close', data => {
            resolve(data.code === 0);
          });
          command.on('error', err => {
            onOutput(`[CRITICAL] Spawn error: ${err}`);
            resolve(false);
          });
          await command.spawn();
        });
      } else {
        const output = await command.execute();
        return output.code === 0;
      }
    } catch (e) {
      console.error('ADB Command failed:', e);
      if (onOutput) onOutput(`[CRITICAL] ADB Command failed: ${e}`);
      return false;
    }
  },

  /**
   * Gradle ビルドを実行し、出力をストリーミングする
   */
  async runGradle(projectPath: string, args: string[], onOutput?: OutputCallback): Promise<boolean> {
    try {
      // Windows 向け gradlew
      const command = Command.create('cmd', ['/c', 'gradlew.bat', ...args], { cwd: projectPath });
      
      if (onOutput) {
        command.stdout.on('data', line => onOutput(line));
        command.stderr.on('data', line => onOutput(`[GRADLE ERROR] ${line}`));
      }

      return new Promise(async (resolve) => {
        command.on('close', data => {
          resolve(data.code === 0);
        });
        command.on('error', err => {
          if (onOutput) onOutput(`[CRITICAL] Gradle spawn error: ${err}`);
          resolve(false);
        });
        await command.spawn();
      });
    } catch (e) {
      console.error('Gradle Execution failed:', e);
      if (onOutput) onOutput(`[CRITICAL] Gradle failed: ${e}`);
      return false;
    }
  },

  /**
   * プロジェクトのパッケージ名 (namespace/applicationId) を特定する
   */
  async getPackageName(projectPath: string): Promise<string | null> {
    try {
      const gradlePath = await join(projectPath, 'app', 'build.gradle.kts');
      const fallbackPath = await join(projectPath, 'app', 'build.gradle');
      
      let content = '';
      if (await exists(gradlePath)) {
        content = await readTextFile(gradlePath);
      } else if (await exists(fallbackPath)) {
        content = await readTextFile(fallbackPath);
      } else {
        return null;
      }

      // namespace "com.example.app" または applicationId = "com.example.app" を探す
      const match = content.match(/namespace\s*=\s*["']([^"']+)["']/) || 
                    content.match(/applicationId\s*=\s*["']([^"']+)["']/) ||
                    content.match(/namespace\s*["']([^"']+)["']/); // 括弧なし形式
      
      return match ? match[1] : null;
    } catch (e) {
      console.error('Failed to get package name:', e);
      return null;
    }
  },

  /**
   * スクリーンショットを取得し Base64 で返す
   */
  async captureScreenshot(): Promise<string | null> {
    try {
      const command = Command.create('adb', ['exec-out', 'screencap', '-p']);
      const output = await command.execute();
      
      if (output.code !== 0) return null;

      // バイナリデータを Base64 に変換 (Tauri Command.execute はバイナリ出力を raw プロパティに持つ可能性があるが、
      // プラグインのバージョンにより挙動が異なるため、ここでは標準的な実装を想定)
      // 注意: stdout が文字列としてデコードされてしまう場合があるため、Buffer 的な扱いが必要
      return Buffer.from(output.stdout, 'binary').toString('base64');
    } catch (e) {
      console.error('Screenshot failed:', e);
      return null;
    }
  },

  /**
   * 生成された APK を検索する
   */
  async findApk(projectPath: string): Promise<string | null> {
    try {
      // 標準的なデバッグ APK パス
      const standardPath = await join(projectPath, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
      if (await exists(standardPath)) {
        return standardPath;
      }
      return null;
    } catch (e) {
      console.error('APK Search failed:', e);
      return null;
    }
  },

  /**
   * 生成された AAB (Bundle) を検索する
   */
  async findAab(projectPath: string): Promise<string | null> {
    try {
      const standardPath = await join(projectPath, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
      if (await exists(standardPath)) {
        return standardPath;
      }
      return null;
    } catch (e) {
      console.error('AAB Search failed:', e);
      return null;
    }
  },

  /**
   * 指定したパッケージ名のアプリを起動する
   */
  async launchApp(packageName: string, onOutput?: OutputCallback): Promise<boolean> {
    // 起動可能な Activity を特定できない場合は、monkey を使って起動
    const success = await this.runCommand(['shell', 'monkey', '-p', packageName, '-c', 'android.intent.category.LAUNCHER', '1'], onOutput);
    return success;
  },

  /**
   * UI 構造を XML でダンプする (物理監査用)
   */
  async dumpUiStructure(): Promise<string> {
    try {
      // 1. DUMP 実行
      await this.runCommand(['shell', 'uiautomator', 'dump', '/sdcard/view.xml']);
      
      // 2. 内容を読み取り (Tauri Shell Command で cat を実行)
      const command = Command.create('adb-cmd', ['shell', 'cat', '/sdcard/view.xml']);
      const output = await command.execute();
      
      if (output.code !== 0) return 'Error: Failed to read UI dump.';

      // Minification (エージェントのコンテキスト節約のため、主要な属性以外を削る)
      return output.stdout
        .replace(/index="[^"]*"/g, '')
        .replace(/bounds="[^"]*"/g, '')
        .replace(/resource-id="[^"]*"/g, 'id="$&"') // 読みやすく
        .replace(/\s+/g, ' ')
        .trim();
    } catch (e) {
      console.error('UI Dump failed:', e);
      return `Error: ${e}`;
    }
  },

  /**
   * Gradle ビルドログからエラーを抽出する
   */
  parseBuildLog(output: string): string {
    const lines = output.split('\n');
    const errors: string[] = [];
    
    let captureNext = 0;
    for (const line of lines) {
      // Kotlin/Java エラー、または Gradle の FAILED 行を検知
      if (line.includes('e:') || line.includes('FAILED') || line.includes('Error:')) {
        errors.push(line.trim());
        captureNext = 2; // エラーの後の数行も文脈として取り込む
      } else if (captureNext > 0) {
        errors.push(`  ${line.trim()}`);
        captureNext--;
      }
    }

    if (errors.length === 0) return 'No specific errors found in log.';
    return `--- Build Error Report ---\n${errors.join('\n')}`;
  },

  /**
   * ヘッドレス環境（エミュレータ）の状態を確認する
   */
  async checkHeadless(): Promise<{ alive: boolean; detail?: string }> {
    try {
      const command = Command.create('adb', ['get-state']);
      const output = await command.execute();
      
      if (output.stdout.includes('device')) {
        return { alive: true, detail: 'Device/Emulator is ready.' };
      }
      return { alive: false, detail: output.stdout || output.stderr || 'No device detected.' };
    } catch (e) {
      return { alive: false, detail: String(e) };
    }
  }
};
