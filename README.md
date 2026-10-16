<!-- markdownlint-disable -->
<h1>
  <img src=".github/images/banner_muted.png" alt="dash. - a modern server dashboard">
</h1>

<p align="center">
  <a href="https://github.com/MauriceNino/dashdot/actions/workflows/deploy.yaml?branch=main" target="_blank">
    <img title="GitHub Actions" src="https://github.com/MauriceNino/dashdot/actions/workflows/deploy.yaml/badge.svg?branch=main">
  </a>

  <a href="https://discord.gg/3teHFBNQ9W" target="_blank">
    <img title="Discord" src="https://discord.com/api/guilds/986251291577688064/widget.png?style=shield">
  </a>
</p>
<p align="center">
  <i>Feel free to join the <b>Discord</b> and <b>star the repo</b> if you like the project!</i>
</p>

<br/>

<p align="center">
  <b>dash.</b> (or <b>dashdot</b>) is a modern server dashboard,
  running on the latest tech, designed with glassmorphism in mind.
  It is intended to be used for smaller VPS and private servers.
</p>
<br />
<p align="center">
  <a href="https://dash.mauz.dev" target="_blank">Live Demo</a>
 |
  <a href="https://hub.docker.com/r/mauricenino/dashdot" target="_blank">Docker Image</a>
</p>

#

<a href="https://ko-fi.com/mauricenino" target="_blank">
  <img 
    align="right"
    width="160"
    style="padding-left: 20px; padding-bottom: 10px"
    alt="Consider sponsoring the development of this project"
    src="https://cdn.ko-fi.com/cdn/kofi2.png?v=3"
  />
</a>

<!-- markdownlint-enable -->

**dash.** is a open-source project, so any contribution is highly appreciated.
If you are interested in further developing this project, have a look at the
[Contributing.md](./.github/CONTRIBUTING.md).

In case you want to financially support this project, you can visit my
[GitHub Sponsors](https://github.com/sponsors/MauriceNino), or my [Ko-Fi](https://ko-fi.com/mauricenino).

## Preview

<!-- markdownlint-disable -->

| Dark-Mode                                                                                    | Light-Mode                                                                                     |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| <img src="apps/docs/static/img/screenshot_darkmode.png" alt="Screenshot of the dark-mode" /> | <img src="apps/docs/static/img/screenshot_lightmode.png" alt="Screenshot of the light-mode" /> |

<!-- markdownlint-enable -->

## Documentation

- [Installation Options](https://getdashdot.com/docs/installation/docker)
- [Configuration Options](https://getdashdot.com/docs/configuration/basic)
- [Contributing](./.github/CONTRIBUTING.md)
- [Changelog](./.github/CHANGELOG.md)

## Quick Install (Docker)

Images are hosted on [DockerHub](https://hub.docker.com/r/mauricenino/dashdot),
and are available for both AMD64 and ARM devices.

```bash
docker container run -it \
  -p 80:3001 \
  -v /:/mnt/host:ro \
  --privileged \
  mauricenino/dashdot
```

To get more information on why which flag is needed, or if you want to use other
install options instead (`docker-compose`, or from source), have a look at the
[installation options](https://getdashdot.com/docs/installation/docker).

To read more about configuration options, you can visit the [configuration options](https://getdashdot.com/docs/configuration).

## Containers Widget

This build adds an optional widget that monitors every running Docker
container — CPU, memory, network and disk I/O — in the same style as the
existing host-level widgets.

### Enabling it

The widget is **disabled by default**. It only appears once you opt in via
`DASHDOT_WIDGET_LIST`, and it needs the Docker socket mounted:

```yaml
services:
  dash:
    image: mauricenino/dashdot
    restart: unless-stopped
    privileged: true
    ports:
      - '80:3001'
    volumes:
      - /:/mnt/host:ro
      # only required for the containers widget
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      DASHDOT_WIDGET_LIST: 'os,cpu,storage,ram,network,containers'
```

Without the socket the widget renders a "Docker socket not reachable" notice.
Without `containers` in `DASHDOT_WIDGET_LIST` it is not polled, not collected
and not rendered at all — the default remains `os,cpu,storage,ram,network`.

A complete annotated version — including every optional containers setting and
how to switch individual widgets back off — is in
[`docker-compose.example.yml`](./docker-compose.example.yml).

### How it works

The server queries the Docker Engine HTTP API over the unix socket using Node's
built-in `http` module, so **no docker CLI and no new runtime dependency** is
needed. On every `DASHDOT_CONTAINERS_POLL_INTERVAL` (default `5000`ms) it lists
the running containers and requests their stats **in parallel** — each stats
call takes about 1s inside Docker, so parallel fetching keeps a 14-container
host at roughly 2s per poll instead of 14s.

Reported metrics:

- **CPU** — share of _total host capacity_, so all containers added together
  line up with the host `cpu` widget. (`docker stats` reports per-core numbers
  and therefore reads up to `nCPU` times higher.)
- **Memory** — cgroup working set (`usage` minus inactive file cache)
- **Network / Disk I/O** — bytes per second, derived from the cumulative
  counters of the previous poll; restarts reset counters to `0`, never negative
- Containers are listed alphabetically and paged, so charts do not reshuffle
  between polls

Full option reference: [Containers Configuration](./apps/docs/content/docs/configuration/containers.mdx)

## Improved Board Detection

Upstream derives hardware identity from DMI and SPD, both of which misreport on
single board computers. This fork reads the device tree instead, so a Raspberry
Pi now reports real values with **no `DASHDOT_OVERRIDE_*` needed**:

| Field | Upstream | This fork |
| --- | --- | --- |
| CPU brand | `Sony UK` — the PCB manufacturer, from the Pi revision code | `Broadcom` — from the SoC entry `brcm,bcm2712` |
| Memory brand | unset — soldered LPDDR has no SPD | `Raspberry Pi 5 (onboard)` — from the board model |
| Storage brand | empty on NVMe — drives expose no `VENDOR` | `SK hynix` — derived from the drive model |

The existing `DASHDOT_OVERRIDE_*` variables still take precedence, so this only
fills in values that would otherwise be wrong or missing. x86 hosts are
unaffected: they have no device tree, so every lookup falls through to
`systeminformation` unchanged.

## Developer Notice

> Note: Due to the consistently growing size of the `.git` folder, which was
> caused by a combination of [yarn offline mirror](https://yarnpkg.com/features/caching#offline-mirror)
> and [dependabot](https://docs.github.com/en/code-security/getting-started/dependabot-quickstart-guide)
> changes, I had to rewrite the entire history and remove the `.yarn/cache` folder.
> You can read more about this problem [here](https://github.com/yarnpkg/berry/issues/180)
>
> This resulted in a loss of all forks, which were created before the 18th of
> March 2025. If you are one of the affected forks, I am sorry for the inconvenience.
> Please consider re-forking the repository.
