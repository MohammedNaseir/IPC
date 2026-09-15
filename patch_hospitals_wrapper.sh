#!/bin/bash
awk '
  BEGIN { p = 0 }
  /^  return \(/ { print "  return (\n    <div className=\"space-y-6 pb-12 animate-fade-in\" dir=\"rtl\">\n      {!selectedHospitalForProfile ? (\n        <>"; p = 1; next }
  /^{ \/\* Comprehensive Hospital Profile View \*\// {
    print "        </>\n      ) : (\n        <>";
    print;
    next
  }
  /^    <\/div>$/ {
    if (p == 1) { print "      )}"; p=0 }
  }
  { print }
' src/components/HospitalsView.tsx > /tmp/hosp_tmp.tsx
