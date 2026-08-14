#!/usr/bin/env bash
# Logging helpers. Sourced only.

C_RESET='\033[0m'
C_BLUE='\033[0;34m'
C_GREEN='\033[0;32m'
C_YELLOW='\033[0;33m'
C_RED='\033[0;31m'

# log_step <n> <message...>  — numbered stage header, e.g. "[03] Installing system packages..."
log_step() {
  local n="$1"; shift
  printf "\n${C_BLUE}[%02d] %s...${C_RESET}\n" "$n" "$*"
}

log_info() { printf "${C_BLUE}    -> %s${C_RESET}\n" "$*"; }
log_ok()   { printf "${C_GREEN}    OK   %s${C_RESET}\n" "$*"; }
log_warn() { printf "${C_YELLOW}    WARN %s${C_RESET}\n" "$*" >&2; }
log_err()  { printf "${C_RED}    ERROR %s${C_RESET}\n" "$*" >&2; }
