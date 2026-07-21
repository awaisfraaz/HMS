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
  const billingForm = document.getElementById('billing-form');
  const patientNameInput = document.getElementById('patient-name');
  const paymentModeSelect = document.getElementById('payment-mode');
  const itemsContainer = document.getElementById('bill-items-container');
  const addItemBtn = document.getElementById('btn-add-item');
  const checkoutBtn = document.getElementById('checkout-btn');

  const totalAmountEl = document.getElementById('total-amount-display');

  const invoicePreview = document.getElementById('invoice-preview');
  const invNumberEl = document.getElementById('inv-number');
  const invPatientEl = document.getElementById('inv-patient');
  const invDateEl = document.getElementById('inv-date');
  const invItemsTableBody = document.getElementById('invoice-items-body');
  const invTotalEl = document.getElementById('invoice-total');
  const printInvoiceBtn = document.getElementById('print-invoice-btn');

  const billsTableBody = document.getElementById('bills-table-body');

  // Add Item Row to Form
  function createItemRow(descVal = '', amountVal = '') {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <input type="text" placeholder="Consultation, Lab test, Medicine..." class="form-input item-desc" value="${descVal}" required>
      <input type="number" placeholder="0.00" class="form-input item-amount" value="${amountVal}" min="0" step="0.01" required>
      <button type="button" class="btn-remove-item" aria-label="Remove item">&times;</button>
    `;

    // Remove row event listener
    row.querySelector('.btn-remove-item').addEventListener('click', () => {
      row.remove();
      calculateTotals();
    });

    // Inputs event listener to trigger real-time total recalculations
    row.querySelector('.item-amount').addEventListener('input', calculateTotals);

    itemsContainer.appendChild(row);
    calculateTotals();
  }

  // Calculate Running Invoice Total
  function calculateTotals() {
    const amounts = document.querySelectorAll('.item-amount');
    let total = 0;
    amounts.forEach(input => {
      const val = parseFloat(input.value);
      if (!isNaN(val)) total += val;
    });

    totalAmountEl.textContent = `$${total.toFixed(2)}`;
  }

  // Render Invoice History Table
  async function renderHistoryTable() {
    let bills = [];
    try {
      const response = await hmsFetch(`${HMS_CONFIG.API_BASE_URL}api/v1/bill/all`);
      if (response.ok) {
        const data = await response.json();
        bills = data.bills || [];
      } else {
        console.error("Failed to fetch bills from backend");
        bills = HMS_DB.getBills(hospitalId);
      }
    } catch (err) {
      console.error("Error loading bills from backend:", err);
      bills = HMS_DB.getBills(hospitalId);
    }
    
    // Sort reverse chronological
    const sorted = [...bills].reverse();

    billsTableBody.innerHTML = '';
    
    if (sorted.length === 0) {
      billsTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: var(--spacing-xl); color: var(--color-text-muted);">
            No billing records registered today.
          </td>
        </tr>
      `;
      return;
    }

    sorted.forEach(b => {
      const row = document.createElement('tr');
      const billId = b._id || b.id;
      const isPaid = b.paymentMode !== 'Pending';
      const statusLabel = isPaid ? 'Paid' : 'Unpaid';
      const badgeClass = isPaid ? 'badge-paid' : 'badge-unpaid';
      
      let actionCol = '—';
      if (!isPaid) {
        actionCol = `<button class="btn-pay" data-id="${billId}">Mark Paid</button>`;
      }

      const dateStr = b.date ? new Date(b.date).toLocaleDateString() : '';

      row.innerHTML = `
        <td><strong>#${billId.toString().substring(18)}</strong></td>
        <td>${b.patientName}</td>
        <td>${dateStr} ${b.time || ''}</td>
        <td><strong>$${b.total.toFixed(2)}</strong></td>
        <td>${b.paymentMode}</td>
        <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
        <td>${actionCol}</td>
      `;

      billsTableBody.appendChild(row);
    });

    // Bind Unpaid -> Paid toggles
    bindPayActionButtons();
  }

  // Bind history toggles
  function bindPayActionButtons() {
    document.querySelectorAll('.btn-pay').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        try {
          const response = await hmsFetch(`${HMS_CONFIG.API_BASE_URL}api/v1/bill/${id}/pay`, {
            method: 'PUT'
          });
          if (!response.ok) {
            HMS_DB.updateBillStatus(id, 'Paid');
          }
        } catch (err) {
          console.error("Error setting bill payment status on backend:", err);
          HMS_DB.updateBillStatus(id, 'Paid');
        }
        renderHistoryTable();
      });
    });
  }

  // Submit / Checkout billing Invoice
  billingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const selectedOption = patientNameInput.options[patientNameInput.selectedIndex];
    if (!selectedOption || !selectedOption.value) {
      alert('Please select a patient.');
      return;
    }

    const patientId = selectedOption.value;
    const patientName = selectedOption.getAttribute('data-name');
    const paymentMode = paymentModeSelect.value;
    
    const descInputs = document.querySelectorAll('.item-desc');
    const amountInputs = document.querySelectorAll('.item-amount');

    const items = [];
    let total = 0;
    descInputs.forEach((input, index) => {
      const amountVal = parseFloat(amountInputs[index].value);
      items.push({
        desc: input.value.trim(),
        amount: amountVal
      });
      total += amountVal;
    });

    if (items.length === 0) {
      alert('Please add at least one line item.');
      return;
    }

    // Consolidated description of all line items
    const description = items.map(item => `${item.desc}: $${item.amount.toFixed(2)}`).join(', ');

    let bill = null;

    try {
      const response = await hmsFetch(`${HMS_CONFIG.API_BASE_URL}api/v1/bill/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patientId,
          patientName,
          description,
          total,
          paymentMode
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        bill = data.bill;
      } else {
        console.error("Failed to create bill on backend");
        bill = HMS_DB.createBill(hospitalId, patientName, items, paymentMode);
      }
    } catch (err) {
      console.error("Error creating bill on backend:", err);
      bill = HMS_DB.createBill(hospitalId, patientName, items, paymentMode);
    }

    if (bill) {
      // Pop Invoice Card
      invNumberEl.textContent = (bill._id || bill.id).toString().substring(18);
      invPatientEl.textContent = bill.patientName;
      invDateEl.textContent = `${bill.date ? new Date(bill.date).toLocaleDateString() : ''} ${bill.time}`;
      
      invItemsTableBody.innerHTML = '';
      
      // Parse description string back into lines for preview rendering
      const parsedItems = bill.description.split(', ').map(str => {
        const parts = str.split(': $');
        return { desc: parts[0], amount: parseFloat(parts[1]) || 0 };
      });

      parsedItems.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${item.desc}</td>
          <td class="amount-col">$${item.amount.toFixed(2)}</td>
        `;
        invItemsTableBody.appendChild(row);
      });

      invTotalEl.textContent = `$${bill.total.toFixed(2)}`;
      
      invoicePreview.classList.remove('hidden');

      // Reset invoice builder
      patientNameInput.value = '';
      paymentModeSelect.value = 'Card';
      itemsContainer.innerHTML = '';
      createItemRow(); // Standard default empty row
      
      renderHistoryTable();
      
      // Auto focus print button for easy keyboard access
      printInvoiceBtn.focus();
    }
  });

  // Add Item Row Event
  addItemBtn.addEventListener('click', () => createItemRow());

  // Print slip mockup
  printInvoiceBtn.addEventListener('click', () => {
    alert(`Invoice slip sent to cashier print queue.`);
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    HMS_DB.logout();
    window.location.href = 'login-onboarding.html';
  });

  // Keyboard Shortcuts (Receptionist efficiency)
  window.addEventListener('keydown', (e) => {
    // Focus Patient Name: Alt + P
    if (e.altKey && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      patientNameInput.focus();
      showShortcutToast('Alt + P: Focused Patient Name');
    }
    // Add Bill Item Row: Alt + I
    if (e.altKey && (e.key === 'i' || e.key === 'I')) {
      e.preventDefault();
      createItemRow();
      // Focus newest row input
      const inputs = document.querySelectorAll('.item-desc');
      if (inputs.length > 0) inputs[inputs.length - 1].focus();
      showShortcutToast('Alt + I: Appended Invoice Line Item');
    }
    // Submit Checkout: Alt + C
    if (e.altKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      billingForm.requestSubmit();
      showShortcutToast('Alt + C: Checking Out Invoice');
    }
  });

  // Visual shortcut notification helper
  function showShortcutToast(text) {
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

  async function loadPatients() {
    try {
      const response = await hmsFetch(`${HMS_CONFIG.API_BASE_URL}api/v1/bill/allpatients`);
      if (response.ok) {
        const data = await response.json();
        const patients = data.patients || [];
        
        patientNameInput.innerHTML = '<option value="" disabled selected>Select Patient</option>';
        patients.forEach(p => {
          const opt = document.createElement('option');
          opt.value = p._id;
          opt.setAttribute('data-name', p.name);
          opt.textContent = `${p.name} (Age: ${p.age}, Blood: ${p.bloodgroup || ''})`;
          patientNameInput.appendChild(opt);
        });
      }
    } catch (err) {
      console.error("Error loading patients for billing dropdown:", err);
    }
  }

  // Initialize page defaults
  createItemRow(); // Default row
  renderHistoryTable();
  loadPatients();
});
