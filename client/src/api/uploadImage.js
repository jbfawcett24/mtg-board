import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://192.168.1.122:3001';

export async function pickAndUploadCardImage() {
    const path = await open({
        multiple: false,
        filters: [{ name: 'Image', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
    });

    if (!path) return null;

    const bytes = await readFile(path);
    const ext = path.split('.').pop().toLowerCase();
    const mimeTypes = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

    const blob = new Blob([bytes], { type: mimeTypes[ext] ?? 'image/jpeg' });
    const formData = new FormData();
    formData.append('image', blob, `card.${ext}`);

    const res = await fetch(`${BACKEND_URL}/upload/card-image`, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    const { url } = await res.json();
    return url;
}
