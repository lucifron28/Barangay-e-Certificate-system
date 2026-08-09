# Sudo-Free Agent Container

## Purpose

This repository includes an isolated development container for coding agents. It keeps the host sudo password and other host credentials outside the agent runtime while providing the tools needed for the next Turso and Vercel work.

This is tooling only. It does not migrate the application to Turso, deploy the application, or change certificate lifecycle or database-provider behavior.

## Recommended host setup

The preferred host configuration is rootless Docker or rootless Podman. The repository assumes the human owner has installed and configured the container runtime. The agent does not install Docker, change host groups, edit system configuration, or invoke sudo.

If Docker is installed but `docker version` or `docker info` is denied for the current user, configure rootless Docker or rootless Podman on the host and rerun the validation. Do not provide a sudo password to the agent.

## Setup

From the repository root:

```bash
cp .env.agent.example .env.agent
```

Replace placeholders in `.env.agent` locally. `.env.agent` is ignored by Git. The example file contains no real credentials.

`DATABASE_PROVIDER` must remain `sqlite` in this phase. Turso variables are placeholders for the next migration phase and are not used by the current application.

## Build and start

```bash
docker compose -f compose.agent.yml build
./scripts/agent-shell.sh
```

The shell script checks Docker access without elevation, then runs:

```bash
docker compose -f compose.agent.yml run --rm --service-ports agent
```

The container listens on port 3000. Inside the container, start the application on all container interfaces:

```bash
npm run dev -- -H 0.0.0.0
```

Open [http://localhost:3000](http://localhost:3000) on the host.

## Doctor and project checks

Inside the container:

```bash
./scripts/agent-doctor.sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

The doctor reports tool versions and only `SET` or `MISSING` for environment variables. It never prints credential values. It fails if the runtime is root, the Docker socket is mounted, a required tool is missing, or the workspace is not writable.

## GitHub authentication

Use `GH_TOKEN` from `.env.agent`; do not mount `~/.config/gh` or `~/.ssh` into the container.

The recommended token is a fine-grained GitHub token restricted to `lucifron28/Barangay-e-Certificate-system` with only the permissions needed for repository contents, pull requests, metadata, and Actions/check reading.

Inside the container:

```bash
gh auth status
gh auth setup-git
```

Use the HTTPS repository remote for agent operations. Do not switch the remote to SSH or expose a host private key.

## Security boundaries

The container does not receive:

- the host sudo or root password
- the host Docker socket
- host SSH keys
- the host home directory
- host GitHub credential files
- the host root filesystem

The compose service is not privileged, uses `no-new-privileges`, drops all Linux capabilities, and runs as the unprivileged `node` user. It binds only this repository at `/workspace`; the only other mount is a named npm cache volume.

## Turso and Vercel placeholders

`TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are reserved for the separate Turso migration goal. This phase must not use them to run remote SQL or change `DATABASE_PROVIDER`.

`VERCEL_TOKEN` and `BLOB_READ_WRITE_TOKEN` are optional. Normal deployment is expected to use the GitHub-to-Vercel integration, so an agent does not need a Vercel token for ordinary development. Do not create a Blob store in this phase.

## Stopping

Exit the shell, or from the host run:

```bash
docker compose -f compose.agent.yml down
```

Rootless Podman can generally build and run the same Dockerfile. A separate Podman-specific stack is intentionally not added.

## Current host validation status

On the development host used for this repository, the Docker client is installed but the Docker engine is not available to the current user without elevation. No elevated Docker validation was attempted. Once rootless Docker or rootless Podman is configured, run the build, `agent-doctor.sh`, and the project checks above.
