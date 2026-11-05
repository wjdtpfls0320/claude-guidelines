# Claude Code 권한 설정

지침은 Claude가 참고하는 "부탁"이라, 상황에 따라 지켜지지 않을 수 있습니다. 이 설정은 Claude Code에서 일부 위험한 작업을 실제로 막거나, 실행 전에 반드시 확인을 받게 합니다.

**이 설정은 Claude Code(터미널, 데스크톱의 Claude Code)에서만 동작합니다. claude.ai 채팅에는 영향이 없습니다.**

## 무엇을 하나

| 구분 | 대상 | 지침 항목 |
|---|---|---|
| 실행 전 확인(ask) | git 강제 push, `git reset --hard`, `rm -r`/`rm -rf`, `supabase db reset` | 2번: 되돌리기 어려운 작업은 실행 전에 확인 |
| 차단(deny) | `.env`, `.env.local`, `.env.production`, `.env.development` 읽기 | 7번: 비밀 값을 대화에 보여주지 않기 |

- `.env.example`은 차단하지 않았습니다. 지침 7번이 Claude에게 `.env.example`을 만들고 관리하게 하기 때문입니다. `Read(./.env.*)`처럼 넓게 막으면 `.env.example`도 막힙니다.
- 데이터베이스 삭제나 배포 명령은 쓰는 도구마다 달라서 `supabase db reset`만 넣었습니다. 다른 도구를 쓰면 같은 방식으로 추가하세요.

## 설치

모든 프로젝트에 적용하려면 `~/.claude/settings.json`에, 한 프로젝트에만 적용하려면 그 프로젝트의 `.claude/settings.json`에 넣습니다.

- 파일이 없으면 이 `settings.json`을 그대로 복사합니다.
- 파일이 이미 있으면 덮어쓰지 말고, `permissions`의 `ask`와 `deny` 목록에 항목을 추가합니다.

설치한 뒤 Claude Code에서 `/permissions`를 실행하면 규칙이 적용됐는지 확인할 수 있습니다.

## 한계

- **완전한 차단이 아닙니다.** `Read` 차단은 Claude의 파일 읽기 도구만 막습니다. 터미널 명령(`cat .env` 등)으로 읽는 것까지 막지는 않습니다.
- **명령 앞부분이 같아야 걸립니다.** `git push origin main --force`처럼 옵션이 뒤에 오면 `git push --force` 규칙에 걸리지 않을 수 있습니다.
- **버전에 따라 문법이 다를 수 있습니다.** 이 설정은 2026-11 기준 문서의 `Bash(명령 *)` 형식을 따랐습니다. 동작하지 않으면 `/permissions`로 확인하세요.

더 확실하게 막으려면 PreToolUse 훅이나 샌드박스 설정이 필요합니다.
