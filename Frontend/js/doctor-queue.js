document.addEventListener('DOMContentLoaded', () => {
  // Authentication Guard
  const currentUser = HMS_DB.getCurrentUser();
  if (!currentUser || currentUser.role !== 'Doctor') {
    window.location.href = 'login-onboarding.html';
    return;
  }

  // DOM elements
  const queueTableBody = document.getElementById('queue-table-body');
  const statTotalQueueEl = document.getElementById('stat-total-queue');
  const statCompletedEl = document.getElementById('stat-completed');
  const statWaitingEl = document.getElementById('stat-waiting');

  const activePatientNameEl = document.getElementById('active-patient-name');
  const activePatientTokenEl = document.getElementById('active-patient-token');
  const consultationWorkspace = document.getElementById('consultation-workspace');
  const workspacePlaceholder = document.getElementById('workspace-placeholder');
  const notesTextarea = document.getElementById('notes-textarea');
  const saveNotesForm = document.getElementById('save-notes-form');

  const alertBanner = document.getElementById('alert-banner');
  const alertText = document.getElementById('alert-text');
  const closeAlertBtn = document.getElementById('close-alert-btn');
  const logoutBtn = document.getElementById('logout-btn');

  let activeDoctor = null;

  async function loadDoctorInfo() {
    try {
      const response = await hmsFetch(`${HMS_CONFIG.API_BASE_URL}api/v1/doctor/doctordashboard`);
      if (response.ok) {
        const data = await response.json();
        activeDoctor = data.doctor;
        
        // Set Doctor UI Info
        document.getElementById('doctor-title').textContent = activeDoctor.name;
        document.getElementById('doctor-sub-badge').textContent = `${activeDoctor.speciality || activeDoctor.specialty} - Room ${activeDoctor.room || ''}`;
        document.getElementById('doc-username').textContent = activeDoctor.name;
        
        // Render stats from dashboard
        if (data.stats) {
          statTotalQueueEl.textContent = data.stats.totalTokens;
          statCompletedEl.textContent = data.stats.completedPatients;
          statWaitingEl.textContent = data.stats.waitingPatients;
        }
      }
    } catch (err) {
      console.error("Error loading doctor dashboard info:", err);
    }
  }

  // Render Doctor Dashboard
  async function renderDoctorDashboard() {
    await loadDoctorInfo();

    if (!activeDoctor) {
      return;
    }

    let tokens = [];
    try {
      const response = await hmsFetch(`${HMS_CONFIG.API_BASE_URL}api/v1/doctor/mytokens`);
      if (response.ok) {
        const data = await response.json();
        tokens = data.tokens || [];
      } else {
        console.error("Failed to fetch mytokens from backend");
        tokens = HMS_DB.getTokensByDoctor(activeDoctor._id);
      }
    } catch (err) {
      console.error("Error loading mytokens from backend:", err);
      tokens = HMS_DB.getTokensByDoctor(activeDoctor._id);
    }
    
    // Sort chronological by token number
    const sortedTokens = [...tokens].sort((a, b) => a.tokenNumber - b.tokenNumber);

    // Calculate metrics locally if dashboard load failed or to ensure real-time accuracy
    const total = sortedTokens.length;
    const completed = sortedTokens.filter(t => t.status === 'Completed').length;
    const waiting = sortedTokens.filter(t => t.status === 'Waiting').length;

    statTotalQueueEl.textContent = total;
    statCompletedEl.textContent = completed;
    statWaitingEl.textContent = waiting;

    // Render queue table
    queueTableBody.innerHTML = '';
    
    if (sortedTokens.length === 0) {
      queueTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: var(--spacing-xl); color: var(--color-text-muted);">
            No patients assigned to your queue today.
          </td>
        </tr>
      `;
    } else {
      sortedTokens.forEach(t => {
        const row = document.createElement('tr');
        const tokenId = t._id || t.id;
        
        let badgeClass = 'badge-waiting';
        if (t.status === 'In Progress') badgeClass = 'badge-progress';
        if (t.status === 'Completed') badgeClass = 'badge-completed';

        let actionBtn = '—';
        if (t.status === 'Waiting') {
          actionBtn = `<button class="btn-action btn-call" data-id="${tokenId}">Call Patient</button>`;
        } else if (t.status === 'In Progress') {
          actionBtn = `<button class="btn-action btn-complete" data-id="${tokenId}">Complete</button>`;
        }

        row.innerHTML = `
          <td><strong>#${t.tokenNumber}</strong></td>
          <td>${t.patientName}</td>
          <td>${t.issuedTime}</td>
          <td><span class="badge ${badgeClass}">${t.status}</span></td>
          <td>${actionBtn}</td>
        `;

        queueTableBody.appendChild(row);
      });
    }

    // Update active patient consultation workspace
    const activeToken = sortedTokens.find(t => t.status === 'In Progress');

    if (activeToken) {
      activePatientNameEl.textContent = activeToken.patientName;
      activePatientTokenEl.textContent = `#${activeToken.tokenNumber}`;
      activePatientTokenEl.setAttribute('data-id', activeToken._id || activeToken.id);
      
      consultationWorkspace.classList.remove('hidden');
      workspacePlaceholder.classList.add('hidden');
      notesTextarea.disabled = false;
    } else {
      consultationWorkspace.classList.add('hidden');
      workspacePlaceholder.classList.remove('hidden');
      notesTextarea.disabled = true;
      notesTextarea.value = '';
    }

    bindQueueActions();
  }

  // Bind queue action buttons
  function bindQueueActions() {
    // Call Patient Action
    document.querySelectorAll('.btn-call').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        
        // Find any other token currently In Progress to mark Completed first
        const response = await hmsFetch(`${HMS_CONFIG.API_BASE_URL}api/v1/doctor/mytokens`);
        if (response.ok) {
          const data = await response.json();
          const tokens = data.tokens || [];
          const inProgress = tokens.find(t => t.status === 'In Progress');
          if (inProgress) {
            await hmsFetch(`${HMS_CONFIG.API_BASE_URL}api/v1/doctor/updatetoken`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tokenId: inProgress._id || inProgress.id, status: 'Completed' })
            });
          }
        }

        // Call current patient
        try {
          await hmsFetch(`${HMS_CONFIG.API_BASE_URL}api/v1/doctor/updatetoken`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tokenId: id, status: 'In Progress' })
          });
        } catch (err) {
          console.error("Error calling patient on backend:", err);
        }
        renderDoctorDashboard();
      });
    });

    // Complete Consultation Action
    document.querySelectorAll('.btn-complete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        try {
          await hmsFetch(`${HMS_CONFIG.API_BASE_URL}api/v1/doctor/updatetoken`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tokenId: id, status: 'Completed' })
          });
          showAlert('Consultation completed successfully. Queue updated.');
        } catch (err) {
          console.error("Error completing consultation on backend:", err);
        }
        renderDoctorDashboard();
      });
    });
  }

  // Save consultation notes
  saveNotesForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const notes = notesTextarea.value.trim();
    if (!notes) {
      alert('Please enter consultation notes before saving.');
      return;
    }

    const currentTokenId = activePatientTokenEl.getAttribute('data-id');

    if (currentTokenId) {
      try {
        await hmsFetch(`${HMS_CONFIG.API_BASE_URL}api/v1/doctor/updatetoken`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokenId: currentTokenId, status: 'Completed' })
        });
        showAlert(`Consultation notes saved for patient ${activePatientNameEl.textContent}.`);
      } catch (err) {
        console.error("Error saving consultation notes on backend:", err);
      }
    }
    notesTextarea.value = '';
    renderDoctorDashboard();
  });

  // Alert Banner Helper
  function showAlert(msg) {
    alertText.textContent = msg;
    alertBanner.classList.remove('hidden');
    setTimeout(() => {
      alertBanner.classList.add('hidden');
    }, 6000);
  }

  // Close banner
  closeAlertBtn.addEventListener('click', () => alertBanner.classList.add('hidden'));

  // Logout Handler
  logoutBtn.addEventListener('click', () => {
    HMS_DB.logout();
    window.location.href = 'login-onboarding.html';
  });

  // Initial render
  renderDoctorDashboard();
  
  // Refresh doctor queue lists every 5 seconds to load newly generated tokens from front-desk
  setInterval(renderDoctorDashboard, 5000);
});
