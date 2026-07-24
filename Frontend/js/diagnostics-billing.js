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
  const patientNameInput = document.getElementById('patient-name');
  const paymentModeSelect = document.getElementById('payment-mode');
  const radiographyGrid = document.getElementById('radiography-grid');
  const laboratoryGrid = document.getElementById('laboratory-grid');
  const billingForm = document.getElementById('billing-form');
  const totalAmountEl = document.getElementById('total-amount-display');

  const receiptPreview = document.getElementById('receipt-preview');
  const receiptPlaceholder = document.getElementById('receipt-placeholder');
  const recNumberEl = document.getElementById('rec-number');
  const recPatientEl = document.getElementById('rec-patient');
  const recDateEl = document.getElementById('rec-date');
  const recItemsTableBody = document.getElementById('receipt-items-body');
  const recTotalEl = document.getElementById('receipt-total');
  const printReceiptBtn = document.getElementById('print-receipt-btn');

  const billsTableBody = document.getElementById('bills-table-body');
  const alertBanner = document.getElementById('alert-banner');
  const alertText = document.getElementById('alert-text');
  const closeAlertBtn = document.getElementById('close-alert-btn');

  const catalog = HMS_DB.getDiagnosticsCatalog();

  // Populate Test Catalogs
  function populateCatalogs() {
    // 1. Radiography Dept
    radiographyGrid.innerHTML = '';
    catalog.radiography.forEach(test => {
      const div = document.createElement('div');
      div.className = 'catalog-item-row';
      div.innerHTML = `
        <div class="checkbox-label-group">
          <input type="checkbox" id="${test.id}" class="test-checkbox" data-name="${test.name}" data-price="${test.price}">
          <label for="${test.id}">${test.name}</label>
        </div>
        <span class="price-text">$${test.price}</span>
      `;
      // Allow clicking row to toggle checkbox
      div.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT') {
          const cb = div.querySelector('input');
          cb.checked = !cb.checked;
          calculateTotals();
        }
      });
      radiographyGrid.appendChild(div);
    });

    // 2. Laboratory Dept
    laboratoryGrid.innerHTML = '';
    catalog.laboratory.forEach(test => {
      const div = document.createElement('div');
      div.className = 'catalog-item-row';
      div.innerHTML = `
        <div class="checkbox-label-group">
          <input type="checkbox" id="${test.id}" class="test-checkbox" data-name="${test.name}" data-price="${test.price}">
          <label for="${test.id}">${test.name}</label>
        </div>
        <span class="price-text">$${test.price}</span>
      `;
      div.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT') {
          const cb = div.querySelector('input');
          cb.checked = !cb.checked;
          calculateTotals();
        }
      });
      laboratoryGrid.appendChild(div);
    });

    // Bind change listeners to all check inputs for live calculations
    document.querySelectorAll('.test-checkbox').forEach(cb => {
      cb.addEventListener('change', calculateTotals);
    });
  }

  // Calculate Checkbox running totals
  function calculateTotals() {
    let total = 0;
    document.querySelectorAll('.test-checkbox:checked').forEach(cb => {
      total += parseFloat(cb.getAttribute('data-price'));
    });
    totalAmountEl.textContent = `$${total.toFixed(2)}`;
  }

  // Submit Invoice Generation
  billingForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const patientName = patientNameInput.value.trim();
    const paymentMode = paymentModeSelect.value;
    const selectedCBs = document.querySelectorAll('.test-checkbox:checked');

    if (selectedCBs.length === 0) {
      alert('Please select at least one radiography or laboratory test.');
      return;
    }

    const items = [];
    selectedCBs.forEach(cb => {
      items.push({
        desc: cb.getAttribute('data-name'),
        amount: parseFloat(cb.getAttribute('data-price'))
      });
    });

    const bill = HMS_DB.createBill(hospitalId, patientName, items, paymentMode);

    if (bill) {
      showAlert(`Invoice ${bill.id} generated successfully!`);

      // Populate Receipt slip
      recNumberEl.textContent = bill.id;
      recPatientEl.textContent = bill.patientName;
      recDateEl.textContent = `${bill.date} ${bill.time}`;
      
      recItemsTableBody.innerHTML = '';
      bill.items.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${item.desc}</td>
          <td class="amount-col">$${item.amount.toFixed(2)}</td>
        `;
        recItemsTableBody.appendChild(row);
      });
      recTotalEl.textContent = `$${bill.total.toFixed(2)}`;

      receiptPlaceholder.style.display = 'none';
      receiptPreview.classList.remove('hidden');

      // Reset form
      billingForm.reset();
      calculateTotals();
      renderHistoryTable();
    }
  });

  // Render History logs
  function renderHistoryTable() {
    const bills = HMS_DB.getBills(hospitalId);
    
    // Sort reverse chronological
    const sorted = [...bills].reverse();

    billsTableBody.innerHTML = '';

    if (sorted.length === 0) {
      billsTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: var(--spacing-xl); color: var(--color-text-muted);">
            No invoices checked out today.
          </td>
        </tr>
      `;
      return;
    }

    sorted.forEach(b => {
      const row = document.createElement('tr');
      let badgeClass = b.status === 'Paid' ? 'badge-paid' : 'badge-unpaid';
      let actionCol = '—';
      if (b.status === 'Unpaid') {
        actionCol = `<button class="btn-pay" data-id="${b.id}">Mark Paid</button>`;
      }

      // Concat item descriptions for listing
      const itemsListText = b.items.map(item => item.desc).join(', ');

      row.innerHTML = `
        <td><strong>${b.id}</strong></td>
        <td>${b.patientName}</td>
        <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${itemsListText}
        </td>
        <td><strong>$${b.total.toFixed(2)}</strong></td>
        <td>${b.paymentMode}</td>
        <td><span class="badge ${badgeClass}">${b.status}</span></td>
        <td>${actionCol}</td>
      `;

      billsTableBody.appendChild(row);
    });

    bindPayButtons();
  }

  function bindPayButtons() {
    document.querySelectorAll('.btn-pay').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        HMS_DB.updateBillStatus(id, 'Paid');
        renderHistoryTable();
      });
    });
  }

  // Print button mockup
  printReceiptBtn.addEventListener('click', () => {
    alert(`Diagnostics receipt slip printed.`);
  });

  // Alert Banner
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
  populateCatalogs();
  renderHistoryTable();
});
