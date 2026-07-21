document.addEventListener('DOMContentLoaded', () => {
  // Authentication Guard
  const currentUser = HMS_DB.getCurrentUser();
  if (!currentUser || currentUser.role !== 'Hospital Admin') {
    window.location.href = 'login-onboarding.html';
    return;
  }

  const hospitalId = currentUser.hospitalId;
  let hospital = null;

  async function initializeHospitalAdmin() {
    try {
      const response = await hmsFetch(`${HMS_CONFIG.API_BASE_URL}api/v1/hospital`);
      if (response.ok) {
        const hospitals = await response.json();
        // 1. Try matching by ID
        hospital = hospitals.find(h => (h._id === hospitalId || h.id === hospitalId));
        
        // 2. Try matching by email heuristic (prefix or domain)
        if (!hospital && currentUser && currentUser.email) {
          const emailParts = currentUser.email.toLowerCase().split('@');
          const emailPrefix = emailParts[0].replace(/[^a-z0-9]/g, '');
          const emailDomain = emailParts[1] ? emailParts[1].split('.')[0].replace(/[^a-z0-9]/g, '') : '';
          
          hospital = hospitals.find(h => {
            const sanitizedName = h.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            return (emailPrefix !== 'admin' && emailPrefix !== 'doctor' && emailPrefix !== 'receptionist' && sanitizedName.includes(emailPrefix)) || 
                   (emailDomain !== 'gmail' && emailDomain !== 'yahoo' && emailDomain !== 'outlook' && sanitizedName.includes(emailDomain));
          });
        }

        // 3. Fallback to first approved/active hospital in backend database
        if (!hospital && hospitals.length > 0) {
          hospital = hospitals.find(h => h.status === 'Approved') || hospitals[0];
        }
      }
    } catch (error) {
      console.error("Error fetching hospital profile:", error);
    }
    
    if (!hospital) {
      alert('Hospital profile not found.');
      HMS_DB.logout();
      window.location.href = 'login-onboarding.html';
      return;
    }

    // Set Hospital Names in UI
    document.getElementById('hospital-title').textContent = hospital.name;
    document.getElementById('hospital-sub-badge').textContent = `${hospital.name} (${hospital.city || hospital.location || ''})`;
    document.getElementById('admin-username').textContent = currentUser.name;

    // Render Metrics and Lists
    renderDashboard();
  }

  // DOM elements
  const doctorsTableBody = document.getElementById('doctors-table-body');
  const statDoctorsEl = document.getElementById('stat-doctors');
  const statTokensEl = document.getElementById('stat-tokens');
  const statRevenueEl = document.getElementById('stat-revenue');
  const statPlanEl = document.getElementById('stat-plan');

  const addDoctorForm = document.getElementById('add-doctor-form');
  const alertBanner = document.getElementById('alert-banner');
  const alertText = document.getElementById('alert-text');
  const closeAlertBtn = document.getElementById('close-alert-btn');
  const logoutBtn = document.getElementById('logout-btn');

  // Render Metrics and Lists
  async function renderDashboard() {
    let doctors = [];
    try {
      const response = await hmsFetch(`${HMS_CONFIG.API_BASE_URL}api/v1/doctor/all`);
      if (response.ok) {
        const data = await response.json();
        doctors = data.doctors || [];
      } else {
        console.error("Failed to fetch doctors from backend");
        doctors = HMS_DB.getDoctors(hospitalId);
      }
    } catch (err) {
      console.error("Error fetching doctors:", err);
      doctors = HMS_DB.getDoctors(hospitalId);
    }

    const freshHospital = hospital || HMS_DB.getHospitalById(hospitalId);
    const tokens = HMS_DB.getTokens(hospitalId);
    const bills = HMS_DB.getBills(hospitalId);

    // Fetch Today's Token Count from Backend
    let todayTokenCount = 0;
    try {
      const tokenCountResponse = await hmsFetch(`${HMS_CONFIG.API_BASE_URL}api/v1/token/totaltokengeneratedinday`);
      if (tokenCountResponse.ok) {
        const data = await tokenCountResponse.json();
        todayTokenCount = data.totaltokengeneratedinday;
      } else {
        const tokens = HMS_DB.getTokens(hospitalId);
        todayTokenCount = tokens.length;
      }
    } catch (err) {
      console.error("Error fetching total tokens generated today:", err);
      const tokens = HMS_DB.getTokens(hospitalId);
      todayTokenCount = tokens.length;
    }

    // 1. Render Metrics
    statDoctorsEl.textContent = doctors.length;
    statTokensEl.textContent = todayTokenCount;
    
    // Revenue from paid bills
    const totalRev = bills
      .filter(b => b.status === 'Paid')
      .reduce((sum, b) => sum + b.total, 0);
    statRevenueEl.textContent = `$${totalRev.toLocaleString()}`;
    statPlanEl.textContent = freshHospital ? (freshHospital.subscriptiontier || freshHospital.plan || 'Basic') : 'Basic';

    // 2. Render Doctors List
    doctorsTableBody.innerHTML = '';
    
    if (doctors.length === 0) {
      doctorsTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: var(--spacing-xl); color: var(--color-text-muted);">
            No doctors registered. Add one using the form on the right.
          </td>
        </tr>
      `;
      return;
    }

    doctors.forEach(doc => {
      const row = document.createElement('tr');
      const docId = doc._id || doc.id;
      
      let badgeClass = 'badge-off';
      if (doc.status === 'Available') badgeClass = 'badge-available';
      if (doc.status === 'On Break') badgeClass = 'badge-break';

      const toggleActionLabel = doc.status === 'Available' ? 'Go on Break' : 'Set Available';

      row.innerHTML = `
        <td><strong>${doc.name}</strong></td>
        <td>${doc.speciality || doc.specialty}</td>
        <td>${doc.room || ''}</td>
        <td><span class="badge ${badgeClass}">${doc.status}</span></td>
        <td>
          <button class="btn-toggle-status" data-id="${docId}" data-status="${doc.status}">
            ${toggleActionLabel}
          </button>
        </td>
      `;

      doctorsTableBody.appendChild(row);
    });

    // Bind Doctor status toggle event
    bindToggleEvents();
  }

  // Toggle Doctor availability Available <-> On Break
  function bindToggleEvents() {
    document.querySelectorAll('.btn-toggle-status').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        const currStatus = e.target.getAttribute('data-status');
        const nextStatus = currStatus === 'Available' ? 'On Break' : 'Available';
        
        try {
          const response = await hmsFetch(`${HMS_CONFIG.API_BASE_URL}api/v1/doctor/${id}/status`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: nextStatus })
          });
          if (!response.ok) {
            HMS_DB.updateDoctorStatus(id, nextStatus);
          }
        } catch (err) {
          console.error("Error toggling doctor status on backend:", err);
          HMS_DB.updateDoctorStatus(id, nextStatus);
        }
        renderDashboard();
      });
    });
  }

  // Add Doctor Form Submit handler
  addDoctorForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('doc-name').value.trim();
    const email = document.getElementById('doc-email').value.trim();
    const password = document.getElementById('doc-password').value;
    const specialty = document.getElementById('doc-specialty').value;
    const schedule = document.getElementById('doc-schedule').value.trim();
    const room = document.getElementById('doc-room').value.trim();
    const fee = document.getElementById('doc-fee').value.trim();

    if (!name || !email || !password || !schedule || !room || !fee) {
      alert('Please fill out all fields.');
      return;
    }

    try {
      const response = await hmsFetch(`${HMS_CONFIG.API_BASE_URL}api/v1/user/registerdoctor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          email,
          password,
          speciality: specialty,
          status: 'Available',
          schedule,
          room,
          consultationfee: Number(fee)
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        showAlert(`Successfully registered Doctor ${name} with email ${email}`);
      } else {
        const data = await response.json();
        HMS_DB.addDoctor(hospitalId, name, specialty, schedule, room);
        showAlert(`Backend registration failed (${data.message || 'Server error'}). Registered in local mock database. Default Email: ${email}`);
      }
    } catch (err) {
      console.error("Error registering doctor on backend:", err);
      HMS_DB.addDoctor(hospitalId, name, specialty, schedule, room);
      showAlert(`Network error connecting to backend. Registered in local mock database. Default Email: ${email}`);
    }
    
    addDoctorForm.reset();
    renderDashboard();
  });

  // Alert Banner Helper
  function showAlert(msg) {
    alertText.textContent = msg;
    alertBanner.classList.remove('hidden');
    setTimeout(() => {
      alertBanner.classList.add('hidden');
    }, 8000);
  }

  // Close banner
  closeAlertBtn.addEventListener('click', () => alertBanner.classList.add('hidden'));

  // Logout Handler
  logoutBtn.addEventListener('click', () => {
    HMS_DB.logout();
    window.location.href = 'login-onboarding.html';
  });

  // Initial hospital and dashboard load
  initializeHospitalAdmin();
});
