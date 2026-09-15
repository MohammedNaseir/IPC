#!/bin/bash
cat << 'INNER_EOF' > /tmp/sidebar_new.txt
      {/* Metronic Dark Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 right-0 z-40 w-64 bg-[#1e1e2d] text-[#9899ac] flex flex-col transition-transform duration-300 ease-in-out border-l border-[#151521] ${
          isMobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
        dir="rtl"
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-[#151521] bg-[#1e1e2d]">
          <div className="w-9 h-9 rounded-lg bg-[#1b84ff] flex items-center justify-center text-white shadow-md shadow-[#1b84ff]/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold text-[13px] text-white tracking-wide truncate">
              منصة مكافحة العدوى
            </h1>
            <p className="text-[10px] text-[#50cd89] font-semibold truncate uppercase">
              IPC Cluster Portal
            </p>
          </div>
        </div>

        {/* Role & Context Card */}
        <div className="p-3 m-4 rounded-xl bg-[#151521] border border-[#2b2b40] text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] uppercase font-bold text-[#5e6278]">النطاق الحالي</span>
            <span
              className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                isCentral
                  ? 'bg-[#7239ea]/10 text-[#7239ea]'
                  : 'bg-[#50cd89]/10 text-[#50cd89]'
              }`}
            >
              {isCentral ? 'الإدارة المركزية' : 'منسق مستشفى'}
            </span>
          </div>
          <p className="text-white font-medium truncate text-[11px] flex items-center gap-1.5">
            {isCentral ? (
              <>
                <Building className="w-3.5 h-3.5 text-[#7239ea] shrink-0" />
                <span>كافة مستشفيات التجمع الصحي</span>
              </>
            ) : (
              <>
                <Building2 className="w-3.5 h-3.5 text-[#50cd89] shrink-0" />
                <span className="truncate">{currentHospitalName || 'مستشفى مخصص'}</span>
              </>
            )}
          </p>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
          {/* Main Section */}
          <div>
            <div className="px-2 mb-3 text-[10px] font-bold uppercase tracking-wider text-[#5e6278]">
              الرئيسية والمتابعة
            </div>
            <div className="space-y-1">
              <button
                onClick={() => handleNavClick('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'dashboard'
                    ? 'bg-[#1b84ff] text-white shadow-md shadow-[#1b84ff]/20'
                    : 'text-[#9899ac] hover:bg-[#2b2b40] hover:text-white'
                }`}
              >
                <LayoutDashboard className={`w-4 h-4 shrink-0 ${activeTab === 'dashboard' ? 'text-white' : 'text-[#5e6278]'}`} />
                <span>الداشبورد والتقارير</span>
              </button>

              <button
                onClick={() => handleNavClick('visits')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'visits'
                    ? 'bg-[#1b84ff] text-white shadow-md shadow-[#1b84ff]/20'
                    : 'text-[#9899ac] hover:bg-[#2b2b40] hover:text-white'
                }`}
              >
                <ClipboardCheck className={`w-4 h-4 shrink-0 ${activeTab === 'visits' ? 'text-white' : 'text-[#5e6278]'}`} />
                <span>الزيارات الرقابية</span>
              </button>

              <button
                onClick={() => handleNavClick('trainings')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'trainings'
                    ? 'bg-[#1b84ff] text-white shadow-md shadow-[#1b84ff]/20'
                    : 'text-[#9899ac] hover:bg-[#2b2b40] hover:text-white'
                }`}
              >
                <GraduationCap className={`w-4 h-4 shrink-0 ${activeTab === 'trainings' ? 'text-white' : 'text-[#5e6278]'}`} />
                <span>التدريب والتعليم</span>
              </button>
            </div>
          </div>

          {/* Hospitals & Assets */}
          <div>
            <div className="px-2 mb-3 text-[10px] font-bold uppercase tracking-wider text-[#5e6278]">
              المنشآت والأصول
            </div>
            <div className="space-y-1">
              <button
                onClick={() => handleNavClick('hospitals')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'hospitals'
                    ? 'bg-[#1b84ff] text-white shadow-md shadow-[#1b84ff]/20'
                    : 'text-[#9899ac] hover:bg-[#2b2b40] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Building2 className={`w-4 h-4 shrink-0 ${activeTab === 'hospitals' ? 'text-white' : 'text-[#5e6278]'}`} />
                  <span>{isCentral ? 'المستشفيات والمنسقين' : 'ملف المستشفى'}</span>
                </div>
              </button>

              <button
                onClick={() => handleNavClick('assets')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'assets'
                    ? 'bg-[#1b84ff] text-white shadow-md shadow-[#1b84ff]/20'
                    : 'text-[#9899ac] hover:bg-[#2b2b40] hover:text-white'
                }`}
              >
                <Users2 className={`w-4 h-4 shrink-0 ${activeTab === 'assets' ? 'text-white' : 'text-[#5e6278]'}`} />
                <span>الممارسون والأجهزة</span>
              </button>
            </div>
          </div>

          {/* Strategic Planning */}
          <div>
            <div className="px-2 mb-3 text-[10px] font-bold uppercase tracking-wider text-[#5e6278]">
              المستودع والبرامج
            </div>
            <div className="space-y-1">
              <button
                onClick={() => handleNavClick('policies')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'policies'
                    ? 'bg-[#1b84ff] text-white shadow-md shadow-[#1b84ff]/20'
                    : 'text-[#9899ac] hover:bg-[#2b2b40] hover:text-white'
                }`}
              >
                <FileText className={`w-4 h-4 shrink-0 ${activeTab === 'policies' ? 'text-white' : 'text-[#5e6278]'}`} />
                <span>السياسات والنماذج</span>
              </button>

              <button
                onClick={() => handleNavClick('orgDocs')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'orgDocs'
                    ? 'bg-[#1b84ff] text-white shadow-md shadow-[#1b84ff]/20'
                    : 'text-[#9899ac] hover:bg-[#2b2b40] hover:text-white'
                }`}
              >
                <FolderKanban className={`w-4 h-4 shrink-0 ${activeTab === 'orgDocs' ? 'text-white' : 'text-[#5e6278]'}`} />
                <span>الهيكل والوصف الوظيفي</span>
              </button>

              <button
                onClick={() => handleNavClick('docCenter')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'docCenter'
                    ? 'bg-[#1b84ff] text-white shadow-md shadow-[#1b84ff]/20'
                    : 'text-[#9899ac] hover:bg-[#2b2b40] hover:text-white'
                }`}
              >
                <FileArchive className={`w-4 h-4 shrink-0 ${activeTab === 'docCenter' ? 'text-white' : 'text-[#5e6278]'}`} />
                <span>مركز الوثائق العام</span>
              </button>

              <button
                onClick={() => handleNavClick('programs')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'programs'
                    ? 'bg-[#1b84ff] text-white shadow-md shadow-[#1b84ff]/20'
                    : 'text-[#9899ac] hover:bg-[#2b2b40] hover:text-white'
                }`}
              >
                <Network className={`w-4 h-4 shrink-0 ${activeTab === 'programs' ? 'text-white' : 'text-[#5e6278]'}`} />
                <span>البرامج الاستراتيجية</span>
              </button>
            </div>
          </div>

          {/* Dev/Admin System Settings */}
          {isDevAdmin && (
            <div>
              <div className="px-2 mb-3 text-[10px] font-bold uppercase tracking-wider text-[#5e6278]">
                إدارة النظام (Dev)
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => handleNavClick('audit')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === 'audit'
                      ? 'bg-[#f1416c] text-white shadow-md shadow-[#f1416c]/20'
                      : 'text-[#9899ac] hover:bg-[#2b2b40] hover:text-[#f1416c]'
                  }`}
                >
                  <ShieldAlert className={`w-4 h-4 shrink-0 ${activeTab === 'audit' ? 'text-white' : 'text-[#5e6278]'}`} />
                  <span>سجل الحركات (Audit)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
INNER_EOF

sed -i '/<aside/,/<\/aside>/c\$(cat /tmp/sidebar_new.txt)' src/components/Sidebar.tsx
# Using awk is safer for multi-line replacement
awk -v r="$(cat /tmp/sidebar_new.txt)" '
  /<aside/ { p=1; print r; next }
  /<\/aside>/ { p=0; next }
  !p { print }
' src/components/Sidebar.tsx > src/components/Sidebar_tmp.tsx
mv src/components/Sidebar_tmp.tsx src/components/Sidebar.tsx
