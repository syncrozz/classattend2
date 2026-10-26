import React from 'react';
import { AttendanceSession, UserRole, Lecturer, OFFICIAL_STUDENT_ATTEND_ICON } from '../types';
import {
  QrCode,
  Volume2,
  VolumeX,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  UserCheck,
  GraduationCap,
  Cloud,
  CheckCircle2,
  BookOpen,
  LogOut,
  User,
  X,
  RefreshCw
} from 'lucide-react';

interface HeaderProps {
  activeSession: AttendanceSession | null;
  activeLecturer: Lecturer | null;
  soundEnabled: boolean;
  isAdmin: boolean;
  currentRole: UserRole;
  onGoHome: () => void;
  onRoleChange: (role: UserRole) => void;
  onToggleSound: (enabled: boolean) => void;
  onOpenScanner: () => void;
  onToggleAdminMode: () => void;
  onLogoutLecturer: () => void;
  onCloseActiveSession?: (sessionId: string) => void;
  isLecturerWorkspaceActive?: boolean;
  onForceSyncCloud?: () => void;
  isSyncingCloud?: boolean;
}

const formatSessionHeaderTitle = (session: { subjectCode?: string; sessionName?: string; className?: string }): string => {
  const code = (session.subjectCode || '').trim().toUpperCase();
  const rawName = (session.sessionName || '').trim();
  const className = (session.className || '').trim().toUpperCase();

  // Simple modern model: organized directly by Subject Code + Class (e.g. [MPU2162] DIA3A)
  if (code && className) {
    const isLegacyOrAutoTemplate =
      /kuliah\s*minggu/i.test(rawName) ||
      new RegExp(`^kuliah\\s*${code}`, 'i').test(rawName) ||
      rawName.toLowerCase() === `kuliah ${code.toLowerCase()} - ${className.toLowerCase()}` ||
      rawName.toUpperCase() === `${code} - ${className}` ||
      rawName.toUpperCase() === `[${code}] ${className}`;

    if (!isLegacyOrAutoTemplate && rawName && rawName.toUpperCase() !== code && rawName.toUpperCase() !== className) {
      const cleanRemark = rawName
        .replace(/^kuliah\s*minggu\s*\d+[\s:–—-]*/i, '')
        .replace(/^kuliah[\s:–—-]*/i, '')
        .trim();
      if (cleanRemark && cleanRemark.toUpperCase() !== code && cleanRemark.toUpperCase() !== className) {
        return `[${code}] ${className} • ${cleanRemark}`;
      }
    }
    return `[${code}] ${className}`;
  }

  if (code) return `[${code}]`;
  return (
    rawName
      .replace(/^kuliah\s*minggu\s*\d+[\s:–—-]*/i, '')
      .replace(/^kuliah[\s:–—-]*/i, '')
      .trim() || 'Sesi Kehadiran'
  );
};

export const Header: React.FC<HeaderProps> = ({
  activeSession,
  activeLecturer,
  soundEnabled,
  isAdmin,
  currentRole,
  onGoHome,
  onRoleChange,
  onToggleSound,
  onOpenScanner,
  onToggleAdminMode,
  onLogoutLecturer,
  onCloseActiveSession,
  isLecturerWorkspaceActive = false,
  onForceSyncCloud,
  isSyncingCloud = false
}) => {
  const isPrivileged = Boolean(activeLecturer || isAdmin);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 w-full max-w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-4 min-w-0">
        {/* Brand & Title - Set as trigger to display default homepage view */}
        <div
          id="header-brand-trigger"
          onClick={onGoHome}
          className="flex items-center gap-2 sm:gap-3 cursor-pointer group select-none transition-all p-1 -ml-1 sm:p-1.5 sm:-ml-1.5 rounded-2xl hover:bg-slate-800/60 active:scale-[0.98] shrink-0 min-w-0"
          title="Klik untuk kembali ke Halaman Utama (Dashboard)"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden shadow-lg shadow-indigo-500/20 ring-1 ring-white/20 bg-slate-900 flex items-center justify-center shrink-0 group-hover:ring-indigo-400/50 transition-all">
            <img
              src={OFFICIAL_STUDENT_ATTEND_ICON}
              alt="Class Attend Logo"
              className="w-full h-full object-contain group-hover:scale-105 transition-transform"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <div className="flex flex-col items-start gap-0.5">
              <h1 className="text-sm sm:text-lg font-extrabold tracking-tight leading-none flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
                <span className="text-white group-hover:text-indigo-200 transition-colors">CLASS</span>
                <span className="text-blue-500 group-hover:text-blue-400 transition-colors">ATTEND</span>
              </h1>
              <span className="hidden xs:inline-flex text-[8px] sm:text-[9px] uppercase font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 tracking-wider mt-0.5 items-center whitespace-nowrap">
                KPM Bandar Penawar
              </span>
            </div>
          </div>
        </div>

        {/* Active Session Pill, Lecturer Badge & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 shrink">
          {/* Active Class Session Indicator: Only interactive / closable if lecturer or admin is logged in */}
          {activeSession ? (
            isPrivileged ? (
              <div
                id="header-active-session-indicator"
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onCloseActiveSession) {
                    onCloseActiveSession(activeSession.id);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (onCloseActiveSession) {
                      onCloseActiveSession(activeSession.id);
                    }
                  }
                }}
                className="cursor-pointer flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 hover:bg-rose-500/20 hover:border-rose-500/40 text-[11px] sm:text-xs font-medium text-emerald-300 hover:text-rose-200 transition-all group select-none active:scale-95 shadow-sm shadow-emerald-950/40 min-w-0 shrink"
                title={`Klik untuk Tutup Sesi: ${formatSessionHeaderTitle(activeSession)}`}
              >
                {/* Normal status pulse dot */}
                <span className="relative flex h-2 w-2 group-hover:hidden shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                
                {/* Close icon on hover */}
                <span className="hidden group-hover:flex items-center justify-center w-3 h-3 text-rose-300 shrink-0">
                  <X className="w-3.5 h-3.5 stroke-[3]" />
                </span>

                <span className="truncate max-w-[85px] xs:max-w-[130px] sm:max-w-[200px] text-slate-200 group-hover:text-rose-100 font-semibold transition-colors">
                  {formatSessionHeaderTitle(activeSession)}
                </span>

                {/* Status badge: Hidden on mobile (< sm) to fit compact viewports */}
                <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 uppercase font-bold border border-emerald-500/30 group-hover:hidden transition-all whitespace-nowrap">
                  KELAS BUKA
                </span>
                <span className="hidden sm:group-hover:inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-200 uppercase font-extrabold border border-rose-500/50 shadow-xs transition-all whitespace-nowrap">
                  TUTUP SESI
                </span>
              </div>
            ) : (
              /* Non-privileged view (Pelajar / Pengguna bukan login pensyarah) -> Non-clickable read-only badge, cannot close session */
              <div
                id="header-active-session-indicator"
                role="status"
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] sm:text-xs font-medium text-emerald-300 select-none shadow-sm shadow-emerald-950/40 pointer-events-none min-w-0 shrink"
                title={`Sesi Kelas Sedang Dibuka: ${formatSessionHeaderTitle(activeSession)}`}
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>

                <span className="truncate max-w-[85px] xs:max-w-[130px] sm:max-w-[200px] text-slate-200 font-semibold">
                  {formatSessionHeaderTitle(activeSession)}
                </span>

                <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 uppercase font-bold border border-emerald-500/30 whitespace-nowrap">
                  KELAS BUKA
                </span>
              </div>
            )
          ) : (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
              <span>Tiada Kelas Dibuka</span>
            </div>
          )}

          {/* Lecturer / Admin Identity Card (Turns green when active) */}
          {activeLecturer || isAdmin ? (
            <div
              id="header-lecturer-indicator"
              className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-xs shadow-lg shadow-emerald-950/40 transition-all shrink-0"
            >
              <div className="relative flex items-center justify-center shrink-0">
                <div className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-[11px] font-bold shadow-sm">
                  {activeLecturer ? activeLecturer.name.charAt(0) : 'A'}
                </div>
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
              </div>
              <div className="hidden md:block text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-white font-semibold text-[11px] leading-tight truncate max-w-[130px]">
                    {activeLecturer ? activeLecturer.name : 'Pentadbir (Admin)'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (isAdmin || activeLecturer?.role === 'ADMIN') {
                        if (currentRole === 'ADMIN') {
                          onRoleChange('LECTURER');
                        } else if (currentRole === 'LECTURER') {
                          onRoleChange('STUDENT');
                        } else {
                          onRoleChange('ADMIN');
                        }
                      }
                    }}
                    title={isAdmin || activeLecturer?.role === 'ADMIN' ? "Klik untuk tukar paparan (Admin / Pensyarah / Paparan Umum)" : undefined}
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold border uppercase transition-all ${
                      currentRole === 'ADMIN'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30'
                        : currentRole === 'LECTURER'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                        : 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30'
                    } ${isAdmin || activeLecturer?.role === 'ADMIN' ? 'cursor-pointer' : ''}`}
                  >
                    {currentRole === 'ADMIN' ? 'ADMIN' : currentRole === 'LECTURER' ? 'PENSYARAH' : 'UMUM'}
                  </button>
                </div>
                <div className="text-[10px] text-emerald-300 font-mono leading-tight truncate max-w-[140px]">
                  {activeLecturer ? activeLecturer.email : 'admin@mara.gov.my'}
                </div>
              </div>
              <button
                type="button"
                id="header-btn-lock-session"
                onClick={onLogoutLecturer}
                title="Kunci Akses (Keluarkan Sesi)"
                className="p-1 sm:p-1.5 text-emerald-400/80 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer ml-0.5 flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden xl:inline text-[10px] font-semibold text-rose-300">Kunci Akses</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 font-medium">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Paparan Umum</span>
              </span>
              <button
                id="header-btn-lecturer-auth"
                onClick={onToggleAdminMode}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
                title="Pengesahan Emel Pensyarah (@mara.gov.my) & Kata Laluan"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Sahkan Pensyarah</span>
              </button>
            </div>
          )}

          {/* Cloud Firestore Sync Button */}
          {onForceSyncCloud && (
            <button
              id="header-btn-cloud-sync"
              onClick={onForceSyncCloud}
              disabled={isSyncingCloud}
              className={`p-1.5 sm:p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                isSyncingCloud
                  ? 'bg-indigo-900/60 border-indigo-500/50 text-indigo-300 animate-pulse'
                  : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
              title="Segar Semula Data (Tarik Data Terkini dari Cloud Firestore)"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isSyncingCloud ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          )}

          {/* Sound Toggle - Hidden on mobile header to conserve space */}
          <button
            id="header-btn-sound-toggle"
            onClick={() => onToggleSound(!soundEnabled)}
            className={`hidden sm:flex p-2 rounded-lg border transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-slate-800 border-slate-700 text-indigo-400 hover:bg-slate-700'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
            title={soundEnabled ? 'Bunyi Diaktifkan' : 'Bunyi Dimatikan'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};

