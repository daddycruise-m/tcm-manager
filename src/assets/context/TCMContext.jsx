// src/context/TCMContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../../firebase.js';
import { 
  ref, 
  onValue, 
  push, 
  update, 
  remove 
} from 'firebase/database';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';

const TCMContext = createContext();

export const TCMProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [portalRole, setPortalRole] = useState(null); // Dedicated state for Workers/Leaders portal access
  const [loading, setLoading] = useState(true);

  // Realtime Database State
  const [members, setMembers] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [units, setUnits] = useState([]);
  const [workers, setWorkers] = useState([]);

  // Helper: Get active month key in YYYY-MM format (e.g. "2026-10")
  const getCurrentMonthKey = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const currentMonthKey = getCurrentMonthKey();

  // ----------------------------------------------------
  // 1. AUTH LISTENER
  // ----------------------------------------------------
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  const loginUser = async (email, password) => {
    return await signInWithEmailAndPassword(auth, email, password);
  };

  const logoutUser = async () => {
    return await signOut(auth);
  };

  const login = (userData) => {
    setCurrentUser(userData);
  };

  // ----------------------------------------------------
  // 2. REAL-TIME DATABASE LISTENERS & MONTHLY MAPPING
  // ----------------------------------------------------
  useEffect(() => {
    const now = new Date();
    const activeMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const mapSnapshotToArray = (snapshot, isServiceRecord = false) => {
      const data = snapshot.val();
      if (!data) return [];
      
      return Object.keys(data).map((key) => {
        const item = data[key];
        const history = item.attendanceHistory || {};
        
        const activeMonthCount = history[activeMonthKey] !== undefined 
          ? history[activeMonthKey] 
          : (item.monthServices || item.monthAttendances || 0);

        return {
          id: key,
          ...item,
          monthServices: isServiceRecord ? activeMonthCount : item.monthServices,
          monthAttendances: !isServiceRecord ? activeMonthCount : item.monthAttendances
        };
      });
    };

    const membersRef = ref(db, 'members');
    const unsubscribeMembers = onValue(membersRef, (snapshot) => {
      setMembers(mapSnapshotToArray(snapshot, false));
    });

    const leadersRef = ref(db, 'leaders');
    const unsubscribeLeaders = onValue(leadersRef, (snapshot) => {
      setLeaders(mapSnapshotToArray(snapshot, false));
    });

    const unitsRef = ref(db, 'units');
    const unsubscribeUnits = onValue(unitsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) setUnits([]);
      else setUnits(Object.keys(data).map(k => ({ id: k, ...data[k] })));
    });

    const workersRef = ref(db, 'workers');
    const unsubscribeWorkers = onValue(workersRef, (snapshot) => {
      setWorkers(mapSnapshotToArray(snapshot, true));
    });

    return () => {
      unsubscribeMembers();
      unsubscribeLeaders();
      unsubscribeUnits();
      unsubscribeWorkers();
    };
  }, []);

  // ----------------------------------------------------
  // 3. DATABASE CRUD & HELPERS
  // ----------------------------------------------------
  const addMember = async (memberData) => {
    await push(ref(db, 'members'), {
      ...memberData,
      attendanceHistory: { [currentMonthKey]: 0 }
    });
  };

  const updateMember = async (id, updatedData) => {
    await update(ref(db, `members/${id}`), updatedData);
  };

  const updateMemberAttendance = async (id, newAttendanceState, monthCount) => {
    const memberRef = ref(db, `members/${id}`);
    await update(memberRef, {
      presentThisWeek: newAttendanceState,
      monthAttendances: monthCount,
      [`attendanceHistory/${currentMonthKey}`]: monthCount
    });
  };

  const deleteMember = async (id) => {
    await remove(ref(db, `members/${id}`));
  };

  const addLeader = async (leaderData) => {
    await push(ref(db, 'leaders'), {
      ...leaderData,
      attendanceHistory: { [currentMonthKey]: 0 }
    });
  };

  const updateLeader = async (id, updatedData) => {
    await update(ref(db, `leaders/${id}`), updatedData);
  };

  const updateLeaderAttendance = async (id, newAttendanceState, monthCount) => {
    const leaderRef = ref(db, `leaders/${id}`);
    await update(leaderRef, {
      presentThisWeek: newAttendanceState,
      monthAttendances: monthCount,
      [`attendanceHistory/${currentMonthKey}`]: monthCount
    });
  };

  const deleteLeader = async (id) => {
    await remove(ref(db, `leaders/${id}`));
  };

  const addUnit = async (unitData) => {
    await push(ref(db, 'units'), unitData);
  };

  const deleteUnit = async (id) => {
    await remove(ref(db, `units/${id}`));
  };

  const addWorker = async (workerData) => {
    await push(ref(db, 'workers'), {
      ...workerData,
      attendanceHistory: { [currentMonthKey]: 0 }
    });
  };

  const updateWorker = async (id, updatedData) => {
    await update(ref(db, `workers/${id}`), updatedData);
  };

  const updateWorkerServed = async (id, servedState, monthCount) => {
    const workerRef = ref(db, `workers/${id}`);
    await update(workerRef, {
      served: servedState,
      monthServices: monthCount,
      [`attendanceHistory/${currentMonthKey}`]: monthCount
    });
  };

  const deleteWorker = async (id) => {
    await remove(ref(db, `workers/${id}`));
  };

  const resetMonthlyCounts = async () => {
    const updates = {};
    workers.forEach(w => {
      updates[`workers/${w.id}/served`] = false;
      updates[`workers/${w.id}/monthServices`] = 0;
      updates[`workers/${w.id}/attendanceHistory/${currentMonthKey}`] = 0;
    });
    leaders.forEach(l => {
      updates[`leaders/${l.id}/presentThisWeek`] = false;
      updates[`leaders/${l.id}/monthAttendances`] = 0;
      updates[`leaders/${l.id}/attendanceHistory/${currentMonthKey}`] = 0;
    });
    if (Object.keys(updates).length > 0) {
      await update(ref(db), updates);
    }
  };

  return (
    <TCMContext.Provider value={{
      currentUser,
      portalRole,
      setPortalRole,
      loading,
      loginUser,
      logoutUser,
      login,
      currentMonthKey,
      members,
      addMember,
      updateMember,
      updateMemberAttendance,
      deleteMember,
      leaders,
      addLeader,
      updateLeader,
      updateLeaderAttendance,
      deleteLeader,
      units,
      addUnit,
      deleteUnit,
      workers,
      addWorker,
      updateWorker,
      updateWorkerServed,
      deleteWorker,
      resetMonthlyCounts
    }}>
      {!loading && children}
    </TCMContext.Provider>
  );
};

export const useTCM = () => useContext(TCMContext);