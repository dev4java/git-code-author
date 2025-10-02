import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

interface LineBlame {
  commit?: string;
  author?: string;
  authorMail?: string;
  authorTime?: number;
  summary?: string;
}

interface BlameCacheEntry {
  version: number;
  decorations: vscode.DecorationOptions[];
}

interface LocaleStrings {
  noEditor: string;
  fileOutsideWorkspace: string;
  loading: string;
  blameFailed: string;
  localChangesTitle: string;
  localChangesHint: string;
  missingInfoTitle: string;
  missingInfoHint: string;
  commitLabel: string;
  commitSeparator: string;
  noCommitLabel: string;
  unknownLabel: string;
  separator: string;
}

const locale = vscode.env.language?.toLowerCase() ?? 'en';
const isChinese = locale.startsWith('zh');

const zhStrings: LocaleStrings = {
  noEditor: '未找到可用的文本编辑器。',
  fileOutsideWorkspace: '当前文件不在已打开的工作区中，无法读取 Git 提交信息。',
  loading: '正在加载 Git 提交作者信息…',
  blameFailed: '获取 Git 提交信息失败：',
  localChangesTitle: '未提交的本地修改',
  localChangesHint: '保存或提交后可查看作者信息。',
  missingInfoTitle: '无法获取提交信息',
  missingInfoHint: '请确认文件已由 Git 管理。',
  commitLabel: '提交',
  commitSeparator: '：',
  noCommitLabel: '未提交',
  unknownLabel: '未知',
  separator: ' • '
};

const enStrings: LocaleStrings = {
  noEditor: 'No active text editor found.',
  fileOutsideWorkspace: 'The current file is not inside an opened workspace, unable to read Git blame information.',
  loading: 'Loading Git author information…',
  blameFailed: 'Failed to read Git blame information: ',
  localChangesTitle: 'Uncommitted local changes',
  localChangesHint: 'Save or commit the file to see author details.',
  missingInfoTitle: 'Unable to retrieve blame data',
  missingInfoHint: 'Make sure the file is tracked by Git.',
  commitLabel: 'Commit',
  commitSeparator: ': ',
  noCommitLabel: 'Uncommitted',
  unknownLabel: 'Unknown',
  separator: ' • '
};

const strings = isChinese ? zhStrings : enStrings;

const annotatedDocuments = new Set<string>();
const blameCache = new Map<string, BlameCacheEntry>();
const refreshTasks = new Map<string, Promise<void>>();
const MAX_GUTTER_CHAR_LENGTH = 40;

const blameDecorationType = vscode.window.createTextEditorDecorationType({
  isWholeLine: true,
  before: {
    margin: '0 6px 0 0',
    color: new vscode.ThemeColor('editorLineNumber.foreground'),
    fontStyle: 'normal',
    textDecoration:
      'none; display: inline-block; width: 32ch; padding: 0 6px; border-radius: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0.75; font-size: 0.9em;'
  }
});

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(blameDecorationType);

  context.subscriptions.push(
    vscode.commands.registerCommand('gitCodeAuthor.toggleBlame', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage(strings.noEditor);
        return;
      }

      const key = documentKey(editor.document);
      if (annotatedDocuments.has(key)) {
        disableAnnotations(editor.document);
      } else {
        await enableAnnotations(editor);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('gitCodeAuthor.enableBlame', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage(strings.noEditor);
        return;
      }

      await enableAnnotations(editor);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('gitCodeAuthor.disableBlame', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage(strings.noEditor);
        return;
      }

      disableAnnotations(editor.document);
    })
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (!editor) {
        updateMenuContext(false);
        return;
      }

      const key = documentKey(editor.document);
      const isAnnotated = annotatedDocuments.has(key);
      updateMenuContext(isAnnotated);

      if (isAnnotated) {
        void refreshDocument(editor.document);
      } else {
        editor.setDecorations(blameDecorationType, []);
      }
    })
  );

  context.subscriptions.push(
    vscode.window.onDidChangeVisibleTextEditors(editors => {
      const handled = new Set<string>();
      const openDocumentKeys = new Set(vscode.workspace.textDocuments.map(documentKey));
      for (const editor of editors) {
        const key = documentKey(editor.document);
        if (annotatedDocuments.has(key)) {
          if (!handled.has(key)) {
            handled.add(key);
            void refreshDocument(editor.document);
          }
        } else {
          editor.setDecorations(blameDecorationType, []);
        }
      }

      for (const key of Array.from(annotatedDocuments)) {
        if (!openDocumentKeys.has(key)) {
          disableAnnotationsByKey(key);
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(document => {
      if (!annotatedDocuments.has(documentKey(document))) {
        return;
      }

      void refreshDocument(document, true);
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument(document => {
      const key = documentKey(document);
      const wasAnnotated = disableAnnotationsByKey(key);

      if (!wasAnnotated) {
        return;
      }

      const activeDocument = vscode.window.activeTextEditor?.document;
      const activeKey = activeDocument ? documentKey(activeDocument) : undefined;
      updateMenuContext(activeKey ? annotatedDocuments.has(activeKey) : false);
    })
  );

  const active = vscode.window.activeTextEditor;
  if (active) {
    updateMenuContext(annotatedDocuments.has(documentKey(active.document)));
  }
}

export function deactivate() {
  annotatedDocuments.clear();
  blameCache.clear();
  refreshTasks.clear();
}

async function enableAnnotations(editor: vscode.TextEditor) {
  const { document } = editor;
  const key = documentKey(document);

  if (annotatedDocuments.has(key)) {
    await refreshDocument(document);
    return;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  if (!workspaceFolder) {
    vscode.window.showWarningMessage(strings.fileOutsideWorkspace);
    return;
  }

  annotatedDocuments.add(key);
  blameCache.delete(key);

  if (editor === vscode.window.activeTextEditor) {
    updateMenuContext(true);
  }

  await refreshDocument(document, true);
}

function disableAnnotations(document: vscode.TextDocument) {
  const key = documentKey(document);
  const wasAnnotated = disableAnnotationsByKey(key);

  if (wasAnnotated && vscode.window.activeTextEditor?.document === document) {
    updateMenuContext(false);
  }
}

async function refreshDocument(document: vscode.TextDocument, force = false): Promise<void> {
  const key = documentKey(document);
  const existingTask = refreshTasks.get(key);

  if (existingTask && !force) {
    await existingTask;
    return;
  }

  const task = (async () => {
    const cached = blameCache.get(key);
    if (!force && cached && cached.version === document.version) {
      if (annotatedDocuments.has(key)) {
        applyDecorations(document, cached.decorations);
      }
      return;
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    if (!workspaceFolder) {
      vscode.window.showWarningMessage(strings.fileOutsideWorkspace);
      if (annotatedDocuments.has(key)) {
        disableAnnotations(document);
      }
      return;
    }

    try {
      const decorations = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Window,
          title: strings.loading
        },
        () => computeDecorations(document, workspaceFolder)
      );
      blameCache.set(key, {
        version: document.version,
        decorations
      });
      if (annotatedDocuments.has(key)) {
        applyDecorations(document, decorations);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`${strings.blameFailed}${message}`);
    }
  })();

  refreshTasks.set(key, task);

  try {
    await task;
  } finally {
    if (refreshTasks.get(key) === task) {
      refreshTasks.delete(key);
    }
  }
}

async function computeDecorations(
  document: vscode.TextDocument,
  workspaceFolder: vscode.WorkspaceFolder
): Promise<vscode.DecorationOptions[]> {
  const args = ['blame', '--line-porcelain', '--', document.uri.fsPath];
  const { stdout } = await execFileAsync('git', args, { cwd: workspaceFolder.uri.fsPath });

  const lineCount = document.lineCount;
  const blameLines = parseBlame(stdout, lineCount);
  const options: vscode.DecorationOptions[] = [];

  for (let line = 0; line < lineCount; line += 1) {
    const info = blameLines[line];
    const range = new vscode.Range(line, 0, line, 0);
    const hoverMessage = buildHover(info);
    const contentText = formatLine(info);

    options.push({
      range,
      hoverMessage,
      renderOptions: {
        before: {
          contentText
        }
      }
    });
  }

  return options;
}

function parseBlame(raw: string, lineCount: number): (LineBlame | undefined)[] {
  const lines = raw.split(/\r?\n/);
  const blame: (LineBlame | undefined)[] = Array.from({ length: lineCount }, () => undefined);

  let current: LineBlame | undefined;
  let nextLine = 0;
  let remaining = 0;

  for (const line of lines) {
    if (!line) {
      continue;
    }

    if (/^[\^]?[0-9a-f]{40}\s/.test(line)) {
      const parts = line.split(' ');
      const commit = parts[0].replace('^', '');
      const parsedLine = Number.parseInt(parts[2] ?? '', 10);
      const parsedCount = Number.parseInt(parts[3] ?? '', 10);

      current = { commit };
      if (!Number.isNaN(parsedLine)) {
        nextLine = Math.max(0, parsedLine - 1);
      }
      remaining = Number.isNaN(parsedCount) ? 1 : Math.max(parsedCount, 1);
      continue;
    }

    if (line.startsWith('\t')) {
      if (current && nextLine < lineCount) {
        blame[nextLine] = { ...current };
      }

      nextLine += 1;
      if (remaining > 0) {
        remaining -= 1;
      }
      if (remaining === 0) {
        current = undefined;
      }
      continue;
    }

    if (!current) {
      current = {};
    }

    if (line.startsWith('author ')) {
      current.author = line.substring('author '.length).trim();
    } else if (line.startsWith('author-mail ')) {
      current.authorMail = line
        .substring('author-mail '.length)
        .replace(/[<>]/g, '')
        .trim();
    } else if (line.startsWith('author-time ')) {
      const timestamp = Number(line.substring('author-time '.length).trim());
      if (!Number.isNaN(timestamp)) {
        current.authorTime = timestamp;
      }
    } else if (line.startsWith('summary ')) {
      current.summary = line.substring('summary '.length).trim();
    }
  }

  return blame;
}

function buildHover(info: LineBlame | undefined): vscode.MarkdownString {
  if (!info) {
    const md = new vscode.MarkdownString(`**${strings.missingInfoTitle}**`);
    md.appendMarkdown(`\n${strings.missingInfoHint}`);
    return md;
  }

  if (isUncommitted(info)) {
    const md = new vscode.MarkdownString(`**${strings.localChangesTitle}**`);
    md.appendMarkdown(`\n${strings.localChangesHint}`);
    return md;
  }

  const author = info.author ?? strings.unknownLabel;
  const email = info.authorMail ? ` <${info.authorMail}>` : '';
  const md = new vscode.MarkdownString(undefined, true);

  md.appendMarkdown(`**${author}${email}**`);

  if (info.authorTime) {
    md.appendMarkdown(`  \n${formatFullDate(info.authorTime)}`);
  }

  if (info.commit) {
    md.appendMarkdown(`  \n${strings.commitLabel}${strings.commitSeparator}\`${info.commit}\``);
  }

  if (info.summary) {
    md.appendMarkdown(`\n\n${info.summary}`);
  }

  return md;
}

function formatLine(info: LineBlame | undefined): string {
  if (!info) {
    return strings.unknownLabel;
  }

  if (isUncommitted(info)) {
    return strings.noCommitLabel;
  }

  const date = info.authorTime ? formatShortDate(info.authorTime) : '--/--/--';
  const author = info.author ?? strings.unknownLabel;
  const summary = info.summary?.replace(/\s+/g, ' ') ?? '';
  const base = `${date} ${author}`;
  const fullText = summary ? `${base}${strings.separator}${summary}` : base;
  return truncate(fullText, MAX_GUTTER_CHAR_LENGTH);
}

function formatShortDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}/${month}/${day}`;
}

function formatFullDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}

function isUncommitted(info: LineBlame): boolean {
  if (!info.commit) {
    return true;
  }

  if (/^0+$/.test(info.commit)) {
    return true;
  }

  const author = info.author?.toLowerCase() ?? '';
  return author.includes('not committed yet');
}

function documentKey(document: vscode.TextDocument): string {
  return document.uri.toString();
}

function disableAnnotationsByKey(key: string): boolean {
  const existed = annotatedDocuments.delete(key);
  blameCache.delete(key);
  refreshTasks.delete(key);

  for (const editor of vscode.window.visibleTextEditors) {
    if (documentKey(editor.document) === key) {
      editor.setDecorations(blameDecorationType, []);
    }
  }

  return existed;
}

function editorsForDocument(document: vscode.TextDocument): vscode.TextEditor[] {
  return vscode.window.visibleTextEditors.filter(
    editor => editor.document.uri.toString() === document.uri.toString()
  );
}

function applyDecorations(document: vscode.TextDocument, decorations: vscode.DecorationOptions[]) {
  for (const editor of editorsForDocument(document)) {
    editor.setDecorations(blameDecorationType, decorations);
  }
}

function updateMenuContext(isAnnotated: boolean) {
  void vscode.commands.executeCommand('setContext', 'gitCodeAuthor.isAnnotated', isAnnotated);
}
