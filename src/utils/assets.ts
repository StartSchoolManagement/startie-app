// Shared asset path utility
export function getAssetPath(filename: string): string {
  // Vite publicDir serves 'assets' folder at root
  return `/${filename}`;
}
