// ImageKit 업로드 헬퍼 — 서버 전용 (Private Key 는 절대 프론트로 내보내지 않는다)
// REST: https://upload.imagekit.io/api/v1/files/upload (Basic 인증 = base64(privateKey + ':'))
const UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';

export function imagekitReady() {
  return Boolean((process.env.IMAGEKIT_PRIVATE_KEY || '').trim());
}

/**
 * base64 데이터(데이터URL 허용)를 ImageKit 에 업로드하고 CDN URL 을 돌려준다.
 * @param {string} base64 - "data:image/png;base64,..." 또는 순수 base64
 * @param {string} fileName - 저장 파일명
 */
export async function uploadToImageKit(base64, fileName) {
  const privateKey = (process.env.IMAGEKIT_PRIVATE_KEY || '').trim();
  if (!privateKey) throw new Error('IMAGEKIT_PRIVATE_KEY 가 설정되지 않았습니다');

  const form = new FormData();
  form.append('file', base64);                       // ImageKit 은 base64/dataURL 문자열 그대로 받음
  form.append('fileName', fileName || `product-${Date.now()}.jpg`);
  form.append('folder', '/shopping-mall');
  form.append('useUniqueFileName', 'true');

  const r = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(privateKey + ':').toString('base64')}` },
    body: form,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message || `ImageKit 업로드 실패 (${r.status})`);
  return data.url; // CDN URL
}
