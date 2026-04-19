const SUPABASE_URL = 'https://ghfloompdoasrtpnjomo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoZmxvb21wZG9hc3J0cG5qb21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MzM2NzUsImV4cCI6MjA5MjEwOTY3NX0.i4G0bPcUPfYCBvTjCQBxPEJvh2HNbR1JCgxgYmXm6yc';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const loginView = document.getElementById('login-view');
const signupView = document.getElementById('signup-view');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const logoutBtn = document.getElementById('logout-btn');
const userDisplay = document.getElementById('user-display');
let currentUserRole = null;
let editingId = null;

// View Toggling
document.getElementById('go-to-signup').addEventListener('click', () => {
    loginView.classList.add('hidden');
    signupView.classList.remove('hidden');
});

document.getElementById('go-to-login').addEventListener('click', () => {
    signupView.classList.add('hidden');
    loginView.classList.remove('hidden');
});

// Mobile Sidebar Toggle
document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('active');
});

// Global Search Functionality
let searchTimeout;
document.getElementById('dashboard-search')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const items = document.querySelectorAll('.doc-card, #admin-doc-table tbody tr');
        let visibleCount = 0;

        items.forEach(item => {
            const text = item.innerText.toLowerCase();
            const matches = text.includes(term);
            item.style.display = matches ? '' : 'none';
            if (matches) visibleCount++;
        });

        const noResults = document.getElementById('no-results');
        if (noResults) {
            noResults.classList.toggle('hidden', visibleCount > 0 || items.length === 0);
        }
    }, 300);
});

document.getElementById('clear-search')?.addEventListener('click', () => {
    const searchInput = document.getElementById('dashboard-search');
    const clearBtn = document.getElementById('clear-search');
    
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
        
        const items = document.querySelectorAll('.doc-card, #admin-doc-table tbody tr');
        items.forEach(item => item.style.display = '');
        
        document.getElementById('no-results')?.classList.add('hidden');
        clearBtn?.classList.add('hidden');
    }
});

// Sort Functionality
document.getElementById('sort-date')?.addEventListener('change', async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) showApp(session.user);
});

// Filter Functionality
document.getElementById('filter-status')?.addEventListener('change', async () => {
    const searchInput = document.getElementById('dashboard-search');
    if (searchInput) searchInput.value = '';
    document.getElementById('clear-search')?.classList.add('hidden');

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) showApp(session.user);
});

// Reset All Filters
document.getElementById('reset-filters')?.addEventListener('click', async () => {
    const searchInput = document.getElementById('dashboard-search');
    const sortSelect = document.getElementById('sort-date');
    const filterSelect = document.getElementById('filter-status');
    const clearSearchBtn = document.getElementById('clear-search');
    const noResults = document.getElementById('no-results');

    if (searchInput) searchInput.value = '';
    if (sortSelect) sortSelect.value = 'desc';
    if (filterSelect) filterSelect.value = 'all';
    if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
    if (noResults) noResults.classList.add('hidden');

    // Refresh data with default settings
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) showApp(session.user);
});

// Reason Code Mapping
const REASON_DESC_MAP = {
    "13": "Cycle Count",
    "3": "Wrong received",
    "93": "B1T1 / Manual Picked",
    "83": "LBR to customer",
    "90": "Missing Items (Overages if Writeback)",
    "10": "Damaged",
    "9": "Expired",
    "70": "Marketing Expense (Return Refund)",
    "91": "SKU conversion"
};

// Modal Logic
const modalOverlay = document.getElementById('modal-overlay');
const addDocForm = document.getElementById('add-doc-form');
const docTitleInput = document.getElementById('doc-title-input');
const charCounter = document.getElementById('char-counter');
const categorySelect = document.getElementById('doc-category-select');
const reasonDescInput = document.getElementById('doc-reason-desc');
const reasonCodeSelect = document.getElementById('doc-reason-code');
const controlNoInput = document.getElementById('doc-control-no');
const adjTypeSelect = document.getElementById('doc-adj-type');
const amountRangeSelect = document.getElementById('doc-amount-range');
const chargeToSelect = document.getElementById('doc-charge-to');
const ownerSelect = document.getElementById('doc-owner-name');
const dateInput = document.getElementById('doc-date');

categorySelect?.addEventListener('change', (e) => {
    const isIAAF = e.target.value === 'IAAF';
    document.querySelectorAll('.iaaf-only').forEach(el => el.classList.toggle('hidden', !isIAAF));
    // Toggle required attributes for IAAF fields
    controlNoInput.required = isIAAF;
    reasonCodeSelect.required = isIAAF;
    if (adjTypeSelect) adjTypeSelect.required = isIAAF;
    if (amountRangeSelect) amountRangeSelect.required = isIAAF;
    if (chargeToSelect) chargeToSelect.required = isIAAF;
    
    checkDisclosure();
});

reasonCodeSelect?.addEventListener('change', (e) => {
    reasonDescInput.value = REASON_DESC_MAP[e.target.value] || '';
});

// Progressive Disclosure Logic
function checkDisclosure() {
    const category = categorySelect.value;
    const owner = ownerSelect.value;
    const date = dateInput.value;
    const control = controlNoInput.value;

    // Reveal Date if Category and Owner are selected
    if (category && owner) {
        document.getElementById('step-date').classList.add('visible');
        if (category === 'IAAF') document.getElementById('step-control').classList.add('visible');
    }

    // Reveal Subject if Date is picked (and control if IAAF)
    if (date && (category !== 'IAAF' || control.length === 4)) {
        document.getElementById('step-subject').classList.add('visible');
    }

    // Reveal IAAF details if category is IAAF and subject has content
    if (category === 'IAAF' && docTitleInput.value.length > 5) {
        document.getElementById('step-iaaf').classList.add('visible');
    }
}

ownerSelect?.addEventListener('change', checkDisclosure);
dateInput?.addEventListener('change', checkDisclosure);
docTitleInput?.addEventListener('input', checkDisclosure);
controlNoInput?.addEventListener('input', checkDisclosure);

// Helper to calculate Period and ISO Week
const updateTrackingFields = (dateVal) => {
    const periodInput = document.getElementById('doc-period');
    const weekInput = document.getElementById('doc-week');
    
    if (!dateVal || !periodInput || !weekInput) return;

    const date = new Date(dateVal);
    // Calculate Period (P1 - P12 based on month)
    periodInput.value = `P${date.getMonth() + 1}`;

    // Calculate ISO Week Number
    const tdt = new Date(date.valueOf());
    const dayn = (date.getDay() + 6) % 7;
    tdt.setDate(tdt.getDate() - dayn + 3);
    const firstThursday = tdt.valueOf();
    tdt.setMonth(0, 1);
    if (tdt.getDay() !== 4) {
        tdt.setMonth(0, 1 + ((4 - tdt.getDay()) + 7) % 7);
    }
    const week = 1 + Math.ceil((firstThursday - tdt) / 604800000);
    weekInput.value = week;
};

document.getElementById('doc-date')?.addEventListener('change', (e) => {
    updateTrackingFields(e.target.value);
});

document.getElementById('upload-trigger')?.addEventListener('click', () => {
    modalOverlay.classList.remove('hidden');
    docTitleInput.focus();
    
    // Set default date to today and trigger auto-calc
    const today = new Date().toISOString().split('T')[0];
    if (dateInput) {
        dateInput.value = today;
        updateTrackingFields(today);
    }
    checkDisclosure();
});

document.getElementById('close-modal')?.addEventListener('click', () => {
    modalOverlay.classList.add('hidden');
    addDocForm.reset();
    if (charCounter) charCounter.innerText = '0 / 200';
    document.querySelectorAll('.iaaf-only').forEach(el => el.classList.add('hidden'));
    // Reset disclosure
    editingId = null;
    document.querySelector('.modal-card h2').innerText = "Add Document";
    document.querySelector('#add-doc-form button[type="submit"]').innerText = "Create Document";
    document.querySelectorAll('.reveal-step').forEach(el => {
        el.classList.remove('visible');
        el.classList.add('hidden'); // Ensure they are hidden again
    });
    document.querySelectorAll('.reveal-step').forEach(el => el.classList.remove('visible'));
});

docTitleInput?.addEventListener('input', (e) => {
    const length = e.target.value.length;
    if (charCounter) charCounter.innerText = `${length} / 200`;
});

addDocForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        alert("User session not found. Please log in again.");
        return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    const title = document.getElementById('doc-title-input').value.trim();
    const category = document.getElementById('doc-category-select').value;
    const ownerName = document.getElementById('doc-owner-name').value;
    
    // IAAF specific values
    let controlNo = document.getElementById('doc-control-no').value;
    if (category === 'IAAF') {
        const currentYear = new Date().getFullYear();
        // Construct full control number: ECOM-YYYY-XXXX
        controlNo = `ECOM-${currentYear}-${controlNo}`;
    }

    const adjType = document.getElementById('doc-adj-type').value;
    const reasonCode = document.getElementById('doc-reason-code').value;
    const amountRange = document.getElementById('doc-amount-range').value;
    const chargeTo = document.getElementById('doc-charge-to').value;
    
    // Tracking fields
    const period = document.getElementById('doc-period').value;
    const week = document.getElementById('doc-week').value;
    const docDate = document.getElementById('doc-date').value;

    if (title.length < 3) {
        alert("Title must be at least 3 characters long.");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Creating...';

    try {
        // Check for duplicate control number if category is IAAF
        if (category === 'IAAF') {
            const { data: existing } = await supabaseClient
                .from('documents')
                .select('id')
                .eq('control_number', controlNo)
                .maybeSingle();
            if (existing) throw new Error("This Control Number already exists.");
        }

        const insertData = { 
            title, 
            category, 
            owner_name: ownerName,
            period,
            week: week ? parseInt(week) : null,
            doc_date: docDate || null
        };

        if (!editingId) {
            insertData.owner_id = user.id;
            insertData.status = 'For Adjustment - for Routing';
            insertData.final_status = 'Pending';
        }

        if (category === 'IAAF') {
            insertData.control_number = controlNo;
            insertData.adj_type = adjType;
            insertData.reason_code = reasonCode;
            insertData.reason_description = REASON_DESC_MAP[reasonCode];
            insertData.amount_range = amountRange;
            insertData.charge_to = chargeTo;
        }

        let error;
        if (editingId) {
            const { error: updateError } = await supabaseClient
                .from('documents')
                .update(insertData)
                .eq('id', editingId);
            error = updateError;
        } else {
            const { error: insertError } = await supabaseClient
                .from('documents')
                .insert([insertData]);
            error = insertError;
        }

        if (error) throw error;

        modalOverlay.classList.add('hidden');
        addDocForm.reset();
        editingId = null;
        document.querySelector('.modal-card h2').innerText = "Add Document";
        document.querySelector('#add-doc-form button[type="submit"]').innerText = "Create Document";
        if (charCounter) charCounter.innerText = '0 / 200';
        document.querySelectorAll('.reveal-step').forEach(el => el.classList.remove('visible')); // Reset disclosure
        document.querySelectorAll('.iaaf-only').forEach(el => el.classList.add('hidden'));
        showToast(editingId ? "Document updated successfully!" : "Document added successfully!");
        showApp(user);
    } catch (err) {
        alert(err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Create Document";
    }
});

// Confirmation Modal Logic
let documentIdToDelete = null;
const confirmModal = document.getElementById('confirm-modal-overlay');

window.deleteDocument = (id) => {
    documentIdToDelete = id;
    confirmModal.classList.remove('hidden');
};

window.editDocument = async (id) => {
    editingId = id;
    const { data: doc, error } = await supabaseClient
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) {
        alert("Error fetching document details: " + error.message);
        return;
    }

    document.getElementById('doc-title-input').value = doc.title;
    document.getElementById('doc-category-select').value = doc.category;
    document.getElementById('doc-owner-name').value = doc.owner_name;
    document.getElementById('doc-date').value = doc.doc_date;
    
    const isIAAF = doc.category === 'IAAF';
    document.querySelectorAll('.iaaf-only').forEach(el => el.classList.toggle('hidden', !isIAAF));
    
    if (isIAAF && doc.control_number) {
        const parts = doc.control_number.split('-');
        document.getElementById('doc-control-no').value = parts[parts.length - 1];
        document.getElementById('doc-adj-type').value = doc.adj_type || '';
        document.getElementById('doc-reason-code').value = doc.reason_code || '';
        document.getElementById('doc-reason-desc').value = doc.reason_description || '';
        document.getElementById('doc-amount-range').value = doc.amount_range || '';
        document.getElementById('doc-charge-to').value = doc.charge_to || '';
    }

    updateTrackingFields(doc.doc_date);
    document.querySelectorAll('.reveal-step').forEach(el => {
        el.classList.add('visible');
        el.classList.remove('hidden');
    });

    document.querySelector('.modal-card h2').innerText = "Edit Document";
    document.querySelector('#add-doc-form button[type="submit"]').innerText = "Update Document";
    modalOverlay.classList.remove('hidden');
};

document.getElementById('cancel-delete-btn')?.addEventListener('click', () => {
    confirmModal.classList.add('hidden');
    documentIdToDelete = null;
});

document.getElementById('confirm-delete-btn')?.addEventListener('click', async () => {
    if (!documentIdToDelete) return;
    
    const btn = document.getElementById('confirm-delete-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Deleting...';

    try {
        const { error } = await supabaseClient
            .from('documents')
            .delete()
            .eq('id', documentIdToDelete);
        
        if (error) throw error;

        confirmModal.classList.add('hidden');
        showToast("Document deleted successfully");
        const { data: { user } } = await supabaseClient.auth.getUser();
        showApp(user);
    } catch (err) {
        alert("Error deleting document: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Delete";
        documentIdToDelete = null;
    }
});

function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    toastMsg.innerText = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebar-toggle');
    if (window.innerWidth <= 768 && 
        !sidebar.contains(e.target) && 
        !toggle.contains(e.target) && 
        sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
    }
});

// 1. Auth Listener
supabaseClient.auth.onAuthStateChange((event, session) => {
    if (session) {
        showApp(session.user);
    } else {
        showAuth();
    }
});

// 2. Handle Authentication
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Signing In...';

    try {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
    } catch (err) {
        alert(err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Sign In";
    }
});

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const role = document.getElementById('signup-role').value;

    if (password.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Creating Account...';

    try {
        const { data, error } = await supabaseClient.auth.signUp({ 
            email, 
            password,
            options: { data: { role } }
        });

        if (error) throw error;
        
        if (data.user) {
            if (!data.session) {
                alert("Account created successfully! Please check your email inbox to confirm your account before logging in.");
                document.getElementById('go-to-login').click();
            } else {
                // If confirmation is off, the auth listener will fire, but we'll trigger showApp manually to be safe
                showApp(data.user);
            }
        }
    } catch (err) {
        alert(err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Sign Up";
    }
});

// 3. Handle Logout
logoutBtn.addEventListener('click', () => supabaseClient.auth.signOut());

async function showApp(user) {
    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    userDisplay.innerText = `Logged in as: ${user.email}`;

    // Only fetch role if we don't have it cached
    if (!currentUserRole) {
        currentUserRole = user.user_metadata?.role;
        try {
            const { data: profile, error } = await supabaseClient
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .maybeSingle();
            
            if (profile && !error) {
                currentUserRole = profile.role;
            }
        } catch (err) {
            console.warn("Profile table fetch failed, falling back to metadata.", err);
        }
    }

    if (currentUserRole === 'admin') {
        await renderAdminDashboard();
    } else {
        await renderClientDashboard(user.id);
    }
}

function showAuth() {
    authContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
    // Ensure we default to the login view when showing auth
    loginView.classList.remove('hidden');
    signupView.classList.add('hidden');
}

function calculateAging(createdAt) {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

async function renderAdminDashboard() {
    document.getElementById('admin-view').classList.remove('hidden');
    document.getElementById('client-view').classList.add('hidden');
    
    const sortBy = document.getElementById('sort-date').value;
    const filterStatus = document.getElementById('filter-status').value;

    let query = supabaseClient
        .from('documents')
        .select(`*, profiles!owner_id(email)`);

    if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
    }

    const { data: docs, error } = await query.order('created_at', { 
        ascending: sortBy === 'asc' 
    });

    if (error) {
        console.error("Admin Fetch Error:", error.message);
        const tbody = document.querySelector('#admin-doc-table tbody');
        let errorMsg = error.message;
        if (errorMsg.includes("infinite recursion")) {
            errorMsg = "Security Policy Error: Infinite recursion detected. Please update RLS policies.";
        } else if (errorMsg.includes("more than one relationship")) {
            errorMsg = "Database Relationship Error: Multiple paths to Profiles table found.";
        }
        
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color: #e11d48; padding: 2rem;">
            <strong>Error:</strong> ${errorMsg}
        </td></tr>`;
        return;
    }

    // Update Stats Bar with count
    const statsBar = document.querySelector('.stats-bar');
    if (statsBar) {
        statsBar.innerHTML = `<span class="material-symbols-outlined">analytics</span> Total Records: ${docs.length}`;
    }

    const tbody = document.querySelector('#admin-doc-table tbody');
    tbody.innerHTML = (docs && docs.length > 0) ? docs.map(doc => {
        const aging = calculateAging(doc.created_at);
        const updatedDate = doc.updated_at ? new Date(doc.updated_at).toLocaleString() : 'N/A';
        const agingClass = aging > 5 ? 'Cancelled' : 'Pending';
        const detailLine = doc.category === 'IAAF' ? `${doc.adj_type || ''} | ${doc.amount_range || ''} | ${doc.charge_to || ''} | ${doc.reason_description || ''}` : 'Standard Record';
        
        return `
        <tr>
            <td style="box-shadow: inset 5px 0 0 ${doc.category === 'IAAF' ? '#be185d' : '#0369a1'};">
                <div style="font-weight: 600;">${doc.title}</div>
                <span class="doc-meta-detail">${detailLine}</span>
            </td>
            <td style="font-weight: 500;">${doc.owner_name || 'N/A'}</td>
            <td><span class="badge ${doc.category === 'IAAF' ? 'iaaf-badge' : 'ir-badge'}">${doc.category || 'N/A'}</span></td>
            <td style="font-family: monospace; font-size: 0.85rem;">${doc.control_number || '—'}</td>
            <td style="font-size: 0.8rem; color: var(--gray-600);">${doc.profiles ? doc.profiles.email : 'Unknown'}</td>
            <td><span class="badge ${doc.status}">${doc.status}</span></td>
            <td>
                <select onchange="updateFinalStatus('${doc.id}', this.value)" class="status-select">
                    <option value="Pending" ${doc.final_status === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="Completed" ${doc.final_status === 'Completed' ? 'selected' : ''}>Completed</option>
                    <option value="Cancelled" ${doc.final_status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </td>
            <td style="font-size: 0.75rem;">${updatedDate}</td>
            <td><span class="badge ${agingClass}">${aging} Days</span></td>
            <td>
                <div class="action-btns">
                    <button class="icon-btn" onclick="receiveDocument('${doc.id}')" title="Mark Received"><span class="material-symbols-outlined">check_circle</span></button>
                    <button class="icon-btn delete" onclick="deleteDocument('${doc.id}')" title="Delete"><span class="material-symbols-outlined">delete</span></button>
                </div>
            </td>
        </tr>
    `}).join('') : '<tr><td colspan="9" style="text-align:center; padding: 2rem;">No documents found in the system.</td></tr>';
}

async function renderClientDashboard(userId) {
    document.getElementById('client-view').classList.remove('hidden');
    document.getElementById('admin-view').classList.add('hidden');
    const sortBy = document.getElementById('sort-date').value;
    const filterStatus = document.getElementById('filter-status').value;

    let query = supabaseClient
        .from('documents')
        .select('*')
        .eq('owner_id', userId);

    if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
    }

    const { data: docs, error } = await query.order('created_at', { 
        ascending: sortBy === 'asc' 
    });

    const container = document.getElementById('client-doc-list');

    if (error) {
        console.error("Client Fetch Error:", error.message);
        let errorMsg = error.message;
        container.innerHTML = `<tr><td colspan="8" style="text-align:center; color: #e11d48; padding: 1rem;">Error: ${errorMsg}</td></tr>`;
        return;
    }

    if (!docs || docs.length === 0) {
        container.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem; color: var(--gray-500);">No documents found.</td></tr>`;
        return;
    }

    container.innerHTML = docs.map(doc => {
        const aging = calculateAging(doc.created_at);
        const updatedDate = doc.updated_at ? new Date(doc.updated_at).toLocaleString() : 'N/A';
        const agingClass = aging > 5 ? 'Cancelled' : 'Pending';
        const detailLine = doc.category === 'IAAF' ? `${doc.adj_type || ''} | ${doc.amount_range || ''} | ${doc.charge_to || ''} | ${doc.reason_description || ''}` : 'Standard Record';

        return `
        <tr>
            <td style="box-shadow: inset 5px 0 0 ${doc.category === 'IAAF' ? '#be185d' : '#0369a1'};">
                <div style="font-weight: 600;">${doc.title}</div>
                <span class="doc-meta-detail">${detailLine}</span>
            </td>
            <td style="font-weight: 500;">${doc.owner_name || 'N/A'}</td>
            <td><span class="badge ${doc.category === 'IAAF' ? 'iaaf-badge' : 'ir-badge'}">${doc.category}</span></td>
            <td style="font-family: monospace; font-size: 0.85rem;">${doc.control_number || '—'}</td>
            <td>
                <select onchange="updateStatus('${doc.id}', this.value)" class="status-select">
                    <option value="Adjusted - for Routing" ${doc.status === 'Adjusted - for Routing' ? 'selected' : ''}>Adjusted - for Routing</option>
                    <option value="For Adjustment - for Routing" ${doc.status === 'For Adjustment - for Routing' ? 'selected' : ''}>For Adjustment - for Routing</option>
                    <option value="Revised" ${doc.status === 'Revised' ? 'selected' : ''}>Revised</option>
                    <option value="Cancelled" ${doc.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </td>
            <td><span class="badge ${doc.final_status}">${doc.final_status || 'Pending'}</span></td>
            <td style="font-size: 0.75rem;">${updatedDate}</td>
            <td><span class="badge ${agingClass}">${aging} Days</span></td>
            <td>
                <div class="action-btns">
                    <button class="icon-btn" onclick="editDocument('${doc.id}')" title="Edit">
                        <span class="material-symbols-outlined" style="font-size: 1.2rem;">edit</span>
                    </button>
                    <button class="icon-btn" onclick="submitToAdmin('${doc.id}')" title="Submit to Admin">
                        <span class="material-symbols-outlined" style="font-size: 1.2rem;">send</span>
                    </button>
                </div>
            </td>
        </tr>
    `}).join('');
}

// Global function for admin actions
window.updateStatus = async (id, status) => {
    const { error } = await supabaseClient
        .from('documents')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
    
    if (!error) {
        showToast(`Document ${status}`);
        const { data: { user } } = await supabaseClient.auth.getUser();
        // Clear cached role on status update to ensure UI remains synced
        currentUserRole = null; 
        showApp(user);
    }
};

window.submitToAdmin = async (id) => {
    await updateStatus(id, 'Adjusted - for Routing');
};

window.receiveDocument = async (id) => {
    await updateFinalStatus(id, 'Completed');
};

window.updateFinalStatus = async (id, final_status) => {
    const { error } = await supabaseClient
        .from('documents')
        .update({ final_status, updated_at: new Date().toISOString() })
        .eq('id', id);
    
    if (!error) {
        showToast(`Final Status: ${final_status}`);
        const { data: { user } } = await supabaseClient.auth.getUser();
        showApp(user);
    }
};
