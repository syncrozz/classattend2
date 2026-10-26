import React, { useState, useEffect } from 'react';
import {
  Lecturer,
  Subject,
  AttendanceSession,
  AttendanceRecord,
  Student,
  TeachingAssignment,
  ScanResult
} from '../types';
import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  CheckCircle2,
  XCircle,
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Mail,
  Trash2,
  QrCode,
  CalendarCheck,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowRight,
  Plus,
  Layers,
  FileSpreadsheet,
  Download,
  Search,
  BookOpen,
  GraduationCap,
  AlertCircle,
  History,
  LayoutDashboard,
  HardDrive,
  Sliders
} from 'lucide-react';
import { getInitials } from '../utils/studentUtils';
import {
  exportAllAttendanceRecordsToCSV,
  generateAttendanceBackupJSON,
  downloadCSV,
  downloadJSON
} from '../utils/csvHelper';
import { GenerateLecturerQRModal } from './GenerateLecturerQRModal';
import { AuditLogSection } from './AuditLogSection';
import { ScannerSettingsModal, CustomPaceValues } from './ScannerSettingsModal';
import { ScanPaceMode } from './ScannerView';
import { soundService } from '../services/soundService';
import { attendanceEngine } from '../services/attendanceEngine';
import { LECTURER_EMAIL_DOMAIN } from '../utils/staffUtils';

interface AdminControlCenterViewProps {
  lecturers: Lecturer[];
  teachingAssignments: TeachingAssignment[];
  subjects: Subject[];
  sessions: AttendanceSession[];
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  activeSession?: AttendanceSession | null;
  onOpenScanner: () => void;
  onGoToActivities: () => void;
  onGoToStudents: () => void;
  onGoToReports: () => void;
  onCloseActiveSession: (sessionId: string) => void;
  onApproveLecturer: (lecturerId: string) => void;
  onRejectLecturer: (lecturerId: string) => void;
  onOpenLecturerRegistration?: () => void;
  onQuickSimulateScan?: (studentId: string) => ScanResult;
}

export const AdminControlCenterView: React.FC<AdminControlCenterViewProps> = ({
  lecturers,
  teachingAssignments,
  subjects,
  sessions,
  students,
  attendanceRecords,
  activeSession: propActiveSession,
  onOpenScanner,
  onGoToActivities,
  onGoToStudents,
  onGoToReports,
  onCloseActiveSession,
  onApproveLecturer,
  onRejectLecturer,
  onOpenLecturerRegistration,
  onQuickSimulateScan
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'AUDIT_LOG' | 'CO_ADMINS'>('OVERVIEW');
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isScannerSettingsOpen, setIsScannerSettingsOpen] = useState(false);
  const [scanPace, setScanPace] = useState<ScanPaceMode>(() => {
    try {
      const saved = localStorage.getItem('classattend_scan_pace');
      if (saved === 'RELAXED' || saved === 'BALANCED' || saved === 'FAST') return saved;
    } catch {}
    return 'FAST';
  });
  const [soundEnabled, setSoundEnabled] = useState(() => soundService.isEnabled());
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [backupToast, setBackupToast] = useState<string | null>(null);

  // Co-Admin Management states
  const [coAdminEmails, setCoAdminEmails] = useState<string[]>(() => attendanceEngine.getCoAdminEmails());
  const [selectedLecturerEmail, setSelectedLecturerEmail] = useState<string>('');
  const [customEmailInput, setCustomEmailInput] = useState<string>('');
  const [coAdminFeedback, setCoAdminFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [coAdminConfirmRemove, setCoAdminConfirmRemove] = useState<string | null>(null);

  useEffect(() => {
    const unsub = attendanceEngine.subscribeCoAdmins((emails) => {
      setCoAdminEmails(emails);
    });
    return () => unsub();
  }, []);

  const handleAddCoAdmin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const emailCandidate = (selectedLecturerEmail || customEmailInput).trim().toLowerCase();
    if (!emailCandidate) {
      setCoAdminFeedback({
        text: 'Sila pilih pensyarah dari menu atau taipkan alamat emel rasmi MARA.',
        type: 'error'
      });
      return;
    }

    const res = attendanceEngine.addCoAdminEmail(emailCandidate);
    if (res.success) {
      soundService.playSuccess();
      setCoAdminFeedback({ text: res.message, type: 'success' });
      setSelectedLecturerEmail('');
      setCustomEmailInput('');
      setBackupToast(res.message);
      setTimeout(() => setBackupToast(null), 3500);
    } else {
      soundService.playError();
      setCoAdminFeedback({ text: res.message, type: 'error' });
    }
    setTimeout(() => setCoAdminFeedback(null), 6000);
  };

  const handleRemoveCoAdmin = (email: string) => {
    const res = attendanceEngine.removeCoAdminEmail(email);
    if (res.success) {
      soundService.playSuccess();
      setBackupToast(res.message);
      setTimeout(() => setBackupToast(null), 3500);
    }
    setCoAdminConfirmRemove(null);
  };

  const handleBackupAllCSV = () => {
    const csvContent = exportAllAttendanceRecordsToCSV(attendanceRecords, students, sessions);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadCSV(csvContent, `Backup_Semua_Kehadiran_Kolej_${dateStr}.csv`);
    setBackupToast(`Backup CSV (${attendanceRecords.length} rekod) berjaya dimuat turun!`);
    setTimeout(() => setBackupToast(null), 4000);
  };

  const handleBackupAllJSON = () => {
    const jsonContent = generateAttendanceBackupJSON(attendanceRecords, students, sessions, 'Pentadbir Kolej');
    const dateStr = new Date().toISOString().split('T')[0];
    downloadJSON(jsonContent, `Arkib_Backup_Kehadiran_Kolej_${dateStr}.json`);
    setBackupToast('Arkib fail JSON lengkap berjaya dimuat turun!');
    setTimeout(() => setBackupToast(null), 4000);
  };

  // 1. Pending Lecturers for Approval
  const pendingLecturers = lecturers.filter((l) => l.status === 'PENDING');

  // 2. Active Session College-Wide
  const activeSession = propActiveSession || sessions.find((s) => s.status === 'OPEN') || null;


  const activeSessionRecords = activeSession
    ? attendanceRecords.filter((r) => r.sessionId === activeSession.id && r.status === 'PRESENT')
    : [];

  const targetStudentsForActive = activeSession
    ? activeSession.className && activeSession.className !== 'ALL'
      ? students.filter((s) => s.className.toUpperCase() === activeSession.className?.toUpperCase())
      : students
    : [];

  const activePercent =
    targetStudentsForActive.length > 0
      ? Math.round((activeSessionRecords.length / targetStudentsForActive.length) * 100)
      : 0;

  // 3. College Operational Metrics (Real Data Computations)
  const activeLecturersCount = lecturers.filter((l) => l.status !== 'REJECTED' && l.status !== 'PENDING').length;
  const totalStudentsCount = students.length;
  const totalSubjectsCount = subjects.length;
  const totalSessionsCount = sessions.length;
  const totalRecordsCount = attendanceRecords.length;

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    await onApproveLecturer(id);
    setProcessingId(null);
  };

  const handleReject = async (id: string) => {
    if (window.confirm('Adakah anda pasti untuk menolak permohonan pendaftaran pensyarah ini?')) {
      setProcessingId(id);
      await onRejectLecturer(id);
      setProcessingId(null);
    }
  };

  // Recent 10 scans college-wide
  const recentRecords = attendanceRecords.slice(-10).reverse();

  return (
    <div id="admin-control-center" className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Admin Control Center Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>Pusat Kawalan Pentadbir Kolej (Admin)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Pusat Kawalan
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="btn-admin-backup-records-header"
              onClick={handleBackupAllCSV}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              title="Backup semua rekod kehadiran pelajar yang telah diimbas (.CSV)"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Backup Kehadiran</span>
            </button>
            <button
              type="button"
              id="btn-admin-scanner-settings"
              onClick={() => setIsScannerSettingsOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              title="Tetapan Kelajuan Pengimbas (FPS/Jeda) & Kelantangan Audio Kejayaan"
            >
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Tetapan Scanner</span>
            </button>
            <button
              type="button"
              id="btn-admin-generate-qr"
              onClick={() => setIsQRModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <QrCode className="w-4 h-4" />
              <span>Jana QR</span>
            </button>
            <button
              type="button"
              onClick={onGoToStudents}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Master Data</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher: Overview vs Audit Log */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-800/80">
          <button
            type="button"
            id="tab-admin-overview"
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'OVERVIEW'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                : 'bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Ikhtisar & Operasi Kolej</span>
          </button>

          <button
            type="button"
            id="tab-admin-audit-log"
            onClick={() => setActiveTab('AUDIT_LOG')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'AUDIT_LOG'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <History className="w-4 h-4 text-indigo-300" />
            <span>Audit Log Sistem</span>
            <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/30 text-indigo-200 text-[10px] font-mono">
              Live
            </span>
          </button>

          <button
            type="button"
            id="tab-admin-co-admins"
            onClick={() => setActiveTab('CO_ADMINS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'CO_ADMINS'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                : 'bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-purple-300" />
            <span>Pentadbir Bersama</span>
            <span className="px-1.5 py-0.5 rounded-md bg-purple-500/30 text-purple-200 text-[10px] font-mono">
              {coAdminEmails.length}
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'AUDIT_LOG' ? (
        <AuditLogSection />
      ) : activeTab === 'CO_ADMINS' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Banner & Context */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 border border-purple-500/30 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span>Pengurusan Kuasa Pentadbir Bersama (Co-Admin)</span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-white">
                  Tetapan Pentadbir Bersama Kolej
                </h2>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Pentadbir bersama mempunyai kebenaran penuh untuk melihat matriks kehadiran kolej, mengurus penugasan subjek, mengesahkan akaun pensyarah, dan mengendalikan sesi kuliah.
                </p>
              </div>
            </div>

            {/* Khairi status clarification callout */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-300">Makluman Dasar Peranan: </span>
                Akaun <code className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-200 font-mono text-[11px]">khairi.mohd@mara.gov.my</code> telah ditetapkan sebagai <span className="font-bold text-white">Pensyarah biasa</span> (sama taraf dengan pensyarah lain). Pensyarah ini hanya boleh melihat kehadiran kelas diajar melainkan dilantik secara rasmi sebagai Pentadbir Bersama di bawah.
              </div>
            </div>
          </div>

          {/* Form to Add New Co-Admin */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Lantik Pentadbir Bersama Baharu
              </h3>
            </div>

            {coAdminFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  coAdminFeedback.type === 'success'
                    ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/80 border border-rose-500/40 text-rose-200'
                }`}
              >
                {coAdminFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{coAdminFeedback.text}</span>
              </div>
            )}

            <form onSubmit={handleAddCoAdmin} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option 1: Pick from existing registered lecturers */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-400" />
                    <span>Pilih Daripada Pensyarah Berdaftar</span>
                  </label>
                  <select
                    id="select-co-admin-lecturer"
                    value={selectedLecturerEmail}
                    onChange={(e) => {
                      setSelectedLecturerEmail(e.target.value);
                      if (e.target.value) setCustomEmailInput('');
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
                  >
                    <option value="">-- Pilih Pensyarah Kolej --</option>
                    {lecturers
                      .filter((l) => !coAdminEmails.includes(l.email.trim().toLowerCase()))
                      .map((lec) => (
                        <option key={lec.id} value={lec.email}>
                          {lec.name} ({lec.email}) - {lec.department || 'Jabatan'}
                        </option>
                      ))}
                  </select>
                  <p className="text-[11px] text-slate-400">
                    Memilih pensyarah sedia ada akan menaik taraf akaun mereka kepada Pentadbir.
                  </p>
                </div>

                {/* Option 2: Type official email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-purple-400" />
                    <span>Atau Masukkan Emel Rasmi MARA</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      id="input-co-admin-email"
                      placeholder="contoh: nama.pegawai@mara.gov.my"
                      value={customEmailInput}
                      onChange={(e) => {
                        setCustomEmailInput(e.target.value);
                        if (e.target.value) setSelectedLecturerEmail('');
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors placeholder:text-slate-500"
                    />
                    {customEmailInput && !customEmailInput.includes('@') && (
                      <button
                        type="button"
                        onClick={() => setCustomEmailInput(`${customEmailInput.trim()}@mara.gov.my`)}
                        className="absolute right-2 top-2 px-2 py-1 rounded bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-[10px] font-mono cursor-pointer"
                      >
                        + @mara.gov.my
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Emel rasmi bertaraf @mara.gov.my yang dibenarkan login pentadbir.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  id="btn-submit-co-admin"
                  disabled={!selectedLecturerEmail && !customEmailInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Lantik Sebagai Pentadbir Bersama</span>
                </button>
              </div>
            </form>
          </div>

          {/* Active Administrators Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Senarai Pentadbir Kolej Semasa
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-mono font-bold">
                1 Pentadbir Utama + {coAdminEmails.length} Pentadbir Bersama
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Card 1: Master Admin (Permanent System Account) */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-500/40 shadow-lg space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                      <Shield className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">PENTADBIR SISTEM (MASTER)</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          SISTEM INDUK
                        </span>
                      </div>
                      <p className="text-xs text-indigo-300 font-mono">admin@mara.gov.my</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Mod Akses: PIN Master 4-Digit (5313)</span>
                  <span className="text-indigo-300 font-semibold">Kekal / Tidak Boleh Dipadam</span>
                </div>
              </div>

              {/* Co-Admins Cards */}
              {coAdminEmails.map((email) => {
                const clean = email.trim().toLowerCase();
                const matchedLec = lecturers.find(
                  (l) => l.email.trim().toLowerCase() === clean
                );

                return (
                  <div
                    key={clean}
                    className="p-4 rounded-2xl bg-slate-900 border border-purple-500/40 shadow-lg space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                          {getInitials(matchedLec?.name || email)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">
                              {matchedLec?.name || 'PENTADBIR BERSAMA'}
                            </h4>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              CO-ADMIN
                            </span>
                          </div>
                          <p className="text-xs text-purple-300 font-mono">{clean}</p>
                          {matchedLec?.department && (
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {matchedLec.department}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setCoAdminConfirmRemove(clean)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer"
                        title="Gugurkan status Pentadbir Bersama"
                      >
                        <Trash2 className="w-4 h-4 text-rose-400" />
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Status: Kuasa Pentadbir Penuh</span>
                      <button
                        type="button"
                        onClick={() => setCoAdminConfirmRemove(clean)}
                        className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                      >
                        Gugurkan Akses Admin &rarr;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {coAdminEmails.length === 0 && (
              <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
                <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-400">
                  Belum ada Pentadbir Bersama yang dilantik.
                </p>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  Gunakan borang di atas untuk melantik pensyarah menjadi Pentadbir Bersama bagi membantu menguruskan sistem kolej.
                </p>
              </div>
            )}
          </div>

          {/* Confirmation Modal for Removing Co-Admin */}
          {coAdminConfirmRemove && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
              <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
                  <UserX className="w-6 h-6" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-white">
                    Gugurkan Pentadbir Bersama?
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Akses pentadbir untuk <span className="font-mono text-purple-300 font-semibold">{coAdminConfirmRemove}</span> akan ditamatkan. Pensyarah ini akan kembali ke peranan Pensyarah biasa dan hanya boleh melihat kelas sendiri.
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCoAdminConfirmRemove(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveCoAdmin(coAdminConfirmRemove)}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/30 cursor-pointer"
                  >
                    Ya, Gugurkan Akses
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Quick Action Card for Co-Admin Management in Overview */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Pentadbir Bersama (Co-Admin)
                </h4>
                <p className="text-[11px] text-slate-400">
                  {coAdminEmails.length > 0
                    ? `${coAdminEmails.length} pensyarah dilantik sebagai Pentadbir Bersama Kolej.`
                    : 'Tiada pentadbir bersama aktif. Emel khairi.mohd@mara.gov.my bertaraf Pensyarah biasa.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('CO_ADMINS')}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>Tetapan Pentadbir Bersama</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 2. Perlu Perhatian (Pending Approvals & Notifications) */}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Perlu Perhatian Pentadbir ({pendingLecturers.length})
            </h2>
          </div>
          {pendingLecturers.length > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 animate-pulse">
              {pendingLecturers.length} Menunggu Kelulusan
            </span>
          )}
        </div>

        {pendingLecturers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingLecturers.map((lec) => {
              const lecAssignments = teachingAssignments.filter((ta) => ta.lecturerId === lec.id);
              const requestedSubjects = Array.from(new Set(lecAssignments.map((ta) => ta.subjectCode)));
              const requestedClasses = Array.from(new Set(lecAssignments.map((ta) => ta.className)));

              return (
                <div
                  key={lec.id}
                  className="p-4 rounded-2xl bg-slate-900 border-2 border-amber-500/50 shadow-lg shadow-amber-950/20 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 border border-amber-500/30">
                        {getInitials(lec.name)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white leading-tight">{lec.name}</h4>
                        <div className="text-xs text-amber-300 font-mono">{lec.email}</div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold uppercase border border-amber-500/30">
                      PENDING
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 bg-slate-950/80 p-2.5 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">No. Kad Pengenalan:</span>
                      <span className="font-mono font-bold text-slate-200">{lec.icNumber || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Jabatan:</span>
                      <span className="font-semibold text-slate-200">{lec.department || 'Perakaunan'}</span>
                    </div>
                    {requestedSubjects.length > 0 && (
                      <div className="pt-1 border-t border-slate-800 text-[11px]">
                        <span className="text-slate-400 block mb-1">Subjek & Seksyen Dipohon:</span>
                        <div className="flex flex-wrap gap-1">
                          {requestedSubjects.map((s, sIdx) => (
                            <span key={`req-sub-${lec.id}-${s}-${sIdx}`} className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold">
                              {s}
                            </span>
                          ))}
                          {requestedClasses.map((c, cIdx) => (
                            <span key={`req-cls-${lec.id}-${c}-${cIdx}`} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-1 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={processingId === lec.id}
                      onClick={() => handleReject(lec.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Tolak</span>
                    </button>

                    <button
                      type="button"
                      disabled={processingId === lec.id}
                      onClick={() => handleApprove(lec.id)}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Luluskan Akaun</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-3 text-slate-400 text-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Semua permohonan pendaftaran pensyarah telah disahkan & aktif. Tiada tindakan tertunggak.</span>
          </div>
        )}
      </div>

      {/* 3. Sedang Berlangsung (Active College Session) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Sesi Kelas Sedang Berlangsung Kolej
          </h2>
        </div>

        {activeSession ? (
          <div className="p-5 rounded-3xl bg-slate-900 border-2 border-emerald-500/60 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                      {activeSession.subjectCode || 'SUBJEK'}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-bold">
                      {activeSession.className || 'Semua Seksyen'}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase">
                      LIVE
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                    {activeSession.sessionName}
                  </h3>
                  <div className="text-xs text-slate-400">
                    Pensyarah: <strong className="text-slate-200">{activeSession.lecturerName || 'Pentadbir'}</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenScanner}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Urus / Buka Pengimbas</span>
                </button>
                <button
                  type="button"
                  onClick={() => onCloseActiveSession(activeSession.id)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
                >
                  Tutup Sesi
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-300">
                  {activeSessionRecords.length} / {targetStudentsForActive.length} Pelajar Hadir
                </span>
                <span className="text-emerald-400 font-mono font-bold text-sm">
                  {activePercent}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, activePercent)}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Tiada sesi kelas dibuka pada masa ini.</span>
            <button
              type="button"
              onClick={onGoToActivities}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
            >
              + Buka Sesi Baharu
            </button>
          </div>
        )}
      </div>

      {/* 4. Operasi Hari Ini (College Metrics from Real Data) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Metrik Operasi Kolej Hari Ini
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Pensyarah Aktif</div>
            <div className="text-2xl font-black text-white font-mono">{activeLecturersCount}</div>
            <div className="text-[10px] text-emerald-400">Tersedia dalam sistem</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Jumlah Pelajar</div>
            <div className="text-2xl font-black text-indigo-400 font-mono">{totalStudentsCount}</div>
            <div className="text-[10px] text-slate-500">Master Data Pelajar</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Jumlah Subjek</div>
            <div className="text-2xl font-black text-purple-400 font-mono">{totalSubjectsCount}</div>
            <div className="text-[10px] text-slate-500">Kurikulum DIA & MPU</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Rekod Kehadiran</div>
            <div className="text-2xl font-black text-emerald-400 font-mono">{totalRecordsCount}</div>
            <div className="text-[10px] text-emerald-400 font-semibold">Tersimpan di Cloud</div>
          </div>
        </div>
      </div>

      {/* 5. Tindakan Pantas Pentadbir (Admin Actions) */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <button
          type="button"
          onClick={handleBackupAllCSV}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all text-left space-y-2 group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Backup Rekod</div>
            <div className="text-[11px] text-emerald-400 font-medium">Muat turun CSV</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setIsQRModalOpen(true)}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-800/50 transition-all text-left space-y-2 group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">QR Pendaftaran</div>
            <div className="text-[11px] text-slate-400">Papar kod pendaftaran</div>
          </div>
        </button>

        <button
          type="button"
          onClick={onGoToActivities}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all text-left space-y-2 group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <CalendarCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Sesi & Subjek</div>
            <div className="text-[11px] text-slate-400">Buka / pantau kelas</div>
          </div>
        </button>

        <button
          type="button"
          onClick={onGoToStudents}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/50 transition-all text-left space-y-2 group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Master Data</div>
            <div className="text-[11px] text-slate-400">Direktori & jabatan</div>
          </div>
        </button>

        <button
          type="button"
          onClick={onGoToReports}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/50 transition-all text-left space-y-2 group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Laporan Kehadiran</div>
            <div className="text-[11px] text-slate-400">Analisis & muat turun</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('AUDIT_LOG')}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/50 transition-all text-left space-y-2 group cursor-pointer col-span-2 sm:col-span-1"
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center group-hover:scale-110 transition-transform">
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Audit Log</div>
            <div className="text-[11px] text-indigo-400 font-medium">Jejak akauntabiliti</div>
          </div>
        </button>
      </div>

      {/* 6. Aktiviti Terkini (College-Wide Activity Stream) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Aktiviti Kehadiran Terkini Kolej ({recentRecords.length})
            </h2>
          </div>
          {recentRecords.length > 0 && (
            <button
              type="button"
              onClick={onGoToReports}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
            >
              Lihat Semua
            </button>
          )}
        </div>

        {recentRecords.length > 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800/80">
            {recentRecords.map((rec) => {
              const student = students.find((s) => s.id === rec.studentId);
              const session = sessions.find((sess) => sess.id === rec.sessionId);
              const timeFormatted = new Date(rec.timestamp).toLocaleTimeString('ms-MY', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });

              return (
                <div
                  key={rec.id}
                  className="p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-950 border border-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                      {student ? getInitials(student.name) : 'P'}
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-white leading-tight">
                        {student?.name || rec.studentId}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {student?.studentId || rec.studentId} • <span className="text-slate-300 font-semibold">{student?.className}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div className="hidden sm:block">
                      <div className="text-[11px] font-semibold text-slate-300">
                        {session?.subjectCode || session?.sessionName || 'Sesi Kolej'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">{timeFormatted}</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase">
                      HADIR
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-xs">
            Tiada rekod kehadiran direkodkan lagi.
          </div>
        )}
      </div>
        </>
      )}

      {/* Generate Lecturer QR Modal */}
      <GenerateLecturerQRModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
      />

      {/* Scanner Pace & Audio Settings Modal */}
      <ScannerSettingsModal
        isOpen={isScannerSettingsOpen}
        onClose={() => setIsScannerSettingsOpen(false)}
        currentPace={scanPace}
        onSavePace={(newPace, customValues) => {
          setScanPace(newPace);
          try {
            localStorage.setItem('classattend_scan_pace', newPace);
            if (customValues) {
              localStorage.setItem('classattend_scan_pace_is_custom', 'true');
              localStorage.setItem('classattend_custom_fps', String(customValues.fps));
              localStorage.setItem('classattend_custom_cooldown_sec', String(customValues.cooldownMs / 1000));
              localStorage.setItem('classattend_custom_grace_sec', String(customValues.sameCodeGraceMs / 1000));
            } else {
              localStorage.setItem('classattend_scan_pace_is_custom', 'false');
            }
          } catch {}
          setBackupToast('Tetapan kelajuan pengimbas & audio berjaya dikemas kini!');
          setTimeout(() => setBackupToast(null), 3500);
        }}
        soundEnabled={soundEnabled}
        onToggleSound={(enabled) => {
          soundService.setEnabled(enabled);
          setSoundEnabled(enabled);
        }}
        isAdmin={true}
      />

      {/* Backup Toast Notification */}
      {backupToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950 border-2 border-emerald-500/60 text-emerald-200 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{backupToast}</span>
        </div>
      )}
    </div>
  );
};

