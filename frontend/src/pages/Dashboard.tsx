import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AttendanceService, ClassService } from '../services/api';
import { AttendanceSessionOut, ClassItem, User } from '../types';

interface DashboardProps {
  user: User | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<AttendanceSessionOut[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'cs101' | 'cs202' | 'audit'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sessData, classData] = await Promise.all([
          AttendanceService.getSessions(),
          ClassService.getClasses()
        ]);
        setSessions(sessData);
        setClasses(classData);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      showToast(`Ingesting ${e.target.files[0].name} • Analyzing EXIF Metadata...`);
      setTimeout(() => {
        navigate('/take-attendance');
      }, 1000);
    }
  };

  const handleTriggerScanner = () => {
    showToast('Initiating instantaneous 4K frame extraction & biometric vector parse...');
    setTimeout(() => {
      navigate('/take-attendance');
    }, 800);
  };

  const handleLaunchLiveScanner = () => {
    showToast('Engaging live optical scanning matrix in Hall 4B...');
    setTimeout(() => {
      navigate('/take-attendance');
    }, 800);
  };

  // Mock sessions for rich initial display if backend is empty
  const displaySessions = sessions.length > 0 ? sessions : [
    {
      id: 4028,
      class_id: 1,
      class_name: 'CS-101',
      subject_id: 1,
      subject_name: 'Advanced Data Structures',
      subject_code: 'CS-101',
      date: 'Today',
      start_time: '09:05 AM',
      image_path: '',
      total_faces_detected: 48,
      present_count: 46,
      total_enrolled: 48,
      verification_rate: 95.8,
      flags_count: 2,
      status: 'AUDIT_NEEDED',
    },
    {
      id: 4027,
      class_id: 2,
      class_name: 'CS-202',
      subject_id: 2,
      subject_name: 'Systems Programming',
      subject_code: 'CS-202',
      date: 'Oct 24',
      start_time: '02:00 PM',
      image_path: '',
      total_faces_detected: 50,
      present_count: 50,
      total_enrolled: 50,
      verification_rate: 100,
      flags_count: 0,
      status: 'FINALIZED',
    },
    {
      id: 4026,
      class_id: 1,
      class_name: 'CS-101',
      subject_id: 1,
      subject_name: 'Advanced Data Structures',
      subject_code: 'CS-101',
      date: 'Oct 23',
      start_time: '10:00 AM',
      image_path: '',
      total_faces_detected: 48,
      present_count: 47,
      total_enrolled: 48,
      verification_rate: 97.9,
      flags_count: 1,
      status: 'AUDIT_NEEDED',
    },
    {
      id: 4025,
      class_id: 1,
      class_name: 'CS-101',
      subject_id: 1,
      subject_name: 'Advanced Data Structures',
      subject_code: 'CS-101',
      date: 'Oct 22',
      start_time: '09:00 AM',
      image_path: '',
      total_faces_detected: 48,
      present_count: 48,
      total_enrolled: 48,
      verification_rate: 100,
      flags_count: 0,
      status: 'FINALIZED',
    }
  ];

  return (
    <div className="flex flex-col w-full space-y-8 text-[#e5e1e4]">
      {/* ── Top Editorial Header & Operational Context ── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#3c4a42]/30">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-widest text-[#86948a] font-mono">Academic Year 2024–2025</span>
            <span className="text-[#3c4a42] text-xs">/</span>
            <span className="text-[11px] uppercase tracking-widest text-[#4edea3] font-semibold font-mono">Lecture Operations</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
            <h1 className="text-3xl sm:text-4xl font-semibold text-[#e5e1e4] tracking-tight">Dashboard</h1>
            <div className="flex items-center gap-2 text-xs text-[#bbcabf]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4edea3]"></span>
              <span>CS-101: Advanced Data Structures</span>
              <span className="text-[#3c4a42]">•</span>
              <span className="text-[#86948a]">Lecture Hall 4B (Cap: 50)</span>
            </div>
          </div>
        </div>

        {/* Executive Action Group */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => {
              showToast('Generating XLSX Term Dossier with 128-D Audit Signatures...');
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-[#1c1b1d] hover:bg-[#201f22] border border-[#3c4a42]/40 text-[#e5e1e4] text-xs transition-colors shadow-xs"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px] text-[#86948a]">file_download</span>
            <span>Export Term Dossier (.XLSX)</span>
          </button>
          <button
            onClick={handleLaunchLiveScanner}
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-[#4edea3] text-[#003824] text-xs font-semibold hover:opacity-90 active:scale-[0.99] transition-all shadow-xs"
            type="button"
          >
            <span className="material-symbols-outlined text-[17px]">camera_outdoor</span>
            <span>Launch Live Scanner</span>
          </button>
        </div>
      </header>

      {/* ── Key Metrics Row (Swiss Typography, No Gratuitous Glowing Cards) ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-4 border-b border-[#3c4a42]/30">
        <div className="flex flex-col gap-1 pr-6 border-r-0 lg:border-r border-[#3c4a42]/20">
          <span className="text-[11px] uppercase tracking-wider text-[#86948a] font-mono">Term Average Attendance</span>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-3xl font-semibold text-[#e5e1e4] tracking-tight">94.8%</span>
            <span className="inline-flex items-center text-[#4edea3] font-mono text-xs">
              <span className="material-symbols-outlined text-[14px] mr-0.5">trending_up</span>+1.6%
            </span>
          </div>
          <span className="text-xs text-[#86948a] mt-0.5">vs Fall 2023 baseline</span>
        </div>

        <div className="flex flex-col gap-1 pr-6 border-r-0 lg:border-r border-[#3c4a42]/20">
          <span className="text-[11px] uppercase tracking-wider text-[#86948a] font-mono">Students Present Today</span>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-3xl font-semibold text-[#e5e1e4] tracking-tight">
              46<span className="text-[#86948a]/60 text-lg font-normal"> / 48</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/20 text-[10px] font-mono font-semibold">
              95.8%
            </span>
          </div>
          <span className="text-xs text-[#86948a] mt-0.5">CS-101 Sec 02 • Morning</span>
        </div>

        <div className="flex flex-col gap-1 pr-6 border-r-0 lg:border-r border-[#3c4a42]/20">
          <span className="text-[11px] uppercase tracking-wider text-[#86948a] font-mono">Visual Verification Queue</span>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-3xl font-semibold text-[#ffb77d] tracking-tight">3 Flags</span>
            <span className="px-2 py-0.5 rounded-full bg-[#ffb77d]/10 text-[#ffb77d] border border-[#ffb77d]/20 text-[10px] font-mono font-semibold">
              Pending Audit
            </span>
          </div>
          <span className="text-xs text-[#86948a] mt-0.5">Partial occlusion & shadows</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wider text-[#86948a] font-mono">Neural Vector Latency</span>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-3xl font-semibold text-[#e5e1e4] tracking-tight">
              14.2<span className="text-[#86948a]/70 text-lg">ms</span>
            </span>
            <span className="inline-flex items-center text-[#4edea3] font-mono text-xs">
              <span className="material-symbols-outlined text-[13px] mr-1">bolt</span>Edge Node
            </span>
          </div>
          <span className="text-xs text-[#86948a] mt-0.5">TensorRT on Jetson AGX</span>
        </div>
      </section>

      {/* ── Hero Dual Action & Ingestion Architecture ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-2 border-b border-[#3c4a42]/30">
        {/* Left Ingestion: Upload Classroom Capture */}
        <div className="group relative flex flex-col justify-between p-6 rounded-lg bg-[#0e0e10] border border-[#3c4a42]/30 hover:border-[#3c4a42]/60 transition-all shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[#86948a] font-mono">Method A • High Resolution Still</span>
              <h2 className="text-base text-[#e5e1e4] font-semibold mt-1">Upload Classroom Capture</h2>
            </div>
            <span className="material-symbols-outlined text-[#86948a] group-hover:text-[#4edea3] transition-colors text-[20px]">
              photo_camera
            </span>
          </div>

          {/* Drag & Drop Zone */}
          <div className="mt-6 flex flex-col items-center justify-center p-8 rounded border border-dashed border-[#3c4a42]/50 bg-[#1c1b1d]/50 hover:bg-[#1c1b1d] hover:border-[#86948a]/50 transition-all cursor-pointer text-center relative overflow-hidden">
            <input
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              type="file"
              onChange={handleFileUpload}
            />
            <div className="w-10 h-10 rounded-full bg-[#201f22] flex items-center justify-center border border-[#3c4a42]/40 text-[#86948a] mb-3 group-hover:border-[#4edea3]/50 group-hover:text-[#4edea3] transition-all">
              <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
            </div>
            <p className="text-xs text-[#e5e1e4] font-medium">Drop high-res 4K/8K classroom photo or browse files</p>
            <p className="text-[10px] text-[#86948a] uppercase tracking-wider font-mono mt-1.5">
              EXIF Timestamp & Orientation Auto-Extracted • RAW, JPEG, TIFF
            </p>
          </div>

          {/* Upload Sample Context Drawer */}
          <div className="mt-5 pt-4 border-t border-[#3c4a42]/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                className="w-10 h-10 rounded object-cover border border-[#3c4a42]/30"
                alt="Lecture hall sample"
                src="/hero-scenic-1.jpg"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=300&q=80";
                }}
              />
              <div className="flex flex-col">
                <span className="text-xs text-[#e5e1e4] font-medium truncate max-w-[200px]">DSC_0894_Hall4B_Term2.RAW</span>
                <span className="font-mono text-[11px] text-[#86948a]">Processed 10:14 AM • 48 Faces Parsed</span>
              </div>
            </div>
            <button
              onClick={() => showToast('EXIF: Sony ILCE-7RM4 • 35mm • ISO 400 • f/2.8 • 1/125s • GPS Hall 4B')}
              className="text-[#86948a] hover:text-[#e5e1e4] font-mono text-[11px] underline transition-colors"
              type="button"
            >
              Inspect EXIF
            </button>
          </div>
        </div>

        {/* Right Ingestion: Connected Hardware Stream */}
        <div className="flex flex-col justify-between p-6 rounded-lg bg-[#0e0e10] border border-[#3c4a42]/30 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-[#86948a] font-mono">Method B • Fixed Optical Rig</span>
                <span className="px-2 py-0.5 rounded-full bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/20 text-[10px] font-mono font-semibold">
                  Active Feed
                </span>
              </div>
              <h2 className="text-base text-[#e5e1e4] font-semibold mt-1">Hall 4B Ceiling Cam 01 (Overhead Sony 4K Rig)</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-[#86948a]">60 FPS</span>
              <span className="h-2 w-2 rounded-full bg-[#4edea3] animate-pulse"></span>
            </div>
          </div>

          {/* Stream Preview Frame */}
          <div className="relative mt-6 rounded overflow-hidden border border-[#3c4a42]/30 bg-[#1c1b1d] aspect-[16/8] flex items-center justify-center group">
            <img
              className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
              alt="Live lecture hall camera feed"
              src="/hero-scenic-2.jpg"
              onError={(e) => {
                e.currentTarget.src = "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e10]/90 via-transparent to-[#0e0e10]/30"></div>

            {/* Camera HUD Overlays */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#0e0e10]/90 backdrop-blur-md border border-[#3c4a42]/40 font-mono text-[10px] text-[#e5e1e4]">
                4K • 3840×2160
              </span>
              <span className="px-2 py-0.5 rounded bg-[#0e0e10]/90 backdrop-blur-md border border-[#3c4a42]/40 font-mono text-[10px] text-[#4edea3]">
                Calibrated • Zero Distortion
              </span>
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[#bbcabf] font-mono text-[11px]">
                <span className="material-symbols-outlined text-[14px] text-[#86948a]">center_focus_strong</span>
                <span>Lens FOV: 114° Rectilinear</span>
              </div>
              <button
                onClick={handleTriggerScanner}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#131315] text-[#e5e1e4] border border-[#3c4a42]/50 hover:bg-[#201f22] text-xs font-medium transition-all shadow-sm"
                type="button"
              >
                <span className="material-symbols-outlined text-[15px] text-[#4edea3]">sensors</span>
                <span>Trigger Instant Scan</span>
              </button>
            </div>
          </div>

          {/* Feed Status Sub-bar */}
          <div className="mt-5 pt-4 border-t border-[#3c4a42]/20 flex items-center justify-between text-xs">
            <span className="text-[#86948a]">
              RTSP Stream: <span className="font-mono text-[#e5e1e4]">rtsp://vision-node-01.campus.local:554/live</span>
            </span>
            <span className="text-[#4edea3] font-mono text-[11px]">Sync: 0.1ms Jitter</span>
          </div>
        </div>
      </section>

      {/* ── Main Split Architecture (Recent Sessions 65% | Schedule & Hardware 35%) ── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-2">
        {/* Left Column: Session Archive Table (65%) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base text-[#e5e1e4] font-semibold">Recent Attendance Sessions</h2>
              <p className="text-xs text-[#86948a]">Authenticated ledger records and biometric verifications</p>
            </div>

            {/* Filter Segmented Tabs */}
            <div className="inline-flex items-center p-1 rounded bg-[#1c1b1d] border border-[#3c4a42]/30 text-xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded transition-all text-xs ${
                  filter === 'all'
                    ? 'bg-[#2a2a2c] text-[#e5e1e4] font-medium'
                    : 'text-[#86948a] hover:text-[#e5e1e4]'
                }`}
                type="button"
              >
                All Courses
              </button>
              <button
                onClick={() => setFilter('cs101')}
                className={`px-3 py-1 rounded transition-all text-xs ${
                  filter === 'cs101'
                    ? 'bg-[#2a2a2c] text-[#e5e1e4] font-medium'
                    : 'text-[#86948a] hover:text-[#e5e1e4]'
                }`}
                type="button"
              >
                CS-101
              </button>
              <button
                onClick={() => setFilter('cs202')}
                className={`px-3 py-1 rounded transition-all text-xs ${
                  filter === 'cs202'
                    ? 'bg-[#2a2a2c] text-[#e5e1e4] font-medium'
                    : 'text-[#86948a] hover:text-[#e5e1e4]'
                }`}
                type="button"
              >
                CS-202
              </button>
              <button
                onClick={() => setFilter('audit')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded transition-all text-xs ${
                  filter === 'audit'
                    ? 'bg-[#2a2a2c] text-[#e5e1e4] font-medium'
                    : 'text-[#86948a] hover:text-[#e5e1e4]'
                }`}
                type="button"
              >
                <span>Audit Required</span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#ffb77d]"></span>
              </button>
            </div>
          </div>

          {/* Minimalist Ledger Table */}
          <div className="w-full overflow-x-auto rounded-lg border border-[#3c4a42]/30 bg-[#0e0e10]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#3c4a42]/30 bg-[#1c1b1d]/40">
                  <th className="py-3.5 px-4 uppercase tracking-wider text-[#86948a] font-mono font-semibold text-[10px]">
                    Date & Time
                  </th>
                  <th className="py-3.5 px-4 uppercase tracking-wider text-[#86948a] font-mono font-semibold text-[10px]">
                    Course & Section
                  </th>
                  <th className="py-3.5 px-4 uppercase tracking-wider text-[#86948a] font-mono font-semibold text-[10px]">
                    Source
                  </th>
                  <th className="py-3.5 px-4 uppercase tracking-wider text-[#86948a] font-mono font-semibold text-[10px]">
                    Verification
                  </th>
                  <th className="py-3.5 px-4 uppercase tracking-wider text-[#86948a] font-mono font-semibold text-[10px]">
                    Audit
                  </th>
                  <th className="py-3.5 px-4 uppercase tracking-wider text-[#86948a] font-mono font-semibold text-[10px]">
                    Status
                  </th>
                  <th className="py-3.5 px-4 text-right uppercase tracking-wider text-[#86948a] font-mono font-semibold text-[10px]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3c4a42]/20 font-medium">
                {displaySessions.map((sess: any) => {
                  const pct = sess.verification_rate || Math.round((sess.present_count / (sess.total_enrolled || 1)) * 100);
                  const isAudit = sess.flags_count > 0 || sess.status === 'AUDIT_NEEDED';
                  return (
                    <tr key={sess.id} className="hover:bg-[#1c1b1d]/60 transition-colors group">
                      <td className="py-4 px-4 font-mono text-[11px] text-[#e5e1e4]">
                        {sess.date}, {sess.start_time}
                      </td>
                      <td className="py-4 px-4 font-medium text-[#e5e1e4]">
                        {sess.class_name} <span className="text-[#86948a] font-normal text-xs">• {sess.subject_name}</span>
                      </td>
                      <td className="py-4 px-4 text-[#bbcabf] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-[#86948a]">videocam</span>
                        <span>4K Stream (Hall 4B)</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-[#2a2a2c] overflow-hidden">
                            <div className="bg-[#4edea3] h-full rounded-full" style={{ width: `${pct}%` }}></div>
                          </div>
                          <span className="font-mono text-[11px] text-[#e5e1e4]">{pct}%</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {isAudit ? (
                          <span className="inline-flex items-center gap-1 text-[#ffb77d] font-mono text-[11px] font-semibold">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#ffb77d]"></span>
                            {sess.flags_count || 2} flags
                          </span>
                        ) : (
                          <span className="text-[#86948a] font-mono text-[11px]">0 flags</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {isAudit ? (
                          <span className="px-2 py-0.5 rounded-full bg-[#ffb77d]/10 text-[#ffb77d] border border-[#ffb77d]/20 text-[10px] font-mono font-semibold">
                            Audit Needed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/20 text-[10px] font-mono font-semibold">
                            Finalized
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => navigate('/review-attendance')}
                          className="text-xs text-[#86948a] hover:text-[#4edea3] transition-colors inline-flex items-center gap-1 font-medium"
                        >
                          <span>{isAudit ? 'Inspect' : 'Review'}</span>
                          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footnote / Audit Digest */}
          <div className="flex items-center justify-between text-[#86948a] text-xs px-1">
            <span className="font-mono text-[11px]">Showing {displaySessions.length} lecture sessions this semester</span>
            <button
              onClick={() => navigate('/history')}
              className="text-[#e5e1e4] hover:text-[#4edea3] transition-colors font-medium text-xs inline-flex items-center gap-1"
            >
              <span>View Session Archives</span>
              <span className="material-symbols-outlined text-[14px]">north_east</span>
            </button>
          </div>
        </div>

        {/* Right Column: Schedule & Hardware Telemetry (35%) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Daily Schedule Timeline */}
          <div className="p-6 rounded-lg bg-[#0e0e10] border border-[#3c4a42]/30 flex flex-col gap-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm text-[#e5e1e4] font-semibold">Today's Schedule</h2>
              <span className="font-mono text-[11px] text-[#86948a]">Oct 25, 2024</span>
            </div>
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-[#3c4a42]/30">
              {/* Item 1: Completed */}
              <div className="relative">
                <span className="absolute -left-[23px] top-1.5 h-3 w-3 rounded-full bg-[#131315] border-2 border-[#4edea3]"></span>
                <div className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#e5e1e4]">CS-101: Data Structures</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#4edea3]/10 text-[#4edea3] font-mono text-[10px]">
                      Completed
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-[#86948a] mt-0.5">09:00 – 10:30 AM • Hall 4B</span>
                </div>
              </div>

              {/* Item 2: In Progress */}
              <div className="relative">
                <span className="absolute -left-[23px] top-1.5 h-3 w-3 rounded-full bg-[#4edea3] animate-ping opacity-75"></span>
                <span className="absolute -left-[23px] top-1.5 h-3 w-3 rounded-full bg-[#4edea3]"></span>
                <div className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#e5e1e4]">Office Hours: Advising</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#2a2a2c] text-[#bbcabf] font-mono text-[10px]">
                      Now Active
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-[#86948a] mt-0.5">11:00 AM – 12:30 PM • Turing 302</span>
                </div>
              </div>

              {/* Item 3: Upcoming */}
              <div className="relative">
                <span className="absolute -left-[23px] top-1.5 h-3 w-3 rounded-full bg-[#131315] border-2 border-[#3c4a42]/60"></span>
                <div className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#e5e1e4]">CS-202: Systems Programming</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#201f22] text-[#86948a] font-mono text-[10px]">
                      In 2h 15m
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-[#86948a] mt-0.5">02:00 – 03:45 PM • Hall 2A</span>
                </div>
              </div>
            </div>
          </div>

          {/* Discrepancy Spotlight Card (Amber Accent Friction State) */}
          <div className="p-6 rounded-lg bg-[#0e0e10] border border-[#ffb77d]/30 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#ffb77d]"></span>
                  <span className="text-[10px] uppercase tracking-wider text-[#ffb77d] font-mono font-semibold">
                    Discrepancy Spotlight
                  </span>
                </div>
                <span className="font-mono text-[10px] text-[#86948a]">Session #4028</span>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <div className="relative w-14 h-14 rounded-full p-0.5 border border-[#ffb77d]/60 shrink-0">
                  <img
                    className="w-full h-full rounded-full object-cover"
                    alt="Dev Patel candidate crop"
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 bg-[#ffb77d] text-[#4d2600] rounded-full w-4 h-4 flex items-center justify-center font-mono text-[9px] font-bold">
                    !
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-[#e5e1e4]">Marcus Vance (ID: 8092)</span>
                  <span className="font-mono text-[11px] text-[#86948a]">Confidence Score: 68.4%</span>
                  <span className="text-xs text-[#ffb77d] mt-0.5">Vector ambiguity (Seat 14F)</span>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-[#3c4a42]/20 flex items-center justify-between">
              <span className="text-xs text-[#86948a]">Assigned to: Prof. Jenkins</span>
              <button
                onClick={() => navigate('/review-attendance')}
                className="px-3 py-1.5 rounded bg-[#ffb77d]/10 hover:bg-[#ffb77d]/20 text-[#ffb77d] border border-[#ffb77d]/30 text-xs font-medium transition-colors"
                type="button"
              >
                Resolve on Canvas
              </button>
            </div>
          </div>

          {/* Edge Hardware Diagnostics Minimal Widget */}
          <div className="p-5 rounded-lg bg-[#0e0e10] border border-[#3c4a42]/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-[#201f22] flex items-center justify-center text-[#86948a]">
                <span className="material-symbols-outlined text-[18px]">memory</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-[#e5e1e4] font-medium">Vision Node 01</span>
                <span className="font-mono text-[10px] text-[#4edea3]">CUDA Load: 34% • 41°C</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4edea3]"></span>
              <span className="font-mono text-[11px] text-[#86948a]">Operational</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Feedback Toaster */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded bg-[#2a2a2c] border border-[#3c4a42]/60 shadow-2xl text-xs font-medium text-[#e5e1e4] animate-in fade-in slide-in-from-bottom-5 duration-200">
          <span className="material-symbols-outlined text-[#4edea3] text-[18px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
