# @tombell/pi-status

Slim, minimal custom footer/status bar for Pi.

Shows:

- current working directory
- jj change id when inside a jj repo, otherwise git branch when inside a git repo
- truncated session name when set
- provider / model / thinking level
- token usage and cost from the current session (cost hidden for subscription providers)
- diff summary

Load the package as a Pi extension or point Pi at `extensions/pi-status` while developing.
