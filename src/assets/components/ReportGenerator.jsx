import React, { useState, useRef } from "react";
import { 
    Printer, Download, FileCheck, Calendar, Sliders, Users, ShieldCheck, Briefcase, FileText 
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useTCM } from '../context/TCMContext';
import '../styles/ReportGenerator.css';

// Helper: Generate week keys for all weeks belonging to the selected month (YYYY-MM)
const getWeeksForMonth = (yearMonthStr) => {
    if (!yearMonthStr) return [];
    const [year, month] = yearMonthStr.split('-').map(Number);
    
    const weeks = [];
    const date = new Date(year, month - 1, 1);
    
    let weekIndex = 1;
    while (date.getMonth() === month - 1) {
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - startOfYear) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
        
        const weekKey = `${date.getFullYear()}-W${weekNum}`;
        if (!weeks.some(w => w.key === weekKey)) {
            weeks.push({
                key: weekKey,
                label: `Week ${weekIndex} (${weekKey})`
            });
            weekIndex++;
        }
        date.setDate(date.getDate() + 7);
    }
    return weeks;
};

export default function ReportGenerator() {
    const reportRef = useRef();
    
    // Pull live state from context
    const { members = [], leaders = [], workers = [], units = [], currentMonthKey } = useTCM();

    // Customization Form Controls
    const [reportType, setReportType] = useState('Monthly Executive Summary');
    const [selectedMonth, setSelectedMonth] = useState(currentMonthKey || '2026-11');
    
    const monthWeeks = getWeeksForMonth(selectedMonth);
    const [selectedWeek, setSelectedWeek] = useState(monthWeeks[0]?.key || '');

    const [executiveNote, setExecutiveNote] = useState(
        'Overall engagement across the teens ministry showed steady growth during this reporting period.'
    );

    // Update selectedWeek if month changes
    React.useEffect(() => {
        const weeks = getWeeksForMonth(selectedMonth);
        if (weeks.length > 0) {
            setSelectedWeek(weeks[0].key);
        } else {
            setSelectedWeek('');
        }
    }, [selectedMonth]);

    const isWeekly = reportType === 'Weekly Executive Summary';

    // --- TIME-TRAVEL & FUTURE CHECK ---
    const isFutureMonth = selectedMonth > (currentMonthKey || '');
    const isCurrentMonth = selectedMonth === (currentMonthKey || '');

    // --- METRICS CALCULATION ---
    const totalMembers = members.length;
    const totalLeaders = leaders.length;

    let attendanceMetricValue = 0;
    let attendanceMetricLabel = '';
    let activeLeadersCount = 0;
    let leadershipMetricLabel = '';
    let activeMembersCount = 0;

    if (isFutureMonth) {
        // FUTURE MONTH: Zero out everything since we haven't entered this month yet
        attendanceMetricValue = 0;
        attendanceMetricLabel = isWeekly ? `Turnout for ${selectedWeek}` : `Total Attendance (${selectedMonth})`;
        activeLeadersCount = 0;
        leadershipMetricLabel = isWeekly ? `Leaders Served (${selectedWeek})` : `Active Leaders`;
        activeMembersCount = 0;
    } else if (isWeekly) {
        // WEEKLY MODE (Current or Past)
        attendanceMetricValue = members.filter(m => m.weeklyStatus?.[selectedWeek] === 'served').length;
        attendanceMetricLabel = `Turnout for ${selectedWeek}`;

        activeLeadersCount = leaders.filter(l => l.weeklyStatus?.[selectedWeek] === 'served').length;
        leadershipMetricLabel = `Leaders Served (${selectedWeek})`;

        activeMembersCount = members.filter(m => m.weeklyStatus?.[selectedWeek] === 'served').length;
    } else {
        // MONTHLY MODE (Current or Past)
        attendanceMetricValue = members.reduce((acc, m) => acc + (m.attendanceHistory?.[selectedMonth] || 0), 0);
        attendanceMetricLabel = `Total Cumulative Services (${selectedMonth})`;

        activeLeadersCount = leaders.filter(l => {
            const monthCount = l.attendanceHistory?.[selectedMonth] || l.monthAttendances || 0;
            return monthCount >= 3;
        }).length;
        leadershipMetricLabel = `Active Leaders (≥ 3 Services)`;

        activeMembersCount = members.filter(m => (m.attendanceHistory?.[selectedMonth] || 0) > 0).length;
    }

    const activeParticipationRate = totalLeaders > 0 ? ((activeLeadersCount / totalLeaders) * 100).toFixed(1) : '0.0';

    // Service unit breakdown (zeroed out for future months)
    const unitBreakdown = units.length > 0 ? units.map(u => {
        const assignedWorkers = workers.filter(w => 
            w.unitId === u.id || 
            w.unitId === u.name || 
            w.unit === u.name
        );
        const workerCount = assignedWorkers.length;

        let activeUnitWorkers = 0;
        if (!isFutureMonth) {
            activeUnitWorkers = assignedWorkers.filter(w => {
                const count = w.attendanceHistory?.[selectedMonth] || w.monthServices || w.monthService || 0;
                return count >= 2;
            }).length;
        }

        const activeRate = workerCount > 0 ? `${((activeUnitWorkers / workerCount) * 100).toFixed(1)}%` : '0%';

        return {
            name: u.name || 'Unnamed Unit',
            workers: workerCount,
            activeRate: isFutureMonth ? '0.0%' : activeRate
        };
    }) : [];

    // PDF Export Function
    const handleDownloadPDF = async () => {
        const element = reportRef.current;
        if (!element) return;

        const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#0f172a' });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`TCM_${reportType.replace(/\s+/g, '_')}_${selectedMonth}${isWeekly ? `_${selectedWeek}` : ''}.pdf`); 
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="report-generatortor-container">
            {/* 1. Top Header Bar */}
            <div className="glass-card report-header-bar">
                <div className="report-title-section">
                    <FileCheck size={28} color="#c084fc" />
                    <div>
                        <h2 className="report-title">Custom Report Generator</h2>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Configure executive summaries, attendance audits, and leadership reports
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="glass-btn" onClick={handlePrint} style={{ background: 'transparent', border: '1px solid var(--glass-border)' }}>
                        <Printer size={16} style={{ marginRight: 6 }} /> Print Document
                    </button>
                    <button className="glass-btn" onClick={handleDownloadPDF} style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' }}>
                        <Download size={16} style={{ marginRight: 6 }} /> Download PDF
                    </button>
                </div>
            </div>

            {/* 2. Report Parameters Bar (Positioned Top Right After Header) */}
            <div className="glass-card config-panel-top" style={{ marginTop: '16px', padding: '20px' }}>
                <div className="config-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Sliders size={18} color="#8b5cf6" />
                    <span style={{ fontWeight: 600, fontSize: '1rem' }}>Report Parameters</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'start' }}>
                    <div className="form-group">
                        <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Report Type</label>
                        <select
                            className="glass-input"
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                            style={{ width: '100%' }}
                        >
                            <option value="Monthly Executive Summary" style={{ background: '#0f172a' }}>Monthly Executive Summary</option>
                            <option value="Weekly Executive Summary" style={{ background: '#0f172a' }}>Weekly Executive Summary</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Select Month</label>
                        <input
                            type="month"
                            className="glass-input"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)} 
                            style={{ cursor: 'pointer', color: '#fff', width: '100%' }}
                        />
                    </div>

                    {isWeekly && (
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Select Week</label>
                            <select
                                className="glass-input"
                                value={selectedWeek}
                                onChange={(e) => setSelectedWeek(e.target.value)}
                                style={{ width: '100%' }}
                            >
                                {monthWeeks.map((week) => (
                                    <option key={week.key} value={week.key} style={{ background: '#0f172a' }}>
                                        {week.label}
                                    </option>
                                ))}
                                {monthWeeks.length === 0 && (
                                    <option value="" disabled>No weeks found</option>
                                )}
                            </select>
                        </div>
                    )}

                    <div className="form-group" style={{ gridColumn: isWeekly ? '1 / -1' : 'span 2' }}>
                        <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Executive Commentary</label>
                        <textarea
                            className="glass-input"
                            rows="2"
                            value={executiveNote}
                            onChange={(e) => setExecutiveNote(e.target.value)}
                            placeholder="Enter pastoral observations..."
                            style={{ width: '100%' }}
                        />
                    </div>
                </div>
            </div>

            {/* 3. Printable Document Preview (Full Width Below Controls) */}
            <div className="preview-panel" ref={reportRef} style={{ marginTop: '20px' }}>
                <div className="document-header">
                    <div className="document-branding">
                        <h1>TCM MANAGER</h1>
                        <p>Teens Church Ministry • Executive Summary Report</p>
                    </div>

                    <div className="document-meta">
                        <span style={{ fontWeight: 700, color: '#f8fafc' }}>{reportType}</span>
                        <span>Period: {selectedMonth} {isWeekly ? `(${selectedWeek})` : ''}</span>
                        <span>Generated: {new Date().toDateString()}</span>
                    </div>
                </div>

                {isFutureMonth && (
                    <div style={{ padding: '10px 14px', background: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '8px', color: '#fde047', fontSize: '0.85rem', marginBottom: '16px' }}>
                        ⚠️ Note: You are viewing a future period ({selectedMonth}). No attendance or service records exist for this period yet.
                    </div>
                )}

                <div className="report-block">
                    <div className="block-heading">
                        <FileText size={18} /> Pastoral Remark & Highlights
                    </div>
                    <div className="excutive-note-box">
                        "{executiveNote}"
                    </div>
                </div>

                <div className="report-block">
                    <div className="block-heading">
                        <Users size={18} /> Membership & Attendance Overview ({isWeekly ? selectedWeek : selectedMonth})
                    </div>

                    <div className="metrics-summary-grid">
                        <div className="metric-box">
                            <span className="metric-box-title">Total Roster</span>
                            <span className="metric-box-value" style={{ color: '#3b82f6' }}>{totalMembers}</span>
                        </div>

                        <div className="metric-box">
                            <span className="metric-box-title">Active Members</span>
                            <span className="metric-box-value" style={{ color: '#10b981' }}>{activeMembersCount}</span>
                        </div>

                        <div className="metric-box">
                            <span className="metric-box-title">{attendanceMetricLabel}</span>
                            <span className="metric-box-value" style={{ color: '#c084fc' }}>{attendanceMetricValue}</span>
                        </div>
                    </div>
                </div>

                <div className="report-block">
                    <div className="block-heading">
                        <Users size={18} /> Leadership Engagement Audit ({isWeekly ? selectedWeek : selectedMonth})
                    </div>

                    <div className="metrics-summary-grid">
                        <div className="metric-box">
                            <span className="metric-box-title">Total Leaders</span>
                            <span className="metric-box-value" style={{ color: '#3b82f6' }}>{totalLeaders}</span>
                        </div>

                        <div className="metric-box">
                            <span className="metric-box-title">{leadershipMetricLabel}</span>
                            <span className="metric-box-value" style={{ color: '#10b981' }}>{activeLeadersCount}</span>
                        </div>

                        <div className="metric-box">
                            <span className="metric-box-title">Engagement Rate</span>
                            <span className="metric-box-value" style={{ color: '#c084fc' }}>
                                {totalLeaders > 0 ? `${((activeLeadersCount / totalLeaders) * 100).toFixed(1)}%` : '0%'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="report-block">
                    <div className="block-heading">
                        <Briefcase size={18} /> Service Unit Strength & Roster ({selectedMonth})
                    </div>
                    
                    <table className="doc-table">
                        <thead>
                            <tr>
                                <th>Unit Name</th>
                                <th>Assigned Workers</th>
                                <th>Activity Efficiency</th>
                            </tr>
                        </thead>

                        <tbody>
                            {unitBreakdown.length > 0 ? (
                                unitBreakdown.map((u, idx) => (
                                    <tr key={idx}>
                                        <td style={{ fontWeight: 600 }}>{u.name}</td>
                                        <td>{u.workers} Workers</td>
                                        <td style={{ color: '#10b981', fontWeight: 600 }}>{u.activeRate}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        No service units registered yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}