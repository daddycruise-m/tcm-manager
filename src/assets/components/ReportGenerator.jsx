import React, { useState, useRef } from "react";
import { 
    Printer, Download, FileCheck, Calendar, Sliders, Users, ShieldCheck, Briefcase, FileText, CheckSquare
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useTCM } from '../context/TCMContext'; // Import your global context hook
import '../styles/ReportGenerator.css';

export default function ReportGenerator() {
    const reportRef = useRef();
    
    // Pull live state from your Firebase Realtime Database context
    const { members = [], leaders = [], units = [] } = useTCM();

    // Customization Form Controls
    const [ reportType, setReportType ] = useState('Monthly Summary');
    const [ selectedMonth, setSelectedMonth ] = useState('October 2026');
    const [ executiveNote, setExecutiveNote ] = useState(
        'Overall engagement across the teens ministry showed steady growth this month.'
    );

    // Section Toggle States
    const [ includeSections, setIncludeSections ] = useState({
        membership: true,
        leaders: true,
        workers: true,
        executiveNote: true,
    });

    // Dynamically calculate metrics from live database state (with fallback defaults if empty)
    // Strict Live Database Metrics
    const totalMembers = members.length;
    const activeMembers = members.filter(m => m.status === 'Active' || m.isActive).length;
    const totalLeaders = leaders.length;
    const activeLeaders = leaders.filter(l => l.status === 'Active' || l.isActive).length;

    const reportSummaryData = {
        totalMembers,
        activeMembers,
        totalLeaders,
        activeLeaders, 
        unitsCount: units.length,
        totalWorkers: units.reduce((acc, curr) => acc + (Number(curr.workersCount) || 0), 0),
        avgSundayAttendance: activeMembers // or connect to your attendance logs
    };

    const unitBreakdown = units.length > 0 ? units.map(u => ({
        name: u.name,
        workers: u.workersCount || 0,
        activeRate: u.activeRate || '0%'
    })) : [];;

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
        pdf.save(`TCM_${reportType.replace(/\s+/g, '_')}_${selectedMonth.replace(/\s+/g, '_')}.pdf`); 
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="report-generatortor-container">
            {/* Header Bar */}
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

            {/* Control Panel & Document Preview Grid */}
            <div className="report-control-grid">
                {/* Left: Configuration Panel */}
                <div className="glass-card config-panel">
                    <div className="config-section-title">
                        <Sliders size={18} color="#8b5cf6" />
                        <span>Report Parameters</span>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Report Type</label>
                        <select
                            className="glass-input"
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                        >
                            <option value="Weekly Sunday Report" style={{ background: '#0f172a' }}>Weekly Sunday Report</option>
                            <option value="Monthly Summary" style={{ background: '#0f172a' }}>Monthly Executive Summary</option>
                            <option value="Leadership Audit" style={{ background: '#0f172a' }}>Leadership Audit Report</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Timeframe / Month</label>
                        <input
                            type="text"
                            className="glass-input"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)} 
                        />
                    </div>

                    <div className="config-section-title" style={{ marginTop: 10 }}>
                        <CheckSquare size={18} color="#10b981" />
                        <span>Include Modules</span>
                    </div>

                    <div className="checkbox-group" style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '10px 0' }}>
                        <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                            <input 
                                type="checkbox"
                                checked={includeSections.membership}
                                onChange={(e) => setIncludeSections({...includeSections, membership: e.target.checked })}
                            />
                            <span>Membership & Attendance Metrics</span>
                        </label>

                        <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                            <input 
                                type="checkbox"
                                checked={includeSections.leaders}
                                onChange={(e) => setIncludeSections({...includeSections, leaders: e.target.checked })}
                            />
                            <span>Leadership Engagement Audit</span>
                        </label>

                        <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                            <input 
                                type="checkbox"
                                checked={includeSections.workers}
                                onChange={(e) => setIncludeSections({...includeSections, workers: e.target.checked })}
                            />
                            <span>Service Unit & Workers Roster</span>
                        </label>

                        <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                            <input 
                                type="checkbox"
                                checked={includeSections.executiveNote}
                                onChange={(e) => setIncludeSections({...includeSections, executiveNote: e.target.checked })}
                            />
                            <span>Pastors / Leaders Remarks</span>
                        </label>
                    </div>

                    {includeSections.executiveNote && (
                        <div className="form-group" style={{ marginTop: 10 }}>
                            <label className="form-label">Executive Commentary</label>
                            <textarea
                                className="glass-input"
                                rows="4"
                                value={executiveNote}
                                onChange={(e) => setExecutiveNote(e.target.value)}
                                placeholder="Enter pastoral observations..."
                            />
                        </div>
                    )}
                </div>

                {/* Right: Printable Document Preview */}
                <div className="preview-panel" ref={reportRef}>
                    {/* Document Header */}
                    <div className="document-header">
                        <div className="document-branding">
                            <h1>TCM MANAGER</h1>
                            <p>Teens Church Ministry . Executive Summary Report</p>
                        </div>

                        <div className="document-meta">
                            <span style={{ fontWeight: 700, color: '#f8fafc' }}>{reportType}</span>
                            <span>Period: {selectedMonth}</span>
                            <span>Generated: {new Date().toDateString()}</span>
                        </div>
                    </div>

                    {/* Executive Remark Block */}
                    {includeSections.executiveNote && (
                        <div className="report-block">
                            <div className="block-heading">
                                <FileText size={18} /> Pastoral Remark & Highlights
                            </div>
                            <div className="excutive-note-box">
                                "{executiveNote}"
                            </div>
                        </div>
                    )}

                    {/* Membership & Attendance Block */}
                    {includeSections.membership && (
                        <div className="report-block">
                            <div className="block-heading">
                                <Users size={18} />Membership & Attendance Overview
                            </div>

                            <div className="metrics-summary-grid">
                                <div className="metric-box">
                                    <span className="metric-box-title">Total Roster</span>
                                    <span className="metric-box-value" style={{ color: '#3b82f6' }}>{reportSummaryData.totalMembers}</span>
                                </div>

                                <div className="metric-box">
                                    <span className="metric-box-title">Active Members</span>
                                    <span className="metric-box-value" style={{ color: '#10b981' }}>{reportSummaryData.activeMembers}</span>
                                </div>

                                <div className="metric-box">
                                    <span className="metric-box-title">Avg Sunday Attendance</span>
                                    <span className="metric-box-value" style={{ color: '#c084fc' }}>{reportSummaryData.avgSundayAttendance}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Leadership Audit Block */}
                    {includeSections.leaders && (
                        <div className="report-block">
                            <div className="block-heading">
                                <Users size={18} />Leadership Engagement Audit (3 Services/Mo)
                            </div>

                            <div className="metrics-summary-grid">
                                <div className="metric-box">
                                    <span className="metric-box-title">Total Leaders</span>
                                    <span className="metric-box-value" style={{ color: '#3b82f6' }}>{reportSummaryData.totalLeaders}</span>
                                </div>

                                <div className="metric-box">
                                    <span className="metric-box-title">Active Leaders</span>
                                    <span className="metric-box-value" style={{ color: '#10b981' }}>{reportSummaryData.activeLeaders}</span>
                                </div>

                                <div className="metric-box">
                                    <span className="metric-box-title">Active Participation Rate</span>
                                    <span className="metric-box-value" style={{ color: '#c084fc' }}>
                                        {totalLeaders > 0 ? `${((activeLeaders / totalLeaders) * 100).toFixed(1)}%` : '0%'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Service Units & Worker Roster Block */}
                    {includeSections.workers && (
                        <div className="report-block">
                            <div className="block-heading">
                                <Briefcase size={18} /> Service Unit Strength & Roster
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
                                    {unitBreakdown.map((u, idx) => (
                                        <tr key={idx}>
                                            <td style={{ fontWeight: 600 }}>{u.name}</td>
                                            <td>{u.workers} Workers</td>
                                            <td style={{ color: '#10b981', fontWeight: 600 }}>{u.activeRate}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}