document.addEventListener('DOMContentLoaded', () => {
  // Authentication Guard
  const currentUser = HMS_DB.getCurrentUser();
  if (!currentUser || currentUser.role !== 'Super Admin') {
    window.location.href = 'login-onboarding.html';
    return;
  }

  // Set Username in UI
  document.getElementById('admin-username').textContent = currentUser.name;

  // DOM elements
  const hospitalsTableBody = document.getElementById('hospitals-table-body');
  const totalHospitalsEl = document.getElementById('stat-total-hospitals');
  const activeHospitalsEl = document.getElementById('stat-active-hospitals');
  const pendingHospitalsEl = document.getElementById('stat-pending-hospitals');
  const saasRevenueEl = document.getElementById('stat-saas-revenue');
  
  const filterStatus = document.getElementById('filter-status');
  const filterPlan = document.getElementById('filter-plan');
  
  const usersTableBody = document.getElementById('users-table-body');
  const filterUserStatus = document.getElementById('filter-user-status');
  const filterUserRole = document.getElementById('filter-user-role');
  const notificationBanner = document.getElementById('notification-banner');
  const notificationText = document.getElementById('notification-text');
  const closeBannerBtn = document.getElementById('close-banner-btn');
  const logoutBtn = document.getElementById('logout-btn');

  // Tab switcher binding
  const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
  const sections = document.querySelectorAll('.dashboard-section');
  const mainPageTitle = document.getElementById('main-page-title');

  let cachedHospitals = [];
  let cachedStats = null;

  async function loadHospitalsData() {
    try {
      const response = await fetch(`${HMS_CONFIG.API_BASE_URL}api/v1/hospital`, {
        credentials: 'include'
      });
      if (response.ok) {
        const hospitals = await response.json();
        // Translate backend status to frontend status
        cachedHospitals = hospitals.map(h => ({
          ...h,
          status: h.status === 'Approved' ? 'Active' : (h.status === 'Rejected' ? 'Suspended' : (h.status || 'Pending'))
        }));
      }
    } catch (error) {
      console.error("Error fetching hospitals:", error);
    }

    try {
      const token = localStorage.getItem('hms_access_token');
      const response = await fetch(`${HMS_CONFIG.API_BASE_URL}api/v1/user/dashboardstats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      if (response.ok) {
        cachedStats = await response.json();
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    }
  }

  menuItems.forEach(item => {
    item.addEventListener('click', async (e) => {
      const clickedItem = e.currentTarget;
      const targetSectionId = 'section-' + clickedItem.getAttribute('data-section');

      // Update active nav class
      menuItems.forEach(mi => {
        mi.classList.remove('active');
        mi.removeAttribute('aria-current');
      });
      clickedItem.classList.add('active');
      clickedItem.setAttribute('aria-current', 'page');

      // Show/Hide section divs
      sections.forEach(sec => {
        if (sec.id === targetSectionId) {
          sec.classList.remove('hidden');
        } else {
          sec.classList.add('hidden');
        }
      });

      // Update Header Title
      const sectionName = clickedItem.getAttribute('data-section');
      if (sectionName === 'hospitals') {
        mainPageTitle.textContent = 'Hospital Directory';
        await loadHospitalsData();
        renderDashboard();
      } else if (sectionName === 'users') {
        mainPageTitle.textContent = 'Staff & User Request Management';
        renderUsersDashboard();
      } else if (sectionName === 'plans') {
        mainPageTitle.textContent = 'Subscription Tier Management';
        await loadHospitalsData();
        renderPlansView();
      } else if (sectionName === 'analytics') {
        mainPageTitle.textContent = 'Platform Telemetry & Analytics';
        await loadHospitalsData();
        renderAnalyticsView();
      } else if (sectionName === 'settings') {
        mainPageTitle.textContent = 'SaaS Portal Configuration';
        renderSettingsView();
      }
    });
  });

  // Load and Render Dashboard Data
  function renderDashboard() {
    const hospitals = cachedHospitals;
    
    // 1. Calculate Metrics
    // SaaS monthly recurring revenue estimation based on active hospital tiers
    const mrr = hospitals.reduce((sum, h) => {
      if (h.status !== 'Active') return sum;
      const plan = h.subscriptiontier || h.plan;
      if (plan === 'Basic') return sum + 99;
      if (plan === 'Pro') return sum + 299;
      if (plan === 'Enterprise') return sum + 799;
      return sum;
    }, 0);

    if (cachedStats) {
      // Mapping:
      // Active Tenants -> stats.activeUsers (approved users)
      // Hospitals Onboarded -> hospitalstats.activeHospitals (approved hospitals)
      // Pending Authorizations -> stats.pendingUsers (pending users)
      totalHospitalsEl.textContent = cachedStats.hospitalstats?.activeHospitals || 0;
      activeHospitalsEl.textContent = cachedStats.stats?.activeUsers || 0;
      pendingHospitalsEl.textContent = cachedStats.stats?.pendingUsers || 0;
    } else {
      const total = hospitals.length;
      const active = hospitals.filter(h => h.status === 'Active').length;
      const pending = hospitals.filter(h => h.status === 'Pending').length;

      totalHospitalsEl.textContent = total;
      activeHospitalsEl.textContent = active;
      pendingHospitalsEl.textContent = pending;
    }
    saasRevenueEl.textContent = `$${mrr.toLocaleString()}/mo`;

    // 2. Filter list
    const statusVal = filterStatus.value;
    const planVal = filterPlan.value;

    const filteredHospitals = hospitals.filter(h => {
      const matchStatus = statusVal === 'All' || h.status === statusVal;
      const plan = h.subscriptiontier || h.plan;
      const matchPlan = planVal === 'All' || plan === planVal;
      return matchStatus && matchPlan;
    });

    // 3. Render Table rows
    hospitalsTableBody.innerHTML = '';
    
    if (filteredHospitals.length === 0) {
      hospitalsTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: var(--spacing-xl); color: var(--color-text-muted);">
            No hospitals found matching selected filters.
          </td>
        </tr>
      `;
      return;
    }

    filteredHospitals.forEach(h => {
      const row = document.createElement('tr');
      
      let statusClass = 'badge-pending';
      if (h.status === 'Active') statusClass = 'badge-active';
      if (h.status === 'Suspended') statusClass = 'badge-suspended';

      const hospitalId = h._id || h.id;
      const plan = h.subscriptiontier || h.plan;
      const location = h.city || h.location;
      const joinedDate = h.createdAt ? new Date(h.createdAt).toISOString().split('T')[0] : (h.joinedDate || 'N/A');

      // Action Button configurations
      let actionButtons = '';
      if (h.status === 'Pending') {
        actionButtons += `<button class="btn-action btn-approve" data-id="${hospitalId}">Approve</button>`;
      } else if (h.status === 'Active') {
        actionButtons += `<button class="btn-action btn-suspend" data-id="${hospitalId}">Suspend</button>`;
      } else if (h.status === 'Suspended') {
        actionButtons += `<button class="btn-action btn-approve" data-id="${hospitalId}">Activate</button>`;
      }
      actionButtons += `<button class="btn-action btn-delete" data-id="${hospitalId}">Delete</button>`;

      row.innerHTML = `
        <td><strong>${h.name}</strong></td>
        <td>${location}</td>
        <td>${plan}</td>
        <td><span class="badge ${statusClass}">${h.status}</span></td>
        <td>${joinedDate}</td>
        <td>
          <div class="btn-group">
            ${actionButtons}
          </div>
        </td>
      `;

      hospitalsTableBody.appendChild(row);
    });

    // Bind row action events
    bindActionButtons();
  }

  // Render Plans View active counters
  function renderPlansView() {
    const hospitals = cachedHospitals;
    const active = hospitals.filter(h => h.status === 'Active');

    const basicCount = active.filter(h => (h.subscriptiontier || h.plan) === 'Basic').length;
    const proCount = active.filter(h => (h.subscriptiontier || h.plan) === 'Pro').length;
    const entCount = active.filter(h => (h.subscriptiontier || h.plan) === 'Enterprise').length;

    document.getElementById('plans-count-basic').textContent = basicCount;
    document.getElementById('plans-count-pro').textContent = proCount;
    document.getElementById('plans-count-enterprise').textContent = entCount;
  }

  // Render Platform Analytics details and bar graphs
  async function renderAnalyticsView() {
    const hospitals = cachedHospitals;
    const active = hospitals.filter(h => h.status === 'Active');

    // Calculate revenue per plan
    const basicRev = active.filter(h => (h.subscriptiontier || h.plan) === 'Basic').length * 99;
    const proRev = active.filter(h => (h.subscriptiontier || h.plan) === 'Pro').length * 299;
    const entRev = active.filter(h => (h.subscriptiontier || h.plan) === 'Enterprise').length * 799;
    const totalRev = basicRev + proRev + entRev;

    // Output revenue values
    document.getElementById('chart-val-basic').textContent = `$${basicRev}`;
    document.getElementById('chart-val-pro').textContent = `$${proRev}`;
    document.getElementById('chart-val-enterprise').textContent = `$${entRev}`;

    // Calculate percentages for bar graphs
    const basicPct = totalRev > 0 ? (basicRev / totalRev) * 100 : 0;
    const proPct = totalRev > 0 ? (proRev / totalRev) * 100 : 0;
    const entPct = totalRev > 0 ? (entRev / totalRev) * 100 : 0;

    // Render bar fills
    document.getElementById('chart-bar-basic').style.width = `${basicPct}%`;
    document.getElementById('chart-bar-pro').style.width = `${proPct}%`;
    document.getElementById('chart-bar-enterprise').style.width = `${entPct}%`;

    // Fetch doctors from the database API
    let doctorCount = 0;
    try {
      const token = localStorage.getItem('hms_access_token');
      const response = await fetch(`${HMS_CONFIG.API_BASE_URL}api/v1/user/allusers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        const users = data.users || [];
        doctorCount = users.filter(u => u.role === 'Doctor').length;
      }
    } catch (error) {
      console.error("Error fetching users for analytics:", error);
    }

    document.getElementById('analytics-total-doctors').textContent = doctorCount;
    document.getElementById('analytics-total-appointments').textContent = 0;
    document.getElementById('analytics-total-tokens').textContent = 0;
    document.getElementById('analytics-total-bills').textContent = 0;
  }

  // System Settings View Logic
  function renderSettingsView() {
    const savedConfig = localStorage.getItem('hms_saas_config');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      document.getElementById('settings-site-title').value = config.siteTitle;
      document.getElementById('settings-domain').value = config.domain;
      document.getElementById('settings-default-tier').value = config.defaultTier;
      document.getElementById('settings-support-email').value = config.supportEmail;
      document.getElementById('settings-auto-approve').checked = config.autoApprove;
      document.getElementById('settings-maintenance').checked = config.maintenance;
    }
  }

  // Settings Save Handler
  document.getElementById('settings-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const config = {
      siteTitle: document.getElementById('settings-site-title').value.trim(),
      domain: document.getElementById('settings-domain').value.trim(),
      defaultTier: document.getElementById('settings-default-tier').value,
      supportEmail: document.getElementById('settings-support-email').value.trim(),
      autoApprove: document.getElementById('settings-auto-approve').checked,
      maintenance: document.getElementById('settings-maintenance').checked
    };

    localStorage.setItem('hms_saas_config', JSON.stringify(config));
    showNotification('System platform configuration updated successfully.');
  });

  // Handle Approve / Suspend / Delete Action Buttons click
  function bindActionButtons() {
    // Approve Action
    document.querySelectorAll('.btn-approve').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        const hospital = cachedHospitals.find(h => (h._id === id || h.id === id)) || HMS_DB.getHospitalById(id);
        const hospName = hospital ? hospital.name : 'Unknown';
        
        try {
          const token = localStorage.getItem('hms_access_token');
          const response = await fetch(`${HMS_CONFIG.API_BASE_URL}api/v1/hospital/updatehospitalstatus`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id, status: 'Approved' }), // Map "Active" -> "Approved"
            credentials: 'include'
          });
          
          if (response.ok) {
            showNotification(`Hospital "${hospName}" has been successfully approved & activated.`);
            await loadHospitalsData();
            renderDashboard();
          } else {
            const data = await response.json();
            showNotification(data.message || 'Failed to update hospital status.');
          }
        } catch (error) {
          console.error(error);
          showNotification('Server connection failed.');
        }
      });
    });

    // Suspend Action
    document.querySelectorAll('.btn-suspend').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        const hospital = cachedHospitals.find(h => (h._id === id || h.id === id)) || HMS_DB.getHospitalById(id);
        const hospName = hospital ? hospital.name : 'Unknown';
        
        try {
          const token = localStorage.getItem('hms_access_token');
          const response = await fetch(`${HMS_CONFIG.API_BASE_URL}api/v1/hospital/updatehospitalstatus`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id, status: 'Rejected' }), // Map "Suspended" -> "Rejected"
            credentials: 'include'
          });
          
          if (response.ok) {
            showNotification(`Hospital "${hospName}" has been suspended.`);
            await loadHospitalsData();
            renderDashboard();
          } else {
            const data = await response.json();
            showNotification(data.message || 'Failed to update hospital status.');
          }
        } catch (error) {
          console.error(error);
          showNotification('Server connection failed.');
        }
      });
    });

    // Delete Action
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        const hospital = cachedHospitals.find(h => (h._id === id || h.id === id)) || HMS_DB.getHospitalById(id);
        const hospName = hospital ? hospital.name : 'Unknown';
        if (confirm(`Are you sure you want to permanently delete "${hospName}"?`)) {
          try {
            const token = localStorage.getItem('hms_access_token');
            const response = await fetch(`${HMS_CONFIG.API_BASE_URL}api/v1/hospital/deletehospital`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ id }),
              credentials: 'include'
            });
            if (response.ok) {
              showNotification(`Hospital "${hospName}" has been deleted from the platform.`);
              await loadHospitalsData();
              renderDashboard();
            } else {
              const data = await response.json();
              showNotification(data.message || 'Failed to delete hospital.');
            }
          } catch (error) {
            console.error(error);
            showNotification('Server connection failed.');
          }
        }
      });
    });
  }

  // Load and Render Users/Staff Request Data
  async function renderUsersDashboard() {
    let users = [];
    try {
      const token = localStorage.getItem('hms_access_token');
      const response = await fetch(`${HMS_CONFIG.API_BASE_URL}api/v1/user/allusers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        const rawUsers = data.users || [];
        // Translate backend status to frontend status
        users = rawUsers.map(u => ({
          ...u,
          status: u.status === 'Approved' ? 'Active' : (u.status === 'Rejected' ? 'Suspended' : (u.status || 'Pending'))
        }));
      }
    } catch (error) {
      console.error("Error fetching pending users:", error);
    }
    if (cachedHospitals.length === 0) {
      await loadHospitalsData();
    }
    const hospitals = cachedHospitals;

    const statusVal = filterUserStatus.value;
    const roleVal = filterUserRole.value;

    const filteredUsers = users.filter(u => {
      if (u.role === 'Super Admin') return false;

      const currentStatus = u.status || 'Active';
      const matchStatus = statusVal === 'All' || currentStatus === statusVal;
      const matchRole = roleVal === 'All' || u.role === roleVal;
      return matchStatus && matchRole;
    });

    usersTableBody.innerHTML = '';

    if (filteredUsers.length === 0) {
      usersTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: var(--spacing-xl); color: var(--color-text-muted);">
            No user registration requests found matching selected filters.
          </td>
        </tr>
      `;
      return;
    }

    filteredUsers.forEach(u => {
      const row = document.createElement('tr');
      const targetHospitalId = u.hospital_id || u.hospitalId;
      const hospital = targetHospitalId ? hospitals.find(h => (
        (h.id && h.id === targetHospitalId) || 
        (h._id && h._id === targetHospitalId)
      )) : null;
      console.log(`User: ${u.name}, assigned hospital ID in DB: ${targetHospitalId}, matched hospital: ${hospital ? hospital.name : 'None'}`);
      const hospitalName = hospital ? hospital.name : 'Unknown';
      
      const currentStatus = u.status || 'Active';

      let statusClass = 'badge-pending';
      if (currentStatus === 'Active') statusClass = 'badge-active';
      if (currentStatus === 'Suspended') statusClass = 'badge-suspended';

      let actionButtons = '';
      const userId = u._id || u.id;
      if (currentStatus === 'Pending') {
        actionButtons += `<button class="btn-action btn-approve-user" data-id="${userId}" data-name="${u.name}">Approve</button>`;
        actionButtons += `<button class="btn-action btn-reject-user" data-id="${userId}" data-name="${u.name}">Reject</button>`;
      } else if (currentStatus === 'Active') {
        actionButtons += `<button class="btn-action btn-suspend-user" data-id="${userId}" data-name="${u.name}">Suspend</button>`;
        actionButtons += `<button class="btn-action btn-delete-user" data-id="${userId}" data-name="${u.name}">Delete</button>`;
      } else if (currentStatus === 'Suspended') {
        actionButtons += `<button class="btn-action btn-approve-user" data-id="${userId}" data-name="${u.name}">Activate</button>`;
        actionButtons += `<button class="btn-action btn-delete-user" data-id="${userId}" data-name="${u.name}">Delete</button>`;
      }

      row.innerHTML = `
        <td><strong>${u.name}</strong></td>
        <td>${u.email}</td>
        <td>${u.role}</td>
        <td>${hospitalName}</td>
        <td><span class="badge ${statusClass}">${currentStatus}</span></td>
        <td>
          <div class="btn-group">
            ${actionButtons}
          </div>
        </td>
      `;

      usersTableBody.appendChild(row);
    });

    bindUserActionButtons();
  }

  // Handle User Approve / Reject / Suspend / Delete buttons
  function bindUserActionButtons() {
    // Approve User
    document.querySelectorAll('.btn-approve-user').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        const name = e.target.getAttribute('data-name');
        
        try {
          const token = localStorage.getItem('hms_access_token');
          const response = await fetch(`${HMS_CONFIG.API_BASE_URL}api/v1/user/updateuserstatus`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id, status: 'Approved' }),
            credentials: 'include'
          });
          
          if (response.ok) {
            showNotification(`User "${name}" registration has been approved.`);
            await renderUsersDashboard();
          } else {
            const data = await response.json();
            showNotification(data.message || 'Failed to update user status.');
          }
        } catch (error) {
          console.error(error);
          showNotification('Server connection failed.');
        }
      });
    });

    // Reject User
    document.querySelectorAll('.btn-reject-user').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        const name = e.target.getAttribute('data-name');
        
        if (confirm(`Are you sure you want to reject the request for "${name}"?`)) {
          try {
            const token = localStorage.getItem('hms_access_token');
            const response = await fetch(`${HMS_CONFIG.API_BASE_URL}api/v1/user/updateuserstatus`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ id, status: 'Rejected' }),
              credentials: 'include'
            });
            
            if (response.ok) {
              showNotification(`User registration request for "${name}" rejected.`);
              await renderUsersDashboard();
            } else {
              const data = await response.json();
              showNotification(data.message || 'Failed to reject user.');
            }
          } catch (error) {
            console.error(error);
            showNotification('Server connection failed.');
          }
        }
      });
    });

    // Suspend User
    document.querySelectorAll('.btn-suspend-user').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        const name = e.target.getAttribute('data-name');
        
        try {
          const token = localStorage.getItem('hms_access_token');
          const response = await fetch(`${HMS_CONFIG.API_BASE_URL}api/v1/user/updateuserstatus`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id, status: 'Rejected' }), // Map "Suspended" -> "Rejected"
            credentials: 'include'
          });
          
          if (response.ok) {
            showNotification(`User "${name}" has been suspended.`);
            await renderUsersDashboard();
          } else {
            const data = await response.json();
            showNotification(data.message || 'Failed to suspend user.');
          }
        } catch (error) {
          console.error(error);
          showNotification('Server connection failed.');
        }
      });
    });

    // Delete User
    document.querySelectorAll('.btn-delete-user').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        const name = e.target.getAttribute('data-name');
        if (confirm(`Are you sure you want to permanently delete user "${name}"?`)) {
          try {
            const token = localStorage.getItem('hms_access_token');
            const response = await fetch(`${HMS_CONFIG.API_BASE_URL}api/v1/user/deleteuser`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ id }),
              credentials: 'include'
            });
            if (response.ok) {
              showNotification(`User "${name}" has been deleted.`);
              await renderUsersDashboard();
            } else {
              const data = await response.json();
              showNotification(data.message || 'Failed to delete user.');
            }
          } catch (error) {
            console.error(error);
            showNotification('Server connection failed.');
          }
        }
      });
    });
  }

  // Notification helper
  function showNotification(msg) {
    notificationText.textContent = msg;
    notificationBanner.classList.remove('hidden');
    setTimeout(() => {
      notificationBanner.classList.add('hidden');
    }, 6000);
  }

  // Event Listeners
  filterStatus.addEventListener('change', renderDashboard);
  filterPlan.addEventListener('change', renderDashboard);
  filterUserStatus.addEventListener('change', renderUsersDashboard);
  filterUserRole.addEventListener('change', renderUsersDashboard);
  closeBannerBtn.addEventListener('click', () => notificationBanner.classList.add('hidden'));

  logoutBtn.addEventListener('click', () => {
    HMS_DB.logout();
    window.location.href = 'login-onboarding.html';
  });

  // Initial Load
  loadHospitalsData().then(() => {
    renderDashboard();
  });
});

