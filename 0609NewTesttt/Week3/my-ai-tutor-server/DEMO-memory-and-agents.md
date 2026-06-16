# Q8 데모 보강 — 메모리 & 노코드 에이전트

> 수업튜터 풀스택앱(`my-ai-tutor-server`)을 둘러싼 **두 가지 핵심 역량**을 실제 실행 결과로 증명하는 문서입니다.
> 1. **노코드 에이전트** — 코드 없이 마크다운 `config`만으로 정의·동작하는 서브에이전트
> 2. **메모리** — 세션이 바뀌어도 사실(fact)을 저장하고 다시 불러오는 영속 메모리

---

## 1. 노코드 에이전트 (No-Code Agents)

`.claude/agents/` 폴더에 **마크다운 설정 파일만으로** 에이전트를 정의합니다. 코드를 한 줄도 작성하지 않고, frontmatter(이름·설명·도구 권한)와 시스템 프롬프트만으로 전문 에이전트가 만들어집니다.

| 에이전트 | 정의 파일 | 역할 |
|---|---|---|
| `about-me-qa-bot` | `.claude/agents/about-me-qa-bot.md` | `about-me2.md` 문서에만 근거해 답변. 문서에 없으면 "모릅니다" |
| `lesson-tutor-guide` | `.claude/agents/lesson-tutor-guide.md` | 주제를 구조화된 강의·연습문제로 가르치는 1:1 튜터 |
| `single-react-dev` | `.claude/agents/single-react-dev.md` | 단일 `index.html`로 React+Tailwind 웹앱 제작 |

### ▶ 라이브 실행 데모 — `about-me-qa-bot`

문서에 **있는 질문**과 **없는 질문**을 한 번에 던져, 근거 기반 답변과 환각 방지("모릅니다")를 동시에 검증했습니다.

**입력**
```
질문 1: 취미가 뭐야?
질문 2: 혈액형이 뭐야?
```

**실제 출력** (서브에이전트가 `about-me2.md`를 읽고 답변)
```
질문 1: 취미가 뭐야?
about-me2.md의 6번 항목(취미)에 다음 세 가지가 명시되어 있습니다.
- 꿈 일기(Dream Journal) 기록 및 분석
- 트렌디한 공간 투어 (성수동·한남동 팝업/편집숍/카페 동선·조명·가구 분석)
- 디지털 디톡스 산책

질문 2: 혈액형이 뭐야?
모릅니다 (about-me2.md에 혈액형 관련 정보가 없습니다).
```

✅ **검증 포인트**
- 문서에 있는 정보(취미)는 **원문 근거**로 정확히 답변
- 문서에 없는 정보(혈액형)는 추측하지 않고 **"모릅니다"** → 환각(hallucination) 차단
- 이 모든 동작이 **코드 없이** `about-me-qa-bot.md` 설정만으로 작동

> 같은 방식으로 `lesson-tutor-guide`(강의 진행)·`single-react-dev`(앱 생성)도 호출만 하면 동작합니다.

---

## 2. 메모리 (Persistent Memory)

에이전트는 세션이 끝나도 사실을 잊지 않도록 **파일 기반 영속 메모리**를 사용합니다.
실제 메모리 파일 사본을 저장소에 함께 두었습니다 → [`memory-demo/`](memory-demo/)

```
memory-demo/
├── MEMORY.md          ← 색인(index). 매 세션 시작 시 컨텍스트로 로드
└── preferred-name.md  ← 사실 1건 = 파일 1개 (frontmatter + 본문)
```

### 저장 (Save)

사용자가 알려준 사실은 한 파일에 한 가지씩 저장되고, `MEMORY.md`에 한 줄 색인이 추가됩니다.

`preferred-name.md`:
```markdown
---
name: preferred-name
description: How the user wants to be addressed
metadata:
  type: user
---
The user wants to be called "...".
```

`MEMORY.md` (색인):
```markdown
- [Preferred name](preferred-name.md) — 사용자 호칭
```

### 다시 불러오기 (Recall)

다음 세션이 시작되면 `MEMORY.md` 색인이 자동으로 컨텍스트에 주입됩니다. 따라서 사용자가 다시 알려주지 않아도 에이전트는 호칭·선호·진행 중인 작업을 **기억한 상태로 시작**합니다.

예) `MEMORY.md` 색인과 `preferred-name.md` 본문이 **모두 호칭 "shinecity"로 일치** → 다음 세션에서 에이전트가 사용자를 "shinecity"로 부르며 시작합니다.

✅ **검증 포인트**
- 사실 1건 = 파일 1개 → 개별적으로 추가/수정/삭제 가능
- `MEMORY.md` 색인이 매 세션 로드되어 **세션 간 연속성** 확보
- 색인과 사실 파일이 단일 값으로 일치 → recall 일관성 보장
- 코드가 아니라 **마크다운 파일**로 기억을 관리 (노코드)

---

## 요약

| 역량 | 증거 |
|---|---|
| 노코드 에이전트 | `.claude/agents/*.md` 3종 + `about-me-qa-bot` 라이브 실행 결과(근거 답변 / 모릅니다) |
| 메모리 | `memory/MEMORY.md` 색인 + `preferred-name.md` 저장→세션 간 recall 흐름 |

이 문서로 Q8의 "메모리/노코드 에이전트 데모" 항목을 실제 동작 근거와 함께 보강합니다.
