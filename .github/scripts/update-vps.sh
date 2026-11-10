#!/usr/bin/env bash
# Read by bash over SSH, with the deployment directory and tested commit as arguments.
set -euo pipefail
target=$1
commit=$2
branch=improve-security-seo
fail() { printf 'Deployment stopped: %s\n' "$1" >&2; exit 1; }

[[ "$target" == /home/codebridge-academy && "$commit" =~ ^[0-9a-f]{40}$ ]] || fail 'Unexpected deployment target'
cd -- "$target"
[[ "$(pwd -P)" == "$target" && "$(git rev-parse --show-toplevel)" == "$target" ]] || fail 'Incorrect Git worktree'
[[ "$(git symbolic-ref --short HEAD)" == "$branch" ]] || fail 'Incorrect VPS branch'
case "$(git remote get-url origin)" in
  git@github.com:codetraildevs/codebridge_academy.git|https://github.com/codetraildevs/codebridge_academy.git) ;;
  *) fail 'Unexpected origin repository' ;;
esac
changes=$(git status --porcelain --untracked-files=no)
[[ -z "$changes" ]] || fail 'Tracked files have local changes'

export GIT_TERMINAL_PROMPT=0
export GIT_SSH_COMMAND='ssh -o BatchMode=yes -o StrictHostKeyChecking=yes'
git fetch --no-tags origin "refs/heads/$branch:refs/remotes/origin/$branch"
git merge-base --is-ancestor "$commit" "origin/$branch" || fail 'Tested commit is no longer on the deployment branch'
git merge-base --is-ancestor HEAD "$commit" || fail 'Update would rewind or diverge from the deployed commit'
git -c merge.autoStash=false merge --ff-only --no-autostash --no-overwrite-ignore "$commit"
[[ "$(git rev-parse HEAD)" == "$commit" ]] || fail 'Deployed commit differs from the workflow SHA'
printf 'VPS verified at %s\n' "$commit"
