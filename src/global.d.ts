interface Window {
  electronAPI?: any;
  showDirectoryPicker?: (options?: { mode?: string }) => Promise<{ name: string }>;
}

declare module '*.css';
