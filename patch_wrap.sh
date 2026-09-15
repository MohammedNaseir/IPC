#!/bin/bash
awk '
  BEGIN { p = 0 }
  /return \(/ { print; print "    <div className=\"space-y-6\">\n      {!selectedHospitalForProfile ? (\n        <>"; p = 1; next }
  /{\/\* Comprehensive Hospital Profile View \*\/}/ {
    print "        </>\n      ) : (\n        <>";
    print;
    next
  }
  # we need to close the tags at the very end of the file
  /export const HospitalsView/ { p = 0 } # wait, the return is inside this
' src/components/HospitalsView.tsx > /dev/null
