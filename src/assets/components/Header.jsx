import React, { useState, useEffect } from 'react';
import { Clock, Calendar } from 'lucide-react';
import '../styles/Header.css'

export default function Header() {
    const [dateTime, setDateTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setDateTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const timeString = dateTime.toLocaleTimeString();
    const dateString = dateTime.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    return(
        <header className='glass-card tcm-header'>
            <div>
                <h1 className='header-title'> TCM MANAGER</h1>
                <span className='header-subtitles'>Teens Church Membership System</span>
            </div>

            <div className="header-clock-container">
                <div className="time-box">
                    <Calendar size={16} color="#8b5cf6" />
                    <span>{dateString}</span>
                </div>
                <div className="time-box">
                    <Clock size={16} color="#3b82f6" />
                    <span className='time-display'>{timeString}</span>
                </div>
            </div>
        </header>
    );
}
