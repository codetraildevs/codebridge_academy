# CodeBridge Academy production deployment

The production site is served from `/home/codebridge-academy` by the existing Nginx listener at `192.168.122.7:3002`. The provider's control panel terminates HTTPS for `https://codebridgecademy.com/`. Updating the static checkout takes effect without a process restart or a change to the listener, SSL, or other sites.

## GitHub configuration

In `codetraildevs/codebridge_academy`, enable GitHub Actions and create a **production** environment in **Settings → Environments**. Restrict deployment branches to `improve-security-seo`. Configure the credentials below there and retire repository-wide access to the VPS deployment key before the first push. The historical workflow on `main` can still use repository-level credentials. Protect the production branch and restrict who can change its workflows. The workflow's GitHub token needs only read access to repository contents.

| Production environment secret | Required value |
| --- | --- |
| `VPS_HOST` | SSH hostname or IP reachable from a GitHub-hosted runner. The internal Nginx address and port are for HTTP. |
| `VPS_PORT` | SSH port exposed by the VPS. |
| `VPS_USERNAME` | `fidele` |
| `VPS_SSH_KEY` | Complete private key for the dedicated runner-to-VPS deployment identity, including its header, footer and line breaks. Use a key suitable for unattended SSH. |
| `VPS_HOST_KEY` | Verified OpenSSH known_hosts entry for that SSH host. Use `host ssh-ed25519 AAAA…` for port 22 or `[host]:port ssh-ed25519 AAAA…` for a custom port. |
| `DEPLOY_PATH` | `/home/codebridge-academy` |
| `SUPABASE_ACCESS_TOKEN` | Supabase management access token belonging to an identity allowed to deploy Edge Functions to `siruvivfrinoyudbotko`. |

Set the production environment **variable** `SUPABASE_ANON_KEY` to the same public anon JWT the verification page uses. The smoke test calls the deployed function through its normal JWT gateway. The service-role credential belongs in the Supabase function runtime. The workflow requires neither a service-role credential nor a database password in GitHub.

## One-time VPS setup

1. Obtain the VPS SSH host public key or its fingerprint using the provider's trusted console. For example, run `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` there. If collecting the public entry with `ssh-keyscan -p PORT HOST`, compare its fingerprint with the console before setting `VPS_HOST_KEY`. After a host key rotation, verify the replacement the same way.
2. Generate a dedicated Ed25519 key pair for Actions. Store its private half in `VPS_SSH_KEY`. Add the public half to `fidele`'s `~/.ssh/authorized_keys` with the `restrict` option to disable forwarding and PTY allocation. Keep `~/.ssh` mode 700 and `authorized_keys` mode 600. The deploy account needs write access to this checkout and its Git metadata. The workflow uses no sudo privileges.
3. Configure **VPS-to-GitHub** access separately. For an SSH origin, generate a second key as `fidele`, add its public half as a **read-only** deploy key on this repository, and configure `~/.ssh/config` to use that identity for `github.com`. Verify GitHub's published host key fingerprints before adding GitHub to `fidele`'s known_hosts. [GitHub SSH fingerprints](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints)
4. As `fidele`, confirm the production path is the root of the correct checkout, the current branch is `improve-security-seo`, and `origin` uses `git@github.com:codetraildevs/codebridge_academy.git` or `https://github.com/codetraildevs/codebridge_academy.git`. For an empty destination, the initial checkout command is `git clone --branch improve-security-seo git@github.com:codetraildevs/codebridge_academy.git /home/codebridge-academy`. For an existing checkout, inspect its branch, changes and history before switching. These read-only checks verify the setup:

   ```bash
   cd /home/codebridge-academy
   git rev-parse --show-toplevel
   git status --short --branch
   git ls-remote --exit-code origin refs/heads/improve-security-seo
   ```

5. Confirm the certificate registry, lookup grants and rate-limit RPC already exist in the production Supabase project. Review the [certificate setup guide](certificate-verification.md) if this is a new database. The deployment workflow only publishes the named function and keeps JWT verification enabled.

## Running and diagnosing a deployment

Each push to `improve-security-seo` triggers the workflow. For a manual run, open **Actions → Deploy CodeBridge Academy → Run workflow** and select `improve-security-seo`. GitHub requires the workflow file to exist on the repository's default branch for manual dispatch. If `main` still contains the historical deployment workflow, update or disable that version separately before pushing to `main`.

The website build, Playwright suite, local accessibility/SEO audit, Deno type check and certificate HTTP tests gate production. The four existing Playwright `fixme` cases target the live registration API and remain listed as skipped. Registration browser tests use mocked submissions. The certificate tests run the actual worker with a local substitute for the database API.

The workflow serializes production runs, fetches the production branch, then fast-forwards the VPS checkout to the tested SHA and verifies HEAD. If the checkout is dirty, has diverged, or a local file would be overwritten, inspect the named failure on the VPS and resolve it before retrying. The workflow does not stash or reset the checkout.

After the Git update, the workflow deploys only `verify-certificate`. It checks the verifier for HTTP 400 and `invalid_input`, then checks the public homepage for HTTP 200. See the Actions job summary and step logs for the exact commit and outcome. If the function deployment or either health check fails after Git advances, the VPS is already at that SHA. Correct the cause and rerun the same commit if it is still current. The workflow does not roll back a newer deployment.
