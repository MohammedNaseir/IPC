#!/bin/bash
awk '
  /^  public getCurrentUser\(\): User \| null {/ {
    print
    p = 1
    next
  }
  p == 1 && /^  public setCurrentUser/ {
    p = 0
  }
  p == 1 {
    if ($0 ~ /const defaultUser = clean \? DEFAULT_CLEAN_ADMIN : INITIAL_USERS\[0\];/) {
      print "    const defaultUser = null; // Enforce login screen"
    } else {
      print
    }
    next
  }
  { print }
' src/lib/neon.ts > src/lib/neon_patched.ts
mv src/lib/neon_patched.ts src/lib/neon.ts
