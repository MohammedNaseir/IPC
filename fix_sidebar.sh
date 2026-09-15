#!/bin/bash
awk '
  NR == 75 {
    while ((getline line < "/tmp/sidebar_new.txt") > 0)
      print line
    next
  }
  { print }
' src/components/Sidebar.tsx > src/components/Sidebar_tmp.tsx
mv src/components/Sidebar_tmp.tsx src/components/Sidebar.tsx
