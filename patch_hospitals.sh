#!/bin/bash
# Replaces the popup structure with a standard block
awk '
  /\{\/\* Comprehensive Hospital Profile Modal \*\/\}/ { in_modal = 1 }
  in_modal { 
    # Just buffer these lines and process them to remove fixed positioning
    buffer = buffer $0 "\n"
  }
  !in_modal { print }
  /<\/div>$/ && in_modal { 
    # Not a simple regex match. Let us do sed or ed instead.
  }
' src/components/HospitalsView.tsx > /dev/null
