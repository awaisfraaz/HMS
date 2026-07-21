document.addEventListener('DOMContentLoaded', () => {
  // Determine target hospital. Let's see if anyone is logged in.
  // If not, we will default to the first hospital ('hosp-1') to render the demo boards
  const currentUser = HMS_DB.getCurrentUser();
  const urlParams = new URLSearchParams(window.location.search);
  const hospitalId = urlParams.get('hospitalId') || (currentUser ? (currentUser.hospitalId || currentUser.hospital_id) : 'hosp-1');
  let hospital = null;

  async function loadHospital() {
    const token = localStorage.getItem('hms_access_token');
    if (token) {
      try {
        const response = await hmsFetch(`${HMS_CONFIG.API_BASE_URL}api/v1/hospital`);
        if (response.ok) {
          const hospitals = await response.json();
          hospital = hospitals.find(h => (h._id === hospitalId || h.id === hospitalId));
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
          if (!hospital && hospitals.length > 0) {
            hospital = hospitals.find(h => h.status === 'Approved') || hospitals[0];
          }
        }
      } catch (err) {
        console.error("Error loading hospital details from backend:", err);
      }
    }

    if (!hospital) {
      hospital = HMS_DB.getHospitalById(hospitalId);
    }

    if (hospital) {
      document.getElementById('hospital-title').textContent = hospital.name;
    }
  }

  // DOM elements
  const clockEl = document.getElementById('live-clock');
  const heroTokenEl = document.getElementById('hero-token-num');
  const heroRoomEl = document.getElementById('hero-room-num');
  const heroDocEl = document.getElementById('hero-doc-name');
  const doctorsGridEl = document.getElementById('doctors-grid');

  // Clock Update Function
  function updateClock() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  // Render Queue Board
  async function renderBoard() {
    let doctors = [];
    let tokens = [];

    try {
      const response = await fetch(`${HMS_CONFIG.API_BASE_URL}api/v1/token/public-queue/${hospitalId}`);
      if (response.ok) {
        const data = await response.json();
        doctors = data.doctors || [];
        tokens = data.tokens || [];
      } else {
        doctors = HMS_DB.getDoctors(hospitalId);
        tokens = HMS_DB.getTokens(hospitalId);
      }
    } catch (err) {
      console.error("Error fetching live queue data from backend:", err);
      doctors = HMS_DB.getDoctors(hospitalId);
      tokens = HMS_DB.getTokens(hospitalId);
    }

    // Helper to match doctor IDs (supports ObjectId vs String)
    const matchDoctorId = (dId, docObj) => {
      if (!dId || !docObj) return false;
      const docId = docObj._id || docObj.id;
      return dId.toString() === docId.toString();
    };

    // 1. Determine "Now Serving" Hero (In Progress tokens priority)
    const inProgressTokens = tokens.filter(t => t.status === 'In Progress');
    const waitingTokens = tokens.filter(t => t.status === 'Waiting');

    let heroToken = null;

    if (inProgressTokens.length > 0) {
      heroToken = inProgressTokens[inProgressTokens.length - 1];
    } else if (waitingTokens.length > 0) {
      heroToken = waitingTokens[0];
    }

    // Render Hero Card
    if (heroToken) {
      const doctorObj = doctors.find(d => matchDoctorId(heroToken.doctorId, d));
      heroTokenEl.textContent = `#${heroToken.tokenNumber}`;
      heroRoomEl.textContent = doctorObj ? (doctorObj.room || 'N/A') : 'N/A';
      heroDocEl.textContent = heroToken.doctorName;
    } else {
      heroTokenEl.textContent = '—';
      heroRoomEl.textContent = '—';
      heroDocEl.textContent = 'No Patients in Queue';
    }

    // 2. Render Doctor Cards
    doctorsGridEl.innerHTML = '';

    doctors.forEach(doc => {
      const card = document.createElement('div');
      card.className = 'doctor-queue-card';

      // Find tokens for this specific doctor
      const docTokens = tokens.filter(t => matchDoctorId(t.doctorId, doc));
      const serving = docTokens.find(t => t.status === 'In Progress');
      const nextUp = docTokens.filter(t => t.status === 'Waiting').sort((a, b) => a.tokenNumber - b.tokenNumber);

      const hasActiveTokens = serving || nextUp.length > 0;

      let cardInnerHtml = `
        <div class="card-header-doc">
          <div>
            <div class="doc-name">${doc.name}</div>
            <div class="doc-dept">${doc.speciality || doc.specialty}</div>
          </div>
          <span class="doc-room">${doc.room || ''}</span>
        </div>
      `;

      if (hasActiveTokens) {
        const servingText = serving ? `#${serving.tokenNumber}` : '—';
        const nextText = nextUp.length > 0 ? `#${nextUp[0].tokenNumber}` : '—';
        
        cardInnerHtml += `
          <div class="card-status-group">
            <div class="status-box box-serving">
              <span class="status-label">Serving</span>
              <span class="status-number status-serving-num">${servingText}</span>
            </div>
            <div class="status-box box-next">
              <span class="status-label">Next Up</span>
              <span class="status-number status-next-num">${nextText}</span>
            </div>
          </div>
        `;
      } else {
        cardInnerHtml += `
          <div class="card-status-group">
            <div class="status-box box-empty">
              ${doc.status === 'Available' ? 'Queue Empty' : 'Doctor ' + doc.status}
            </div>
          </div>
        `;
      }

      card.innerHTML = cardInnerHtml;
      doctorsGridEl.appendChild(card);
    });
  }

  // Intervals
  updateClock();
  setInterval(updateClock, 1000);
  
  // Load hospital info first, then start rendering
  loadHospital().then(() => {
    renderBoard();
    setInterval(renderBoard, 4000);
  });
});
