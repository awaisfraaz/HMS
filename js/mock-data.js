// Shared Mock State Manager using LocalStorage for the multi-tenant HMS

const STORAGE_KEY = 'hms_mock_database';

// Static Medical Diagnostics Catalog
const DIAGNOSTICS_CATALOG = {
  radiography: [
    { id: 'rad-1', name: 'X-Ray Chest / Limb', price: 80 },
    { id: 'rad-2', name: 'CT Scan (Brain / Chest)', price: 250 },
    { id: 'rad-3', name: 'MRI Scan (Spine / Joints)', price: 500 }
  ],
  laboratory: [
    { id: 'lab-1', name: 'Renal Function Test (RFT)', price: 60 },
    { id: 'lab-2', name: 'Liver Function Test (LFT)', price: 70 },
    { id: 'lab-3', name: 'Polymerase Chain Reaction (PCR)', price: 120 }
  ]
};

// Default Seed Data
const DEFAULT_STATE = {
  hospitals: [
    {
      id: 'hosp-1',
      name: 'City General Hospital',
      location: 'New York, NY',
      plan: 'Enterprise',
      status: 'Active',
      joinedDate: '2026-01-15',
      tokensGenerated: 1420,
      billsCreated: 1105,
      activeDoctors: 12,
      activeStaff: 24,
      departments: ['Cardiology', 'Pediatrics', 'General Medicine', 'Orthopedics']
    },
    {
      id: 'hosp-2',
      name: 'Green Valley Clinic',
      location: 'Seattle, WA',
      plan: 'Pro',
      status: 'Active',
      joinedDate: '2026-03-22',
      tokensGenerated: 620,
      billsCreated: 480,
      activeDoctors: 6,
      activeStaff: 10,
      departments: ['Dermatology', 'General Medicine', 'Gynaecology']
    },
    {
      id: 'hosp-3',
      name: 'Metro Heart Institute',
      location: 'Chicago, IL',
      plan: 'Basic',
      status: 'Pending',
      joinedDate: '2026-07-01',
      tokensGenerated: 0,
      billsCreated: 0,
      activeDoctors: 4,
      activeStaff: 5,
      departments: ['Cardiology', 'General Medicine']
    }
  ],
  users: [
    {
      email: 'superadmin@hms.com',
      password: 'admin',
      role: 'Super Admin',
      name: 'Alex Mercer',
      hospitalId: null
    },
    {
      email: 'admin@citygeneral.com',
      password: 'admin',
      role: 'Hospital Admin',
      name: 'Dr. Sarah Connor',
      hospitalId: 'hosp-1'
    },
    {
      email: 'doctor@citygeneral.com',
      password: 'admin',
      role: 'Doctor',
      name: 'Dr. Gregory House',
      hospitalId: 'hosp-1',
      department: 'Cardiology',
      doctorId: 'doc-1'
    },
    {
      email: 'receptionist@citygeneral.com',
      password: 'admin',
      role: 'Receptionist',
      name: 'Clara Oswald',
      hospitalId: 'hosp-1'
    }
  ],
  doctors: [
    {
      id: 'doc-1',
      hospitalId: 'hosp-1',
      name: 'Dr. Gregory House',
      specialty: 'Cardiology',
      status: 'Available',
      schedule: 'Mon - Fri (09:00 AM - 04:00 PM)',
      room: 'Room 302'
    },
    {
      id: 'doc-2',
      hospitalId: 'hosp-1',
      name: 'Dr. Allison Cameron',
      specialty: 'Pediatrics',
      status: 'Available',
      schedule: 'Mon - Wed (10:00 AM - 05:00 PM)',
      room: 'Room 105'
    },
    {
      id: 'doc-3',
      hospitalId: 'hosp-1',
      name: 'Dr. Eric Foreman',
      specialty: 'General Medicine',
      status: 'On Break',
      schedule: 'Mon - Fri (08:00 AM - 03:00 PM)',
      room: 'Room 204'
    },
    {
      id: 'doc-4',
      hospitalId: 'hosp-2',
      name: 'Dr. John Watson',
      specialty: 'General Medicine',
      status: 'Available',
      schedule: 'Mon - Fri (09:00 AM - 05:00 PM)',
      room: 'Room 101'
    }
  ],
  appointments: [
    {
      id: 'app-1',
      hospitalId: 'hosp-1',
      doctorId: 'doc-1',
      doctorName: 'Dr. Gregory House',
      department: 'Cardiology',
      patientName: 'Arthur Dent',
      patientPhone: '+1 (555) 012-3456',
      status: 'Unpaid',
      date: '2026-07-07'
    },
    {
      id: 'app-2',
      hospitalId: 'hosp-1',
      doctorId: 'doc-2',
      doctorName: 'Dr. Allison Cameron',
      department: 'Pediatrics',
      patientName: 'Ford Prefect',
      patientPhone: '+1 (555) 012-3457',
      status: 'Unpaid',
      date: '2026-07-07'
    }
  ],
  tokens: [
    {
      id: 'tok-101',
      hospitalId: 'hosp-1',
      doctorId: 'doc-1',
      doctorName: 'Dr. Gregory House',
      department: 'Cardiology',
      patientName: 'John Doe',
      patientPhone: '+1 (555) 019-2834',
      tokenNumber: 1,
      status: 'Completed',
      issuedTime: '09:05 AM',
      waitTime: '0 mins'
    },
    {
      id: 'tok-102',
      hospitalId: 'hosp-1',
      doctorId: 'doc-1',
      doctorName: 'Dr. Gregory House',
      department: 'Cardiology',
      patientName: 'Jane Smith',
      patientPhone: '+1 (555) 019-2835',
      tokenNumber: 2,
      status: 'In Progress',
      issuedTime: '09:42 AM',
      waitTime: '0 mins'
    },
    {
      id: 'tok-103',
      hospitalId: 'hosp-1',
      doctorId: 'doc-1',
      doctorName: 'Dr. Gregory House',
      department: 'Cardiology',
      patientName: 'Michael Scott',
      patientPhone: '+1 (555) 019-5839',
      tokenNumber: 3,
      status: 'Waiting',
      issuedTime: '10:15 AM',
      waitTime: '15 mins'
    },
    {
      id: 'tok-104',
      hospitalId: 'hosp-1',
      doctorId: 'doc-2',
      doctorName: 'Dr. Allison Cameron',
      department: 'Pediatrics',
      patientName: 'Billy Henderson',
      patientPhone: '+1 (555) 019-2918',
      tokenNumber: 1,
      status: 'Waiting',
      issuedTime: '10:30 AM',
      waitTime: '10 mins'
    }
  ],
  bills: [
    {
      id: 'inv-3021',
      hospitalId: 'hosp-1',
      patientName: 'John Doe',
      date: '2026-07-07',
      time: '09:30 AM',
      items: [
        { desc: 'General Consultation - Dr. Gregory House', amount: 150 },
        { desc: 'Electrocardiogram (ECG)', amount: 200 }
      ],
      total: 350,
      paymentMode: 'Card',
      status: 'Paid'
    },
    {
      id: 'inv-3022',
      hospitalId: 'hosp-1',
      patientName: 'David Miller',
      date: '2026-07-07',
      time: '10:05 AM',
      items: [
        { desc: 'Cardiology Consultation - Dr. Gregory House', amount: 180 },
        { desc: 'Echocardiogram', amount: 350 },
        { desc: 'Prescription Medicines', amount: 45 }
      ],
      total: 575,
      paymentMode: 'Cash',
      status: 'Paid'
    },
    {
      id: 'inv-3023',
      hospitalId: 'hosp-1',
      patientName: 'Jane Smith',
      date: '2026-07-07',
      time: '10:12 AM',
      items: [
        { desc: 'Consultation & Testing', amount: 300 }
      ],
      total: 300,
      paymentMode: 'Pending',
      status: 'Unpaid'
    }
  ],
  currentUser: null
};

// Initialize Database in LocalStorage
function loadDb() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STATE));
    return DEFAULT_STATE;
  }
  return JSON.parse(data);
}

function saveDb(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Exportable Database Actions
const HMS_DB = {
  getState: () => loadDb(),
  getDiagnosticsCatalog: () => DIAGNOSTICS_CATALOG,
  
  // Auth
  login: (email, password) => {
    const db = loadDb();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (user) {
      if (user.hospitalId) {
        const hospital = db.hospitals.find(h => h.id === user.hospitalId);
        if (hospital && hospital.status !== 'Active') {
          return { success: false, message: `Your hospital status is currently ${hospital.status}. Please contact Super Admin.` };
        }
      }
      if (user.status && user.status !== 'Active') {
        return { success: false, message: `Your account registration is currently ${user.status}. Please wait for Super Admin approval.` };
      }
      db.currentUser = user;
      saveDb(db);
      return { success: true, user };
    }
    return { success: false, message: 'Invalid email or password' };
  },
  
  logout: () => {
    const db = loadDb();
    db.currentUser = null;
    saveDb(db);
  },
  
  getCurrentUser: () => {
    const db = loadDb();
    return db.currentUser;
  },

  setCurrentUser: (user) => {
    const db = loadDb();
    if (user && user.hospital_id && !user.hospitalId) {
      user.hospitalId = user.hospital_id;
    }
    if (user && !user.hospitalId) {
      // 1. Check custom email-to-hospital map in localStorage
      const emailMap = JSON.parse(localStorage.getItem('hms_email_hospital_map') || '{}');
      if (user.email && emailMap[user.email.toLowerCase()]) {
        user.hospitalId = emailMap[user.email.toLowerCase()];
      } else {
        // 2. Check default mock users
        const mockUser = db.users.find(u => u.email.toLowerCase() === (user.email || '').toLowerCase());
        if (mockUser) {
          user.hospitalId = mockUser.hospitalId;
        }
      }
    }
    db.currentUser = user;
    saveDb(db);
  },

  syncHospitals: async () => {
    try {
      const apiBase = (window.HMS_CONFIG && window.HMS_CONFIG.API_BASE_URL) || 'http://localhost:3000/';
      const response = await fetch(`${apiBase}api/v1/hospital`);
      if (response.ok) {
        const backendHospitals = await response.json();
        const db = loadDb();
        const emailMap = JSON.parse(localStorage.getItem('hms_email_hospital_map') || '{}');
        
        backendHospitals.forEach(h => {
          const id = h._id || h.id;
          const name = h.name;
          
          // Map default admin email to this hospital ID
          const defaultAdminEmail = `admin@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
          emailMap[defaultAdminEmail] = id;

          const existingIdx = db.hospitals.findIndex(item => item.id === id);
          const mappedHosp = {
            id: id,
            name: name,
            location: h.city || h.location || '',
            address: h.address || '',
            plan: h.subscriptiontier || h.plan || 'Basic',
            status: h.status === 'Approved' ? 'Active' : (h.status === 'Rejected' ? 'Suspended' : (h.status || 'Pending')),
            joinedDate: h.createdAt ? new Date(h.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            tokensGenerated: h.tokensGenerated || 0,
            billsCreated: h.billsCreated || 0,
            activeDoctors: h.activeDoctors || 0,
            activeStaff: h.activeStaff || 0,
            departments: h.departments || ['General Medicine']
          };
          if (existingIdx > -1) {
            db.hospitals[existingIdx] = { ...db.hospitals[existingIdx], ...mappedHosp };
          } else {
            db.hospitals.push(mappedHosp);
          }
        });
        localStorage.setItem('hms_email_hospital_map', JSON.stringify(emailMap));
        saveDb(db);
      }
    } catch (error) {
      console.error("Error syncing backend hospitals to local db:", error);
    }
  },

  // Hospitals
  getHospitals: () => {
    return loadDb().hospitals;
  },

  getHospitalById: (id) => {
    const db = loadDb();
    let hospital = db.hospitals.find(h => h.id === id);
    if (!hospital && id) {
      // Create a fallback mock hospital so the UI doesn't crash or alert
      hospital = {
        id: id,
        name: 'Hospital ' + id.substring(0, 6),
        location: 'Local Region',
        address: 'Unknown St',
        plan: 'Basic',
        status: 'Active',
        joinedDate: new Date().toISOString().split('T')[0],
        tokensGenerated: 0,
        billsCreated: 0,
        activeDoctors: 0,
        activeStaff: 0,
        departments: ['General Medicine']
      };
      db.hospitals.push(hospital);
      saveDb(db);
    }
    return hospital;
  },

  addHospital: (name, location, address, plan) => {
    const db = loadDb();
    const newHospital = {
      id: 'hosp-' + (db.hospitals.length + 1),
      name,
      location,
      address,
      plan,
      status: 'Pending',
      joinedDate: new Date().toISOString().split('T')[0],
      tokensGenerated: 0,
      billsCreated: 0,
      activeDoctors: 0,
      activeStaff: 0,
      departments: ['General Medicine']
    };
    db.hospitals.push(newHospital);
    
    // Add default admin user for this hospital
    const lowerName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    db.users.push({
      email: `admin@${lowerName}.com`,
      password: 'admin',
      role: 'Hospital Admin',
      name: `${name} Admin`,
      hospitalId: newHospital.id
    });

    saveDb(db);
    return newHospital;
  },

  updateHospitalStatus: (id, status) => {
    const db = loadDb();
    const hospital = db.hospitals.find(h => h.id === id);
    if (hospital) {
      hospital.status = status;
      saveDb(db);
      return true;
    }
    return false;
  },

  deleteHospital: (id) => {
    const db = loadDb();
    db.hospitals = db.hospitals.filter(h => h.id !== id);
    saveDb(db);
  },

  // User Management
  getUsers: () => {
    return loadDb().users;
  },

  registerStaff: (name, email, password, role, hospitalId) => {
    const db = loadDb();
    if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, message: 'A user with this email already exists.' };
    }
    const newUser = {
      name,
      email,
      password,
      role,
      hospitalId,
      status: 'Pending'
    };
    db.users.push(newUser);
    saveDb(db);
    return { success: true, user: newUser };
  },

  updateUserStatus: (email, status) => {
    const db = loadDb();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      user.status = status;
      saveDb(db);
      return true;
    }
    return false;
  },

  deleteUser: (email) => {
    const db = loadDb();
    db.users = db.users.filter(u => u.email.toLowerCase() !== email.toLowerCase());
    saveDb(db);
  },

  // Doctors
  getDoctors: (hospitalId) => {
    const db = loadDb();
    return db.doctors.filter(d => d.hospitalId === hospitalId);
  },

  addDoctor: (hospitalId, name, specialty, schedule, room) => {
    const db = loadDb();
    const newDoctor = {
      id: 'doc-' + (db.doctors.length + 1),
      hospitalId,
      name,
      specialty,
      status: 'Available',
      schedule,
      room
    };
    db.doctors.push(newDoctor);

    // Update active doctor count for the hospital
    const hospital = db.hospitals.find(h => h.id === hospitalId);
    if (hospital) hospital.activeDoctors += 1;

    // Create doctor login
    const docSlug = name.toLowerCase().replace('dr. ', '').replace(/[^a-z0-9]/g, '');
    db.users.push({
      email: `${docSlug}@hms.com`,
      password: 'admin',
      role: 'Doctor',
      name,
      hospitalId,
      department: specialty,
      doctorId: newDoctor.id
    });

    saveDb(db);
    return newDoctor;
  },

  updateDoctorStatus: (doctorId, status) => {
    const db = loadDb();
    const doctor = db.doctors.find(d => d.id === doctorId);
    if (doctor) {
      doctor.status = status;
      saveDb(db);
      return true;
    }
    return false;
  },

  // Appointments (Reservations)
  getAppointments: (hospitalId) => {
    const db = loadDb();
    if (!db.appointments) db.appointments = [];
    return db.appointments.filter(a => a.hospitalId === hospitalId);
  },

  bookAppointment: (hospitalId, department, doctorId, patientName, patientPhone) => {
    const db = loadDb();
    if (!db.appointments) db.appointments = [];
    const doctor = db.doctors.find(d => d.id === doctorId);
    if (!doctor) return null;

    const newApp = {
      id: 'app-' + (db.appointments.length + 1),
      hospitalId,
      doctorId,
      doctorName: doctor.name,
      department,
      patientName,
      patientPhone,
      status: 'Unpaid',
      date: new Date().toISOString().split('T')[0]
    };
    db.appointments.push(newApp);
    saveDb(db);
    return newApp;
  },

  payAppointment: (appointmentId, paymentMode) => {
    const db = loadDb();
    const app = db.appointments.find(a => a.id === appointmentId);
    if (!app) return null;

    // 1. Mark paid
    app.status = 'Paid';

    // 2. Generate Invoice Bill for consultation ($150)
    const billItems = [
      { desc: `Consultation Booking - ${app.doctorName}`, amount: 150 }
    ];
    const total = 150;
    const now = new Date();
    
    const newBill = {
      id: 'inv-' + (db.bills.length + 3021),
      hospitalId: app.hospitalId,
      patientName: app.patientName,
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      items: billItems,
      total,
      paymentMode,
      status: 'Paid'
    };
    db.bills.push(newBill);

    // 3. Generate active Token Number
    const doctor = db.doctors.find(d => d.id === app.doctorId);
    const activeDoctorTokens = db.tokens.filter(t => t.doctorId === app.doctorId && (t.status === 'Waiting' || t.status === 'In Progress'));
    const tokenNumber = activeDoctorTokens.length + 1;
    const waitTimeMinutes = tokenNumber * 10 - 10;
    const waitTimeText = waitTimeMinutes > 0 ? `${waitTimeMinutes} mins` : 'Immediate';

    const newToken = {
      id: 'tok-' + (db.tokens.length + 101),
      hospitalId: app.hospitalId,
      doctorId: app.doctorId,
      doctorName: app.doctorName,
      department: app.department,
      patientName: app.patientName,
      patientPhone: app.patientPhone,
      tokenNumber,
      status: 'Waiting',
      issuedTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      waitTime: waitTimeText
    };
    db.tokens.push(newToken);

    // Update hospital stats
    const hospital = db.hospitals.find(h => h.id === app.hospitalId);
    if (hospital) {
      hospital.billsCreated += 1;
      hospital.tokensGenerated += 1;
    }

    saveDb(db);
    return { token: newToken, bill: newBill };
  },

  // Tokens / Queue
  getTokens: (hospitalId) => {
    const db = loadDb();
    return db.tokens.filter(t => t.hospitalId === hospitalId);
  },

  getTokensByDoctor: (doctorId) => {
    const db = loadDb();
    return db.tokens.filter(t => t.doctorId === doctorId);
  },

  generateToken: (hospitalId, department, doctorId, patientName, patientPhone, age, gender, bloodGroup) => {
    const db = loadDb();
    const doctor = db.doctors.find(d => d.id === doctorId);
    if (!doctor) return null;

    const activeDoctorTokens = db.tokens.filter(t => t.doctorId === doctorId && (t.status === 'Waiting' || t.status === 'In Progress'));
    const tokenNumber = activeDoctorTokens.length + 1;
    const waitTimeMinutes = tokenNumber * 10 - 10;
    const waitTimeText = waitTimeMinutes > 0 ? `${waitTimeMinutes} mins` : 'Immediate';

    const now = new Date();
    const issuedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newToken = {
      id: 'tok-' + (db.tokens.length + 101),
      hospitalId,
      doctorId,
      doctorName: doctor.name,
      department,
      patientName,
      patientPhone,
      tokenNumber,
      status: 'Waiting',
      issuedTime,
      waitTime: waitTimeText
    };

    db.tokens.push(newToken);

    const hospital = db.hospitals.find(h => h.id === hospitalId);
    if (hospital) hospital.tokensGenerated += 1;

    // Save/Update patient details in mock database
    if (!db.patients) {
      db.patients = [];
    }
    let patient = db.patients.find(p => p.contact_no === patientPhone && p.hospital_id === hospitalId);
    if (!patient) {
      patient = {
        id: 'pat-' + (db.patients.length + 101),
        name: patientName,
        age: Number(age) || 0,
        gender: gender || 'Not Specified',
        contact_no: patientPhone || 'N/A',
        bloodgroup: bloodGroup || 'Not Specified',
        hospital_id: hospitalId
      };
      db.patients.push(patient);
    } else {
      if (age) patient.age = Number(age);
      if (gender) patient.gender = gender;
      if (bloodGroup) patient.bloodgroup = bloodGroup;
    }

    saveDb(db);
    return newToken;
  },

  updateTokenStatus: (tokenId, status) => {
    const db = loadDb();
    const token = db.tokens.find(t => t.id === tokenId);
    if (token) {
      token.status = status;
      if (status === 'Completed' || status === 'Cancelled') {
        const remaining = db.tokens.filter(t => t.doctorId === token.doctorId && t.status === 'Waiting');
        remaining.forEach((t, i) => {
          const waitTimeVal = (i + 1) * 10 - 10;
          t.waitTime = waitTimeVal > 0 ? `${waitTimeVal} mins` : 'Immediate';
        });
      }
      saveDb(db);
      return true;
    }
    return false;
  },

  // Bills / Invoices
  getBills: (hospitalId) => {
    const db = loadDb();
    return db.bills.filter(b => b.hospitalId === hospitalId);
  },

  createBill: (hospitalId, patientName, items, paymentMode) => {
    const db = loadDb();
    const total = items.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    const now = new Date();
    
    const newBill = {
      id: 'inv-' + (db.bills.length + 3021),
      hospitalId,
      patientName,
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      items,
      total,
      paymentMode,
      status: paymentMode === 'Pending' ? 'Unpaid' : 'Paid'
    };

    db.bills.push(newBill);

    const hospital = db.hospitals.find(h => h.id === hospitalId);
    if (hospital) hospital.billsCreated += 1;

    saveDb(db);
    return newBill;
  },

  updateBillStatus: (billId, status) => {
    const db = loadDb();
    const bill = db.bills.find(b => b.id === billId);
    if (bill) {
      bill.status = status;
      saveDb(db);
      return true;
    }
    return false;
  }
};

// Initialize database right away
HMS_DB.getState();
