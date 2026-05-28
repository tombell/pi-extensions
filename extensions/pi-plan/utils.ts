const DESTRUCTIVE_PATTERNS = [
  /\brm\b/i,
  /\brmdir\b/i,
  /\bmv\b/i,
  /\bcp\b/i,
  /\bmkdir\b/i,
  /\btouch\b/i,
  /\bchmod\b/i,
  /\bchown\b/i,
  /\bchgrp\b/i,
  /\bln\b/i,
  /\btee\b/i,
  /\btruncate\b/i,
  /\bdd\b/i,
  /(^|[^<])>(?!>)/,
  />>/,
  /\bnpm\s+(install|uninstall|update|ci|link|publish)/i,
  /\byarn\s+(add|remove|install|publish)/i,
  /\bpnpm\s+(add|remove|install|publish)/i,
  /\bpip\s+(install|uninstall)/i,
  /\bapt(-get)?\s+(install|remove|purge|update|upgrade)/i,
  /\bbrew\s+(install|uninstall|upgrade)/i,
  /\bgit\s+(add|commit|push|pull|merge|rebase|reset|checkout|switch|stash|cherry-pick|revert|tag|init|clone|worktree)/i,
  /\bsudo\b/i,
  /\bsu\b/i,
  /\bkill\b/i,
  /\bpkill\b/i,
  /\bkillall\b/i,
  /\breboot\b/i,
  /\bshutdown\b/i,
  /\bsystemctl\s+(start|stop|restart|enable|disable)/i,
  /\bservice\s+\S+\s+(start|stop|restart)/i,
  /\b(vim?|nano|emacs|code|subl)\b/i,
];

const SAFE_PATTERNS = [
  /^\s*(cat|head|tail|less|more|grep|rg|find|fd|ls|pwd|echo|printf|wc|sort|uniq|diff|file|stat|du|df|tree|which|whereis|type|env|printenv|uname|whoami|id|date|uptime|ps|top|htop|jq|awk|bat|eza)\b/i,
  /^\s*sed\s+-n\b/i,
  /^\s*git\s+(status|log|diff|show|branch|remote|config\s+--get|ls-files|ls-tree)\b/i,
  /^\s*npm\s+(list|ls|view|info|search|outdated|audit)\b/i,
  /^\s*yarn\s+(list|info|why|audit)\b/i,
  /^\s*pnpm\s+(list|view|info|search|outdated|audit)\b/i,
  /^\s*(node|python|python3|ruby|go|rustc|cargo)\s+--version\b/i,
  /^\s*curl\s+(-I|--head|-s|--silent|https?:\/\/)/i,
  /^\s*wget\s+(-O\s*-|--spider)\b/i,
];

export function isSafeReadOnlyCommand(command: string): boolean {
  const parts = command.split(/\s*(?:&&|\|\||;|\|)\s*/).filter(Boolean);
  if (parts.length === 0) return false;
  return parts.every(
    (part) =>
      !DESTRUCTIVE_PATTERNS.some((p) => p.test(part)) && SAFE_PATTERNS.some((p) => p.test(part)),
  );
}
