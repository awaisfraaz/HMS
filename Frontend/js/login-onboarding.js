const HMS_API = {
  createHospital: async (name, location, address, plan) => {
    try {
      const response = await fetch(`${HMS_CONFIG.API_BASE_URL}api/v1/hospital/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name,
          address: address,
          city: location,
          subscriptiontier: plan
        })
      });
      const data = await response.json();
      return {
        success: response.ok,
        message: data.message
      };
    } catch (error) {
      console.error('Error creating hospital:', error);
      return { success: false, message: 'Server connection failed.' };
    }
  },

  createStaffUser: async (name, email, password, role, hospital_id) => {
    try {
      const response = await fetch(`${HMS_CONFIG.API_BASE_URL}api/v1/user/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          hospital_id
        })
      });
      const data = await response.json();
      return {
        success: response.ok,
        message: data.message
      };
    } catch (error) {
      console.error('Error registering staff:', error);
      return { success: false, message: 'Server connection failed.' };
    }
  },

  loginUser: async (email, password) => {
    try {
      const response = await fetch(`${HMS_CONFIG.API_BASE_URL}api/v1/user/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      return {
        success: response.ok,
        message: data.message,
        user: data.user,
        accesstoken: data.accesstoken,
        refreshtoken: data.refreshtoken
      };
    } catch (error) {
      console.error('Error logging in:', error);
      return { success: false, message: 'Server connection failed.' };
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // UI Selectors
  const loginTab = document.getElementById('login-tab');
  const registerTab = document.getElementById('register-tab');
  const registerStaffTab = document.getElementById('register-staff-tab');

  const loginPanel = document.getElementById('login-panel');
  const registerPanel = document.getElementById('register-panel');
  const registerStaffPanel = document.getElementById('register-staff-panel');

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const registerStaffForm = document.getElementById('register-staff-form');
  const staffHospitalSelect = document.getElementById('staff-hospital');

  const alertContainer = document.getElementById('alert-container');

  // Tab switching helper
  function resetTabs() {
    loginTab.classList.remove('active');
    registerTab.classList.remove('active');
    registerStaffTab.classList.remove('active');
    loginPanel.classList.add('hidden');
    registerPanel.classList.add('hidden');
    registerStaffPanel.classList.add('hidden');
    clearAlerts();
  }

  loginTab.addEventListener('click', () => {
    resetTabs();
    loginTab.classList.add('active');
    loginPanel.classList.remove('hidden');
  });

  registerTab.addEventListener('click', () => {
    resetTabs();
    registerTab.classList.add('active');
    registerPanel.classList.remove('hidden');
  });

  registerStaffTab.addEventListener('click', () => {
    resetTabs();
    registerStaffTab.classList.add('active');
    registerStaffPanel.classList.remove('hidden');
    loadHospitalsDropdown();
  });

  async function loadHospitalsDropdown() {
    staffHospitalSelect.innerHTML = '<option value="" disabled selected>Loading hospitals...</option>';
    try {
      const response = await fetch(`${HMS_CONFIG.API_BASE_URL}api/v1/hospital/all`);
      if (response.ok) {
        const hospitals = await response.json();
        staffHospitalSelect.innerHTML = '<option value="" disabled selected>Select your hospital...</option>';
        hospitals.forEach(h => {
          const opt = document.createElement('option');
          opt.value = h._id;
          opt.textContent = `${h.name} (${h.hospitalcode})`;
          staffHospitalSelect.appendChild(opt);
        });
        return;
      }
    } catch (error) {
      console.error('Error fetching hospitals from API', error);
    }

    staffHospitalSelect.innerHTML = '<option value="" disabled selected>Failed to load active hospitals.</option>';
  }

  // Login handler
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlerts();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      showAlert('Please fill in all fields.', 'danger');
      return;
    }

    let result = await HMS_API.loginUser(email, password);

    if (result.success) {
      // Sync hospitals from backend to localStorage first
      await HMS_DB.syncHospitals();
      // Keep local mock storage state synchronized
      HMS_DB.setCurrentUser(result.user);
      if (result.accesstoken) localStorage.setItem('hms_access_token', result.accesstoken);
      if (result.refreshtoken) localStorage.setItem('hms_refresh_token', result.refreshtoken);
      showAlert(`Welcome back, ${result.user.name}! Redirecting...`, 'success');

      // Redirect based on role
      setTimeout(() => {
        if (result.user.role === 'Super Admin') {
          window.location.href = 'super-admin-dashboard.html';
        } else if (result.user.role === 'Hospital Admin') {
          window.location.href = 'hospital-admin-dashboard.html';
        } else if (result.user.role === 'Doctor') {
          window.location.href = 'doctor-queue.html';
        } else if (result.user.role === 'Receptionist') {
          window.location.href = 'token-generation.html';
        }
      }, 1000);
    } else {
      showAlert(result.message, 'danger');
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlerts();

    const name = document.getElementById('hosp-name').value.trim();
    const address = document.getElementById('hosp-address').value.trim();
    const location = document.getElementById('hosp-location').value.trim();
    const plan = document.getElementById('hosp-plan').value;

    if (!name || !address || !location) {
      showAlert('Please enter hospital name, address, and location.', 'danger');
      return;
    }

    // Endpoint is resolved dynamically using HMS_CONFIG.API_BASE_URL
    const result = await HMS_API.createHospital(name, location, address, plan);
    console.log(result);

    if (result.success) {
      // Also register in the local mock database to keep the frontend demo functionality operational

      showAlert(`Successfully registered! Hospital is pending Super Admin approval. Default Admin user created: admin@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`, 'success');
      registerForm.reset();
    } else {
      showAlert(result.message || 'Registration failed.', 'danger');
    }
  });

  // Register Staff handler
  registerStaffForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlerts();

    const name = document.getElementById('staff-name').value.trim();
    const email = document.getElementById('staff-email').value.trim();
    const password = document.getElementById('staff-password').value;
    const role = document.getElementById('staff-role').value;
    const hospital_id = document.getElementById('staff-hospital').value;
 
    if (!name || !email || !password || !role || !hospital_id) {
      showAlert('Please fill in all fields.', 'danger');
      return;
    }
 
    let result = await HMS_API.createStaffUser(name, email, password, role, hospital_id);

    // if (!result.success && result.message === 'Server connection failed.') {
    //   // Fallback to local mock storage
    //   const mockResult = HMS_DB.registerStaff(name, email, password, role, hospitalId);
    //   result = mockResult;
    // }

    if (result.success) {
      const emailMap = JSON.parse(localStorage.getItem('hms_email_hospital_map') || '{}');
      emailMap[email.toLowerCase()] = hospital_id;
      localStorage.setItem('hms_email_hospital_map', JSON.stringify(emailMap));

      showAlert(`Staff registration request submitted successfully! Pending Super Admin approval.`, 'success');
      registerStaffForm.reset();
    } else {
      showAlert(result.message || 'Registration failed.', 'danger');
    }
  });

  // Alerts Utility
  function showAlert(msg, type) {
    clearAlerts();
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
      <span>${msg}</span>
    `;
    alertContainer.appendChild(alertDiv);
  }

  function clearAlerts() {
    alertContainer.innerHTML = '';
  }

  // Pre-fill demo credentials when clicked
  window.fillCredential = function (email, password) {
    loginTab.click();
    document.getElementById('login-email').value = email;
    document.getElementById('login-password').value = password;
  };
});
