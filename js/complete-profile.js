document.addEventListener('DOMContentLoaded', async () => {
  const nameInput = document.getElementById('profile-name');
  const emailInput = document.getElementById('profile-email');
  const roleSelect = document.getElementById('profile-role');
  const hospitalSelect = document.getElementById('profile-hospital');
  const profileForm = document.getElementById('complete-profile-form');
  const alertContainer = document.getElementById('alert-container');

  // Parse query parameters from URL (e.g. ?email=user@gmail.com&name=Alex%20Morgan)
  const urlParams = new URLSearchParams(window.location.search);
  const emailParam = urlParams.get('email') || localStorage.getItem('hms_google_pending_email') || '';
  const nameParam = urlParams.get('name') || localStorage.getItem('hms_google_pending_name') || '';

  if (emailParam) emailInput.value = emailParam;
  if (nameParam) nameInput.value = nameParam;

  // Load available hospitals
  async function loadHospitals() {
    hospitalSelect.innerHTML = '<option value="" disabled selected>Loading hospitals...</option>';
    try {
      const response = await fetch(`${HMS_CONFIG.API_BASE_URL}api/v1/hospital/all`);
      if (response.ok) {
        const hospitals = await response.json();
        hospitalSelect.innerHTML = '<option value="" disabled selected>Select your hospital...</option>';
        hospitals.forEach(h => {
          const opt = document.createElement('option');
          opt.value = h._id;
          opt.textContent = `${h.name} (${h.hospitalcode || h.city})`;
          hospitalSelect.appendChild(opt);
        });
        return;
      }
    } catch (error) {
      console.warn('API error fetching hospitals, loading fallback...', error);
    }

    // Fallback using mock data if backend not reachable
    if (typeof HMS_DB !== 'undefined' && HMS_DB.hospitals) {
      hospitalSelect.innerHTML = '<option value="" disabled selected>Select your hospital...</option>';
      HMS_DB.hospitals.forEach(h => {
        const opt = document.createElement('option');
        opt.value = h.id || h._id;
        opt.textContent = `${h.name} (${h.code || h.city})`;
        hospitalSelect.appendChild(opt);
      });
    } else {
      hospitalSelect.innerHTML = '<option value="" disabled selected>Failed to load hospitals</option>';
    }
  }

  await loadHospitals();

  // Form submission handler
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlerts();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const role = roleSelect.value;
    const hospital_id = hospitalSelect.value;

    if (!name || !email || !role || !hospital_id) {
      showAlert('Please fill in all required fields.', 'danger');
      return;
    }

    if (role === 'Doctor') {
      showAlert('Doctor accounts can only be registered directly by a Hospital Admin.', 'danger');
      return;
    }

    try {
      const response = await hmsFetch(`${HMS_CONFIG.API_BASE_URL}api/v1/user/complete-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          email,
          role,
          hospital_id
        })
      });

      const data = await response.json();

      if (response.ok) {
        if (data.accesstoken) localStorage.setItem('hms_access_token', data.accesstoken);
        if (data.refreshtoken) localStorage.setItem('hms_refresh_token', data.refreshtoken);
        if (data.user) HMS_DB.setCurrentUser(data.user);

        showAlert('Profile updated successfully! Redirecting...', 'success');

        setTimeout(() => {
          if (role === 'Super Admin') {
            window.location.href = 'super-admin-dashboard.html';
          } else if (role === 'Hospital Admin') {
            window.location.href = 'hospital-admin-dashboard.html';
          } else if (role === 'Doctor') {
            window.location.href = 'doctor-queue.html';
          } else if (role === 'Receptionist') {
            window.location.href = 'token-generation.html';
          }
        }, 1200);
      } else {
        showAlert(data.message || 'Failed to complete profile.', 'danger');
      }
    } catch (err) {
      console.error('Error submitting complete-profile:', err);
      showAlert('Server error while saving profile. Please try again.', 'danger');
    }
  });

  function showAlert(msg, type) {
    clearAlerts();
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `<span>${msg}</span>`;
    alertContainer.appendChild(alertDiv);
  }

  function clearAlerts() {
    alertContainer.innerHTML = '';
  }
});
