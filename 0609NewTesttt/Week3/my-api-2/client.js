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

    const { greeting, time, date, count } = json.data;
    result.innerHTML = `
      <div class="greeting">${greeting}</div>
      <div class="time">${time}</div>
      <div class="meta">${date} · ${count}번째 호출</div>
    `;
  } catch (err) {
    result.className = 'error';
    result.textContent = `오류: ${err.message}`;
  } finally {
    btn.disabled = false;
  }
});
