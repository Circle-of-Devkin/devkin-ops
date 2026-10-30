interface Window {
  electronAPI?: any;
  showDirectoryPicker?: (options?: { mode?: string }) => Promise<{ name: string }>;
}

declare module '*.css';
declare module '*.png' {
  const src: string;
  export default src;
}
declare module '*.svg' {
  const src: string;
  export default src;
}
