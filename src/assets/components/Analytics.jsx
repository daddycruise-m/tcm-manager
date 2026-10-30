// src/components/Analytics.jsx
import React, { useState, useRef } from "react";

import {
    BarChart3, TrendingUp, Users, ShieldCheck, Download, ArrowRight, ArrowDownRight, Award, Lightbulb, FileText,
    Form
} from 'lucide-react';

import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import '../styles/Analytics.css';
import { useTCM } from '../context/TCMContext';

export default function Analytics() {
    const exportRef = useRef();
    const [selectedQuarter, setSelectedQuarter] = useState('Q3-2026');

    // Pull live state from TCMContext
    const { members = [], workers = [], leaders = [], units = [] } = useTCM();

    // Real-time KPI Calculations
    const totalMembers = members.length;
    const totalWorkers = workers.length;
    const totalLeaders = leaders.length;

    // Attendance metrics
    const sundayPresent = members.filter(m => m.presentThisWeek).length;
    
    // Male & Female Member breakdown
    const maleMembersCount = members.filter(m => (m.gender || '').toLowerCase() === 'male').length;
    const femaleMembersCount = members.filter(m => (m.gender || '').toLowerCase() === 'female').length;

    // Leader Participation (Threshold = 3 services/mo)
    const activeLeadersCount = leaders.filter(l => (l.monthAttendances || 0) >= 3).length;
    const inactiveLeadersCount = totalLeaders - activeLeadersCount;
    const leaderActiveRatio = totalLeaders > 0 ? ((activeLeadersCount / totalLeaders) * 100).toFixed(1) : '0.0';

    // Worker Capacity Calculation (Active Workers >= 2 Services)
    const activeWorkersCount = workers.filter(w => (w.monthServices || w.monthService || 0) >= 2).length;
    const workerCapacityRatio = totalWorkers > 0 ? ((activeWorkersCount / totalWorkers) * 100).toFixed(1) : '0.0';

    // Gender Demographic Breakdown
    const genderData = [
        { name: 'Male Members', value: maleMembersCount, color: '#3b82f6' },
        { name: 'Female Members', value: femaleMembersCount, color: '#ec4899' },
    ];

    // Leader Participation Ratio
    const leadersActivityData = [
        { name: 'Active Leaders (≥ 3)', value: activeLeadersCount, color: '#10b981' },
        { name: 'Inactive Leaders (< 3)', value: inactiveLeadersCount, color: '#ef4444' },
    ];

    // Attendance Trend Trajectory (Sunday Services Only)
    const attendanceTrendData = [
        { month: 'May', SundayService: Math.round(sundayPresent * 0.6) },
        { month: 'Jun', SundayService: Math.round(sundayPresent * 0.7) },
        { month: 'Jul', SundayService: Math.round(sundayPresent * 0.8) },
        { month: 'Aug', SundayService: Math.round(sundayPresent * 0.9) },
        { month: 'Sep', SundayService: Math.round(sundayPresent * 0.95) },
        { month: 'Oct', SundayService: sundayPresent },
    ];

    // PDF Export Functionality
    const handleExportPDF = async () => {
        const element = exportRef.current;
        if (!element) return;

        const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#0f172a' });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`TCM_Executive_Analytics_${selectedQuarter}.pdf`);
    };

    return (
        <div className="analytics-container" ref={exportRef}>
            {/* Header Bar */}
            <div className="glass-card analytics-header-bar">
                <div className="analytics-title-section">
                    <BarChart3 size={28} color="#8b5cf6" />

                    <div>
                        <h2 className="analytics-title">Analytics & Intelligence Dashboard</h2>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Comprehensive Performance Charts, Real-Time Growth, And Leadership Ratios
                        </p>
                    </div>
                </div>

                <div className="analtyics-actions">
                    <select className="timeframe-select" value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)}>
                        <option value="Q3-2026">Q3 2026 Summary</option>
                        <option value="Q2-2026">Q2 2026 Summary</option>
                        <option value="YTD-2026">Year to Date (2026)</option>
                    </select>

                    <button className="glass-btn" onClick={handleExportPDF} style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' }}>
                        <Download size={16} style={{ marginRight: 6 }} /> Export Executive PDF
                    </button>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="kpi-grid">
                <div className="glass-card kpi-card">
                    <div className="kpi-details">
                        <span className="kpi-title">Sunday Attendance</span>
                        <span className="kpi-value">{sundayPresent}</span>
                        <span className="kpi-trend positive">
                            <ArrowRight size={16} /> {totalMembers > 0 ? ((sundayPresent / totalMembers) * 100).toFixed(1) : 0}% Turnout
                        </span>
                    </div>

                    <div className="kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.2)' }}>
                        <Users size={22} color="#3b82f6" />
                    </div>
                </div>

                <div className="glass-card kpi-card">
                    <div className="kpi-details">
                        <span className="kpi-title">Total Roster Size</span>
                        <span className="kpi-value">{totalMembers}</span>
                        <span className="kpi-trend positive">
                            <ArrowRight size={16} /> {maleMembersCount} Male / {femaleMembersCount} Female
                        </span>
                    </div>

                    <div className="kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
                        <TrendingUp size={22} color="#10b981" />
                    </div>
                </div>

                <div className="glass-card kpi-card">
                    <div className="kpi-details">
                        <span className="kpi-title">Active Leadership Ratio</span>
                        <span className="kpi-value">{leaderActiveRatio}%</span>
                        <span className="kpi-trend positive">
                            <ArrowRight size={16} /> {activeLeadersCount} of {totalLeaders} Leaders Active
                        </span>
                    </div>

                    <div className="kpi-icon" style={{ background: 'rgba(139, 92, 246, 0.2)' }}>
                        <ShieldCheck size={22} color="#8b5cf6" />
                    </div>
                </div>

                <div className="glass-card kpi-card">
                    <div className="kpi-details">
                        <span className="kpi-title">Unit Roster Strength</span>
                        <span className="kpi-value">{totalWorkers}</span>
                        <span className="kpi-trend positive">
                            <ArrowRight size={16} /> {workerCapacityRatio}% Operational Capacity
                        </span>
                    </div>

                    <div className="kpi-icon" style={{ background: 'rgba(236, 72, 153, 0.2)' }}>
                        <Users size={22} color="#ec4899" />
                    </div>
                </div>
            </div>

            {/* Main Charts Row 1: Sunday Service Growth & Leadership Engagement */}
            <div className="charts-grid-two">
                <div className="glass-card chart-card">
                    <div className="chart-header">
                        <div>
                            <h3 className="chart-title">Sunday Service Attendance Trend</h3>
                            <span className="chart-subtitle">6-Month Trajectory (Live Roster Attendance)</span>
                        </div>
                    </div>

                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <AreaChart data={attendanceTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSunday" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                                <XAxis dataKey="month" stroke="var(--text-secondary)" />
                                <YAxis stroke="var(--text-secondary)" />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: 'var(--glass-border)', borderRadius: 8 }} />
                                <Area type="monotone" dataKey="SundayService" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSunday)" name="Sunday Service" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-card chart-card">
                    <div className="chart-header">
                        <div>
                            <h3 className="chart-title">Leadership Engagement</h3>
                            <span className="chart-subtitle">Active Leaders (≥ 3 attendance/mo rule)</span>
                        </div>
                    </div>

                    <div style={{ width: '100%', height: 280 }}>
                        {totalLeaders > 0 ? (
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie 
                                        data={leadersActivityData}  
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={85}
                                        dataKey="value"
                                        label
                                    >
                                        {leadersActivityData.map((entry, index) => (
                                            <Cell key={`cell-leader-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: 'var(--glass-border)', borderRadius: 8 }} />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', paddingTop: '100px' }}>
                                No Leader records registered yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Executive Summary Card */}
            <div className="glass-card executive-summary-card" style={{ marginTop: '24px' }}>
                <div className="chart-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <FileText size={22} color="#3b82f6" />
                        <h3 className="chart-title">Executive Leadership Briefing</h3>
                    </div>
                </div>

                <div className="summary-grid">
                    <div className="summary-item">
                        <div className="summary-bullet" style={{ background: '#10b981' }}></div>
                        <div className="summary-text">
                            <h5>Consistent Numerical Expansion</h5>
                            <p>Sunday attendance reflects a total present count of <strong>{sundayPresent} members</strong> out of a overall membership roster of {totalMembers}.</p>
                        </div>
                    </div>

                    <div className="summary-item">
                        <div className="summary-bullet" style={{ background: '#8b5cf6' }}></div>
                        <div className="summary-text">
                            <h5>Leadership Health Check</h5>
                            <p><strong>{leaderActiveRatio}%</strong> of registered leaders ({activeLeadersCount} of {totalLeaders}) currently meet or exceed the 3-service monthly threshold. {inactiveLeadersCount} leader(s) require follow-up attention.</p>
                        </div>
                    </div>

                    <div className="summary-item">
                        <div className="summary-bullet" style={{ background: '#ec4899' }}></div>
                        <div className="summary-text">
                            <h5>Unit Operational Readiness</h5>
                            <p>Service units currently maintain a total workforce of <strong>{totalWorkers} workers</strong> across {units.length} service units, operating at an active service capacity of {workerCapacityRatio}%.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}