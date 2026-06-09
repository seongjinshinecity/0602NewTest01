const btn = document.getElementById('callBtn');
const result = document.getElementById('result');

btn.addEventListener('click', async () => {
  btn.disabled = true;
  result.className = '';
  result.textContent = '호출 중...';

  try {
    const res = await fetch('/api/hello');
    const json = await res.json();

    if (!json.success) throw new Error(json.message || '요청 실패');

    const { message, count, time } = json.data;
    result.innerHTML = `
      <div class="msg">${message}</div>
      <div class="meta">호출 횟수: ${count}회 · ${time}</div>
    `;
  } catch (err) {
    result.className = 'error';
    result.textContent = `오류: ${err.message}`;
  } finally {
    btn.disabled = false;
  }
});
