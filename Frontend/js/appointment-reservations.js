document.addEventListener('DOMContentLoaded', () => {
  // Authentication Guard
  const currentUser = HMS_DB.getCurrentUser();
  if (!currentUser || (currentUser.role !== 'Receptionist' && currentUser.role !== 'Hospital Admin')) {
    window.location.href = 'login-onboarding.html';
    return;
  }

  const hospitalId = currentUser.hospital_id || currentUser.hospitalId;
  const hospital = HMS_DB.getHospitalById(hospitalId);

  // Set Hospital Title
  document.getElementById('hospital-title').textContent = hospital ? hospital.name : 'Hospital';
  document.getElementById('receptionist-username').textContent = currentUser.name;

  // DOM elements
  const deptSelect = document.getElementById('book-dept');
  const docSelect = document.getElementById('book-doctor');
  const patientNameInput = document.getElementById('patient-name');
  const patientPhoneInput = document.getElementById('patient-phone');
  const bookForm = document.getElementById('book-form');

  const reservationsTableBody = document.getElementById('reservations-table-body');
  const alertBanner = document.getElementById('alert-banner');
  const alertText = document.getElementById('alert-text');
  const closeAlertBtn = document.getElementById('close-alert-btn');

  // Modal elements
  const paymentModal = document.getElementById('payment-modal');
  const modalPatientName = document.getElementById('modal-patient-name');
  const modalDoctorName = document.getElementById('modal-doctor-name');
  const modalPaymentMode = document.getElementById('modal-payment-mode');
  const btnConfirmPayment = document.getElementById('btn-confirm-payment');
  const btnCancelPayment = document.getElementById('btn-cancel-payment');

  // Ticket elements
  const ticketPreview = document.getElementById('ticket-preview');
  const ticketPlaceholder = document.getElementById('ticket-placeholder');
  const ticketNumEl = document.getElementById('ticket-num');
  const ticketDocEl = document.getElementById('ticket-doc');
  const ticketDeptEl = document.getElementById('ticket-department');
  const ticketPatientEl = document.getElementById('ticket-patient');
  const ticketWaitEl = document.getElementById('ticket-wait');
  const ticketTimeEl = document.getElementById('ticket-time');

  let activeAppointmentId = null;

  // Init Department & Doctors selects
  function initForm() {
    deptSelect.innerHTML = '<option value="" disabled selected>Select Department</option>';
    hospital.departments.forEach(dept => {
      const opt = document.createElement('option');
      opt.value = dept;
      opt.textContent = dept;
      deptSelect.appendChild(opt);
    });

    updateDoctorsList();
  }

  function updateDoctorsList() {
    const selectedDept = deptSelect.value;
    const doctors = HMS_DB.getDoctors(hospitalId);
    
    docSelect.innerHTML = '<option value="" disabled selected>Select Doctor</option>';
    
    const filteredDocs = doctors.filter(d => {
      const matchDept = !selectedDept || d.specialty === selectedDept;
      const matchStatus = d.status === 'Available';
      return matchDept && matchStatus;
    });

    filteredDocs.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = `${d.name} (${d.room})`;
      docSelect.appendChild(opt);
    });
  }

  // Render Table
  function renderTable() {
    const appointments = HMS_DB.getAppointments(hospitalId);
    const unpaid = appointments.filter(a => a.status === 'Unpaid');

    reservationsTableBody.innerHTML = '';

    if (unpaid.length === 0) {
      reservationsTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: var(--spacing-xl); color: var(--color-text-muted);">
            No unpaid reservations booked for today.
          </td>
        </tr>
      `;
      return;
    }

    unpaid.forEach(a => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${a.patientName}</strong></td>
        <td>${a.department}</td>
        <td>${a.doctorName}</td>
        <td><span class="badge badge-unpaid">${a.status}</span></td>
        <td>
          <button class="btn-checkout-action" data-id="${a.id}">Pay & Check In</button>
        </td>
      `;
      reservationsTableBody.appendChild(row);
    });

    bindCheckoutButtons();
  }

  // Bind Table actions
  function bindCheckoutButtons() {
    document.querySelectorAll('.btn-checkout-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const appointments = HMS_DB.getAppointments(hospitalId);
        const app = appointments.find(a => a.id === id);

        if (app) {
          activeAppointmentId = id;
          modalPatientName.textContent = app.patientName;
          modalDoctorName.textContent = app.doctorName;
          paymentModal.classList.remove('hidden');
        }
      });
    });
  }

  // Handle Booking form submit
  bookForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const department = deptSelect.value;
    const doctorId = docSelect.value;
    const patientName = patientNameInput.value.trim();
    const patientPhone = patientPhoneInput.value.trim();

    if (!department || !doctorId || !patientName) {
      alert('Please fill out all required fields.');
      return;
    }

    const app = HMS_DB.bookAppointment(hospitalId, department, doctorId, patientName, patientPhone);
    if (app) {
      showAlert(`Successfully booked appointment slot for ${app.patientName} (Unpaid).`);
      bookForm.reset();
      updateDoctorsList();
      renderTable();
    }
  });

  // Modal Actions
  btnCancelPayment.addEventListener('click', () => {
    paymentModal.classList.add('hidden');
    activeAppointmentId = null;
  });

  btnConfirmPayment.addEventListener('click', () => {
    if (!activeAppointmentId) return;

    const paymentMode = modalPaymentMode.value;
    const result = HMS_DB.payAppointment(activeAppointmentId, paymentMode);

    if (result) {
      paymentModal.classList.add('hidden');
      showAlert(`Invoice ${result.bill.id} generated and Token #${result.token.tokenNumber} issued successfully!`);

      // Populate Ticket Card
      ticketNumEl.textContent = `#${result.token.tokenNumber}`;
      ticketDocEl.textContent = result.token.doctorName;
      ticketDeptEl.textContent = result.token.department;
      ticketPatientEl.textContent = result.token.patientName;
      ticketWaitEl.textContent = result.token.waitTime;
      ticketTimeEl.textContent = `${result.token.issuedTime} | Paid (${paymentMode})`;

      ticketPlaceholder.style.display = 'none';
      ticketPreview.classList.remove('hidden');

      activeAppointmentId = null;
      renderTable();
    }
  });

  // Department Change
  deptSelect.addEventListener('change', updateDoctorsList);

  // Alerts
  function showAlert(msg) {
    alertText.textContent = msg;
    alertBanner.classList.remove('hidden');
    setTimeout(() => {
      alertBanner.classList.add('hidden');
    }, 6000);
  }

  closeAlertBtn.addEventListener('click', () => alertBanner.classList.add('hidden'));

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    HMS_DB.logout();
    window.location.href = 'login-onboarding.html';
  });

  // Initial runs
  initForm();
  renderTable();
});
