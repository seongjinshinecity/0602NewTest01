// Vercel 서버리스 진입점 — /api/* 요청이 여기로 rewrite 된다 (vercel.json 참조).
// initDb 는 app.js 의 미들웨어에서 lazy 하게 1회 실행된다.
import { app } from '../app.js';
export default app;
