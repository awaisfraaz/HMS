document.addEventListener('DOMContentLoaded', () => {
  // Authentication Guard
  const currentUser = HMS_DB.getCurrentUser();
  if (!currentUser || (currentUser.role !== 'Receptionist' && currentUser.role !== 'Hospital Admin')) {
    window.location.href = 'login-onboarding.html';
    return;
  }

  const hospitalId = currentUser.hospitalId;
  const hospital = HMS_DB.getHospitalById(hospitalId);

  // Set Hospital Title in Header
  document.getElementById('hospital-title').textContent = hospital.name;
  document.getElementById('receptionist-username').textContent = currentUser.name;

  // DOM elements
  const deptSelect = document.getElementById('token-dept');
  const docSelect = document.getElementById('token-doctor');
  const patientNameInput = document.getElementById('patient-name');
  const patientPhoneInput = document.getElementById('patient-phone');
  const patientAgeInput = document.getElementById('patient-age');
  const patientGenderInput = document.getElementById('patient-gender');
  const patientBloodGroupInput = document.getElementById('patient-bloodgroup');
  const tokenForm = document.getElementById('token-form');
  
  const ticketPreview = document.getElementById('ticket-preview');
  const ticketNumberEl = document.getElementById('ticket-num');
  const ticketDoctorEl = document.getElementById('ticket-doc');
  const ticketDeptEl = document.getElementById('ticket-department');
  const ticketPatientEl = document.getElementById('ticket-patient');
  const ticketWaitEl = document.getElementById('ticket-wait');
  const ticketTimeEl = document.getElementById('ticket-time');
  const printTicketBtn = document.getElementById('print-ticket-btn');

  const tokensTableBody = document.getElementById('tokens-table-body');

  let cachedDoctors = [];

  async function loadDoctors() {
    try {
      const response = await hmsFetch(`${HMS_CONFIG.API_BASE_URL}api/v1/doctor/all`);
      if (response.ok) {
        const data = await response.json();
        cachedDoctors = data.doctors || [];
      } else {
        console.error("Failed to fetch doctors from backend");
        cachedDoctors = HMS_DB.getDoctors(hospitalId);
      }
    } catch (err) {
      console.error("Error loading doctors:", err);
      cachedDoctors = HMS_DB.getDoctors(hospitalId);
    }
  }

  // Load Departments and populate select
  async function initForm() {
    deptSelect.innerHTML = '<option value="" disabled selected>Select Department</option>';
    
    await loadDoctors();

    const specialties = [...new Set(cachedDoctors.map(d => d.speciality || d.specialty).filter(Boolean))];
    
    if (specialties.length > 0) {
      specialties.forEach(dept => {
        const opt = document.createElement('option');
        opt.value = dept;
        opt.textContent = dept;
        deptSelect.appendChild(opt);
      });
    } else {
      const freshHospital = hospital || HMS_DB.getHospitalById(hospitalId);
      if (freshHospital && freshHospital.departments) {
        freshHospital.departments.forEach(dept => {
          const opt = document.createElement('option');
          opt.value = dept;
          opt.textContent = dept;
          deptSelect.appendChild(opt);
        });
      }
    }

    // Populate default doctors
    updateDoctorsList();
  }

  // Filter and update doctors select based on chosen department
  function updateDoctorsList() {
    const selectedDept = deptSelect.value;
    const doctors = cachedDoctors;
    
    docSelect.innerHTML = '<option value="" disabled selected>Select Doctor</option>';
    
    const filteredDocs = doctors.filter(d => {
      const matchDept = !selectedDept || (d.speciality || d.specialty) === selectedDept;
      const matchStatus = d.status === 'Available'; // Only show available doctors
      return matchDept && matchStatus;
    });

    filteredDocs.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d._id || d.id;
      opt.textContent = `${d.name} (${d.room || ''})`;
      docSelect.appendChild(opt);
    });

    if (filteredDocs.length === 0 && selectedDept) {
      const opt = document.createElement('option');
      opt.disabled = true;
      opt.textContent = 'No available doctors';
      docSelect.appendChild(opt);
    }
  }

  // Re-render tokens log table
  async function renderTokensTable() {
    let tokens = [];
    try {
      const response = await hmsFetch(`${HMS_CONFIG.API_BASE_URL}api/v1/token/all`);
      if (response.ok) {
        const data = await response.json();
        tokens = data.tokens || [];
      } else {
        console.error("Failed to fetch tokens from backend");
        tokens = HMS_DB.getTokens(hospitalId);
      }
    } catch (err) {
      console.error("Error loading tokens from backend:", err);
      tokens = HMS_DB.getTokens(hospitalId);
    }
    
    // Sort reverse chronological
    const sorted = [...tokens].reverse();

    tokensTableBody.innerHTML = '';
    
    if (sorted.length === 0) {
      tokensTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: var(--spacing-xl); color: var(--color-text-muted);">
            No tokens issued today.
          </td>
        </tr>
      `;
      return;
    }

    sorted.forEach(t => {
      const row = document.createElement('tr');
      
      let badgeClass = 'badge-waiting';
      if (t.status === 'In Progress') badgeClass = 'badge-progress';
      if (t.status === 'Completed') badgeClass = 'badge-completed';
      if (t.status === 'Cancelled') badgeClass = 'badge-cancelled';

      row.innerHTML = `
        <td><strong>#${t.tokenNumber}</strong></td>
        <td>${t.patientName}</td>
        <td>${t.department}</td>
        <td>${t.doctorName}</td>
        <td>${t.issuedTime}</td>
        <td><span class="badge ${badgeClass}">${t.status}</span></td>
      `;

      tokensTableBody.appendChild(row);
    });
  }

  // Handle Token Generation
  tokenForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const department = deptSelect.value;
    const doctorId = docSelect.value;
    const patientName = patientNameInput.value.trim();
    const patientPhone = patientPhoneInput.value.trim();
    const patientAge = patientAgeInput.value.trim();
    const patientGender = patientGenderInput.value;
    const patientBloodgroup = patientBloodGroupInput.value;

    if (!department || !doctorId || !patientName || !patientAge || !patientGender || !patientBloodgroup) {
      alert('Please fill out all mandatory fields.');
      return;
    }

    let token = null;

    try {
      const response = await hmsFetch(`${HMS_CONFIG.API_BASE_URL}api/v1/token/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          doctorId,
          patientName,
          patientPhone,
          age: parseInt(patientAge, 10),
          gender: patientGender,
          bloodgroup: patientBloodgroup
        })
      });
      if (response.ok) {
        const data = await response.json();
        token = data.token;
      } else {
        console.error("Failed to generate token on backend");
        token = HMS_DB.generateToken(hospitalId, department, doctorId, patientName, patientPhone, patientAge, patientGender, patientBloodgroup);
      }
    } catch (err) {
      console.error("Error generating token on backend:", err);
      token = HMS_DB.generateToken(hospitalId, department, doctorId, patientName, patientPhone, patientAge, patientGender, patientBloodgroup);
    }

    if (token) {
      // Display Ticket Preview
      ticketNumberEl.textContent = `#${token.tokenNumber}`;
      ticketDoctorEl.textContent = token.doctorName;
      ticketDeptEl.textContent = token.department;
      ticketPatientEl.textContent = token.patientName;
      ticketWaitEl.textContent = token.waitTime;
      ticketTimeEl.textContent = `${token.issuedTime} | Today`;
      ticketPreview.classList.remove('hidden');

      // Update forms and tables
      tokenForm.reset();
      updateDoctorsList();
      renderTokensTable();
      
      // Auto focus print button for easy keyboard access
      printTicketBtn.focus();
    }
  });

  // Department Select Change Listener
  deptSelect.addEventListener('change', updateDoctorsList);

  // Print button mockup
  printTicketBtn.addEventListener('click', () => {
    alert(`Ticket #${ticketNumberEl.textContent} sent to reception printer.`);
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    HMS_DB.logout();
    window.location.href = 'login-onboarding.html';
  });

  // Keyboard Shortcuts Handler (Keyboard-First workflow)
  window.addEventListener('keydown', (e) => {
    // Focus Department: Alt + D
    if (e.altKey && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault();
      deptSelect.focus();
      showShortcutToast('Alt + D: Focused Department');
    }
    // Focus Patient Name: Alt + P
    if (e.altKey && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      patientNameInput.focus();
      showShortcutToast('Alt + P: Focused Patient Name');
    }
    // Focus Patient Phone: Alt + N
    if (e.altKey && (e.key === 'n' || e.key === 'N')) {
      e.preventDefault();
      patientPhoneInput.focus();
      showShortcutToast('Alt + N: Focused Phone Number');
    }
    // Submit Form: Alt + G
    if (e.altKey && (e.key === 'g' || e.key === 'G')) {
      e.preventDefault();
      tokenForm.requestSubmit();
      showShortcutToast('Alt + G: Generating Token');
    }
  });

  // Visual shortcut notification helper
  function showShortcutToast(text) {
    // Remove existing toast
    const old = document.querySelector('.shortcut-toast');
    if (old) old.remove();

    const toast = document.createElement('div');
    toast.className = 'shortcut-toast';
    toast.innerHTML = `<span>⚡</span> <strong>${text}</strong>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.5s ease-out';
      setTimeout(() => toast.remove(), 500);
    }, 2000);
  }

  async function loadLastToken() {
    try {
      const response = await hmsFetch(`${HMS_CONFIG.API_BASE_URL}api/v1/token/lasttoken`);
      if (response.ok) {
        const data = await response.json();
        const token = data.lasttoken;
        if (token) {
          // Display Ticket Preview
          ticketNumberEl.textContent = `#${token.tokenNumber}`;
          ticketDoctorEl.textContent = token.doctorName;
          ticketDeptEl.textContent = token.department;
          ticketPatientEl.textContent = token.patientName;
          ticketWaitEl.textContent = token.waitTime;
          ticketTimeEl.textContent = `${token.issuedTime} | Today`;
          ticketPreview.classList.remove('hidden');
          
          // Manually hide placeholder to resolve load-order race condition with MutationObserver
          const placeholder = document.getElementById('ticket-placeholder');
          if (placeholder) placeholder.style.display = 'none';
        }
      }
    } catch (err) {
      console.error("Error loading last token from backend:", err);
    }
  }

  // Initial runs
  initForm();
  renderTokensTable();
  loadLastToken();
});
