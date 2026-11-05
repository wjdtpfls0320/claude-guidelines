# Claude Code 권한 설정

지침은 Claude가 참고하는 "부탁"이라, 상황에 따라 지켜지지 않을 수 있습니다. 이 설정은 Claude Code에서 일부 위험한 작업을 실제로 막거나, 실행 전에 반드시 확인을 받게 합니다.

**이 설정은 Claude Code(터미널, 데스크톱, 웹의 Claude Code)에서만 동작합니다. claude.ai 채팅에는 영향이 없습니다.**

## 무엇을 하나

| 구분 | 대상 | 지침 항목 |
|---|---|---|
| 실행 전 확인(ask) | git 강제 push(`--force`, `-f`, `--force-with-lease`, `+브랜치`, 옵션이 뒤에 오는 경우 포함) | 2번: 되돌리기 어려운 작업은 실행 전에 확인 |
| 실행 전 확인(ask) | 작업 내용을 버리는 git 명령: `git reset --hard`, `git clean`, `git branch -D`, `git checkout -- …`, `git checkout .`, `git restore` | 2번 |
| 실행 전 확인(ask) | 폴더 삭제: `rm -r`, `-rf`, `-fr`, `-Rf`, `-r -f` 등, `find … -delete` | 2번 |
| 실행 전 확인(ask) | DB 초기화와 원격 반영: `supabase db reset`/`db push`, `prisma migrate reset`/`db push`, `drizzle-kit push` | 2번 (구조 변경, 운영 데이터) |
| 실행 전 확인(ask) | 배포·공개: `vercel --prod`, `npm publish` | 2번 (배포) |
| 차단(deny) | 모든 하위 폴더의 `.env`, `.env.local`, `.env.*.local`, `.env.production`, `.env.development`, `.env.test`, `.env.staging` 읽기 | 7번: 비밀 값을 대화에 보여주지 않기 |
| 차단(deny) | `~/.ssh/`, `~/.aws/` 읽기 | 7번 |

- **`.env.example`은 차단하지 않았습니다.** 지침 7번이 Claude에게 `.env.example`을 만들고 관리하게 하기 때문입니다. `Read(**/.env.*)`처럼 넓게 막으면 `.env.example`도 막히고, deny는 allow보다 우선해서 예외를 둘 수 없습니다. 그래서 변형을 하나씩 적었습니다. 다른 이름(`.env.prod` 등)을 쓰면 같은 방식으로 추가하세요.
- **`**/`를 붙인 이유:** `Read(./.env)`는 Claude Code를 실행한 폴더의 `.env`만 막습니다. `apps/web/.env`처럼 하위 폴더에 있는 파일은 막지 못합니다.
- **같은 규칙을 인자가 있는 형태와 없는 형태로 두 번 적었습니다.** `Bash(명령 *)`가 인자 없이 실행한 명령을 놓친다는 버그 보고가 있어서, `Bash(supabase db push)`와 `Bash(supabase db push *)`를 함께 넣었습니다.
- **`git push -f`는 `-f`를 단어 단위로만 잡습니다.** `git push *-f*`처럼 쓰면 `git push origin feature-fix`도 걸려서 매번 확인을 묻게 됩니다.
- 데이터베이스와 배포 명령은 쓰는 도구마다 다릅니다. 여기 없는 도구를 쓰면 같은 방식으로 추가하세요.

## 설치

모든 프로젝트에 적용하려면 `~/.claude/settings.json`에, 한 프로젝트에만 적용하려면 그 프로젝트의 `.claude/settings.json`에 넣습니다.

- 파일이 없으면 이 `settings.json`을 그대로 복사합니다.
- 파일이 이미 있으면 덮어쓰지 말고, `permissions`의 `ask`와 `deny` 목록에 항목을 추가합니다.

## 설치 후 확인

1. Claude Code에서 `/permissions`를 실행해 규칙이 목록에 보이는지 확인합니다.
2. 실제로 막히는지 확인합니다. 아래 두 요청을 보내 봅니다.
   - "Read 도구로 `.env` 읽어줘" → 거부되어야 합니다.
   - "`git push origin main --force` 실행해줘" → 실행 전에 확인을 물어야 합니다.
3. 사용자 설정(`~/.claude/settings.json`)의 deny 규칙이 세션 시작 때 적용되지 않았다는 버그 보고가 있습니다([anthropics/claude-code#46672](https://github.com/anthropics/claude-code/issues/46672)). 2번에서 막히지 않으면 Claude Code를 다시 시작한 뒤 한 번 더 확인하세요.

**확인 기록 (2026-11-05, Claude Code 2.1.318):** 이 설정을 프로젝트 `.claude/settings.json`에 넣고 비대화형 모드(`claude -p`, Bash 허용)로 확인했습니다. 비대화형 모드에서는 확인을 물을 수 없으므로 ask 규칙에 걸린 명령은 실행되지 않습니다.

| 시험 | 결과 |
|---|---|
| Read로 `apps/web/.env` 읽기 | 차단 |
| Read로 `apps/web/.env.example` 읽기 | 허용 |
| `git push origin main --force`, `git push origin +main`, `git push --force-with-lease` | 차단(확인 필요) |
| `rm -fr 폴더`, `git clean -n`, `find . -name x -delete`, `supabase db push` | 차단(확인 필요) |
| `echo hello`, `git push origin feature-fix` (걸리면 안 되는 명령) | 실행됨 |

## 한계

- **완전한 차단이 아닙니다.** `Read` 차단은 Claude의 파일 읽기 도구만 막습니다. 터미널 명령(`cat .env` 등)으로 읽는 것까지 막지는 않습니다.
- **목록에 없는 변형은 걸리지 않습니다.** 예를 들어 `rm -r -v -f`, `bash -c "rm -rf …"`, 스크립트 파일 안의 명령은 규칙과 모양이 달라서 그대로 실행될 수 있습니다.
- **`git restore`와 `git clean`은 넓게 잡았습니다.** 비교적 안전한 `git restore --staged`나 `git clean -n`(미리보기)도 확인을 묻습니다. 되돌리기 어려운 쪽을 놓치는 것보다 낫다고 판단했습니다.
- **버전에 따라 문법이 다를 수 있습니다.** 이 설정은 2026-11 기준의 `Bash(명령 *)` 형식(가운데 와일드카드 포함)을 따랐습니다.

더 확실하게 막으려면 PreToolUse 훅이나 샌드박스 설정이 필요합니다.
