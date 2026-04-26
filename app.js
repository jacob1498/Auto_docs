const SUPABASE_URL = 'https://ghfloompdoasrtpnjomo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoZmxvb21wZG9hc3J0cG5qb21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MzM2NzUsImV4cCI6MjA5MjEwOTY3NX0.i4G0bPcUPfYCBvTjCQBxPEJvh2HNbR1JCgxgYmXm6yc';

// Theme Initialization Logic
const applyTheme = (theme) => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('doctrack-theme', theme);
};
applyTheme(localStorage.getItem('doctrack-theme') || 'default');

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const loginView = document.getElementById('login-view');
const signupView = document.getElementById('signup-view');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const userDisplay = document.getElementById('user-display');
let currentUserRole = null;
let editingId = null;
let currentClientTab = localStorage.getItem('doctrack-client-tab') || 'active';
let currentAdminTab = localStorage.getItem('doctrack-admin-tab') || 'all';
let currentAdminAgingFilter = null;
let currentAdminPage = 0;
let currentSerialStart = 1;
let currentClientPage = 0;
let currentSearchTerm = '';
let currentStartDate = '';
let currentEndDate = '';
let currentSidebarView = localStorage.getItem('doctrack-sidebar-view') || 'documents';
const PAGE_SIZE = 10;
let monthlyGroupsCache = {}; // Store report data for export
let realtimeSubscription = null;
let autoRefreshInterval = null;
let lastAdminTableHTML = "";
let lastClientTableHTML = "";
let lastAdminStatsBarHTML = "";
let lastAgingBracketsHTML = "";
let lastOwnerMatrixHTML = "";
let lastClientAgingTableHTML = "";

// Global Loader Management
function hideSplashScreen() {
    const splash = document.getElementById('app-splash');
    if (splash) splash.classList.add('fade-out');
}

// Helper to synchronize search UI and state
function clearSearchUI() {
    currentSearchTerm = '';
    currentStartDate = '';
    currentEndDate = '';
    document.querySelectorAll('.dashboard-date-filter').forEach(input => input.value = '');
    document.querySelectorAll('.dashboard-search').forEach(input => input.value = '');
    document.querySelectorAll('.clear-search-btn').forEach(btn => btn.classList.add('hidden'));
    document.getElementById('no-results')?.classList.add('hidden');
    lastAdminTableHTML = "";
    lastClientTableHTML = "";
    lastAdminStatsBarHTML = "";
    lastAgingBracketsHTML = "";
    lastOwnerMatrixHTML = "";
    lastClientAgingTableHTML = "";
}

// Tab Switching Logic
window.switchClientTab = async (tab) => {
    currentClientTab = tab;
    localStorage.setItem('doctrack-client-tab', tab);
    currentClientPage = 0; // Reset to first page
    clearSearchUI(); // Ensure fresh state on tab change

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) renderClientDashboard(session.user.id);
};

window.switchAdminTab = async (tab) => {
    currentAdminTab = tab;
    localStorage.setItem('doctrack-admin-tab', tab);
    currentAdminPage = 0; // Reset to first page
    currentAdminAgingFilter = null; // Clear aging filter when manually switching tabs
    clearSearchUI(); // Ensure fresh state on tab change

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) renderAdminDashboard();
};

window.filterByStatus = async (status) => {
    if (currentUserRole === 'admin') {
        await switchAdminTab(status);
    } else {
        // For clients, 'all' maps to the 'all' tab, others map directly
        await switchClientTab(status);
    }
    await switchSidebarView('documents');
};

// Profile Modal Controls
window.openProfileModal = async function() {
    document.getElementById('profile-modal-overlay').classList.remove('hidden');
    await renderProfileView();
};

window.closeProfileModal = function() {
    document.getElementById('profile-modal-overlay').classList.add('hidden');
};

// Sidebar Navigation Switching
window.switchSidebarView = async function(viewName) {
    currentSidebarView = viewName;
    localStorage.setItem('doctrack-sidebar-view', viewName);
    document.getElementById('no-results')?.classList.add('hidden');
    if (viewName === 'dashboard') clearSearchUI();
    
    const settingsView = document.getElementById('settings-view');

    // Update Active Nav State
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.id === `nav-${viewName}`);
    });

    // Toggle Content Views
    const statsView = document.getElementById('stats-view');
    const reportsView = document.getElementById('reports-view');
    const detailsView = document.getElementById('doc-details-view');
    const docViews = document.querySelectorAll('.documents-content');
    
    // Hide all views first
    [statsView, reportsView, settingsView, detailsView].forEach(v => v?.classList.add('hidden'));
    docViews.forEach(v => v.classList.add('hidden'));

    if (viewName === 'dashboard') {
        statsView.classList.remove('hidden');
        await updateStatsDashboard();
    } else if (viewName === 'settings') {
        settingsView.classList.remove('hidden');
        const selector = document.getElementById('theme-selector');
        if (selector) selector.value = localStorage.getItem('doctrack-theme') || 'default';
    } else if (viewName === 'reports') {
        reportsView.classList.remove('hidden');
        await renderReportsView();
    } else if (viewName === 'doc-details') {
        detailsView.classList.remove('hidden');
        await renderDocDetailsView();
    } else if (viewName === 'documents') {
        // The actual role-based rendering happens in showApp or re-renders
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            const user = session.user;
            // Force role check
            const role = currentUserRole || user.user_metadata?.role;
            
            if (role === 'admin') {
                await renderAdminDashboard();
            } else {
                await renderClientDashboard(user.id);
            }
        }
    }
}

document.getElementById('nav-dashboard')?.addEventListener('click', (e) => { e.preventDefault(); switchSidebarView('dashboard'); });
document.getElementById('nav-documents')?.addEventListener('click', (e) => { e.preventDefault(); switchSidebarView('documents'); });
document.getElementById('nav-reports')?.addEventListener('click', (e) => { e.preventDefault(); switchSidebarView('reports'); });
document.getElementById('nav-doc-details')?.addEventListener('click', (e) => { e.preventDefault(); switchSidebarView('doc-details'); });
document.getElementById('nav-settings')?.addEventListener('click', (e) => { e.preventDefault(); switchSidebarView('settings'); });

// Theme Selector Listener
document.getElementById('theme-selector')?.addEventListener('change', (e) => {
    applyTheme(e.target.value);
});

// Profile Dropdown Toggle
document.getElementById('user-profile-header')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('profile-dropdown').classList.toggle('hidden');
});

// Close dropdown when clicking outside
document.addEventListener('click', () => {
    document.getElementById('profile-dropdown')?.classList.add('hidden');
});

// Close profile modal when clicking outside
document.getElementById('profile-modal-overlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('profile-modal-overlay')) {
        closeProfileModal();
    }
});

// Sidebar Collapse Toggle
const toggleSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    const isCollapsed = sidebar.classList.toggle('collapsed');
    localStorage.setItem('doctrack-sidebar-collapsed', isCollapsed);
};

document.getElementById('desktop-sidebar-toggle')?.addEventListener('click', toggleSidebar);

// Initialize sidebar state
if (localStorage.getItem('doctrack-sidebar-collapsed') === 'true') {
    document.getElementById('sidebar')?.classList.add('collapsed');
}

document.getElementById('profile-form')?.addEventListener('submit', (e) => { e.preventDefault(); updateProfile(); });
document.getElementById('password-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const newPassword = document.getElementById('new-password').value;

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Updating...';

    try {
        const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
        if (error) throw error;
        showToast("Password updated successfully!");
        e.target.reset();
    } catch (err) {
        showToast("Error updating password: " + err.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined">key</span> Update Password';
    }
});

// Helper to compress and resize image for faster uploads
const compressAvatar = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const size = 300; // Standard avatar size
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                // Square crop and resize
                const minDir = Math.min(img.width, img.height);
                const sx = (img.width - minDir) / 2;
                const sy = (img.height - minDir) / 2;
                ctx.drawImage(img, sx, sy, minDir, minDir, 0, 0, size, size);
                canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8);
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
};

document.getElementById('avatar-input')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    // Optimistic UI: Show image immediately using local URL
    const localUrl = URL.createObjectURL(file);
    const headerImg = document.getElementById('header-avatar-img');
    const profileImg = document.getElementById('profile-avatar-img');
    if (headerImg) { headerImg.src = localUrl; headerImg.style.display = 'block'; }
    if (profileImg) { profileImg.src = localUrl; profileImg.style.display = 'block'; }

    const placeholder = document.getElementById('profile-avatar-placeholder');
    const originalContent = placeholder.innerHTML;
    placeholder.innerHTML = '<div class="spinner spinner-dark"></div>';

    try {
        // Compress image before upload (converts to JPEG)
        const compressedBlob = await compressAvatar(file);
        const fileName = `${user.id}-${Date.now()}.jpg`;

        const { error: uploadError } = await supabaseClient.storage
            .from('avatars')
            .upload(fileName, compressedBlob, { contentType: 'image/jpeg', upsert: true });

        if (uploadError) {
            if (uploadError.message.includes("not found")) {
                throw new Error("Storage bucket 'avatars' not found. Please create it in your Supabase dashboard and set it to 'Public'.");
            }
            throw uploadError;
        }

        const { data: { publicUrl } } = supabaseClient.storage.from('avatars').getPublicUrl(fileName);

        const { error: updateError } = await supabaseClient
            .from('profiles')
            .upsert({ 
                id: user.id, 
                avatar_url: publicUrl, 
                role: currentUserRole || user.user_metadata?.role || 'client',
                updated_at: new Date().toISOString() 
            });

        if (updateError) throw updateError;

        showToast("Avatar updated successfully!");
        await renderProfileView();
    } catch (err) {
        let msg = err.message;
        if (msg.includes("row-level security")) {
            msg = "Permission denied: Please check your Supabase 'profiles' table RLS policies (Insert/Update).";
        } else if (msg.includes("column") && msg.includes("schema cache")) {
            msg = "Database Error: The 'avatar_url' column is missing in your 'profiles' table. Please run the SQL setup script.";
        }
        showToast("Upload failed: " + msg, "error");
        placeholder.innerHTML = originalContent;
    }
});

document.getElementById('export-reports-btn')?.addEventListener('click', () => {
    document.getElementById('export-modal-overlay').classList.remove('hidden');
    // Reset modal state
    document.getElementById('export-type-select').value = 'summary';
    document.getElementById('date-range-fields').classList.add('hidden');
    document.getElementById('export-start-date').value = '';
    document.getElementById('export-end-date').value = '';
});

document.getElementById('close-export-modal')?.addEventListener('click', () => {
    document.getElementById('export-modal-overlay').classList.add('hidden');
});

document.getElementById('confirm-export-btn')?.addEventListener('click', async () => {
    const type = document.getElementById('export-type-select').value;
    document.getElementById('export-modal-overlay').classList.add('hidden');
    if (type === 'summary') {
        window.exportReportsToCSV();
    } else {
        await window.exportRawDataToCSV();
    }
});

document.getElementById('export-type-select')?.addEventListener('change', (e) => {
    const isRaw = e.target.value === 'raw';
    document.getElementById('date-range-fields')?.classList.toggle('hidden', !isRaw);
});

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
// Row selection for touch/click support
document.addEventListener('click', (e) => {
    const row = e.target.closest('tr');
    const isDocRow = row && (row.closest('#admin-doc-table') || row.closest('#client-doc-table'));
    
    // If clicking a document row, but not clicking an action button directly
    if (isDocRow && !e.target.closest('.action-btns')) {
        const wasSelected = row.classList.contains('selected-row');
        // Clear all selections first
        document.querySelectorAll('tr.selected-row').forEach(r => r.classList.remove('selected-row'));
        // Toggle current row if it wasn't already selected
        if (!wasSelected) row.classList.add('selected-row');
    } else if (!e.target.closest('tr')) {
        // Clear selection when clicking completely outside the table
        document.querySelectorAll('tr.selected-row').forEach(r => r.classList.remove('selected-row'));
    }
});

let searchTimeout;
document.addEventListener('input', (e) => {
    if (!e.target.classList.contains('dashboard-search')) return;
    
    // Sanitize input to prevent breaking Supabase .or() syntax
    // We escape commas as they are used as delimiters in the query string
    const term = e.target.value.trim().replace(/,/g, '');
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        currentSearchTerm = term;
        currentAdminPage = 0; // Reset pagination on new search
        currentClientPage = 0;

        const clearBtn = e.target.parentElement.querySelector('.clear-search-btn');
        if (clearBtn) clearBtn.classList.toggle('hidden', term === '');

        const { data: sessionData } = await supabaseClient.auth.getSession();
        const user = sessionData?.session?.user;
        
        if (user) {
            // Use metadata fallback to ensure Admins don't get kicked to the Client view during search
            const role = currentUserRole || user.user_metadata?.role;
            if (role === 'admin') {
                await renderAdminDashboard();
            } else {
                await renderClientDashboard(user.id);
            }
        }
    }, 400);
});

document.addEventListener('click', async (e) => {
    const clearBtn = e.target.closest('.clear-search-btn');
    if (clearBtn) {
        const searchInput = clearBtn.parentElement.querySelector('.dashboard-search');
        searchInput.value = '';
        currentSearchTerm = '';
        clearBtn.classList.add('hidden');

        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            if (currentUserRole === 'admin') {
                await renderAdminDashboard();
            } else {
                await renderClientDashboard(session.user.id);
            }
        }
    }
});

document.addEventListener('change', async (e) => {
    if (!e.target.classList.contains('dashboard-date-filter')) return;
    
    if (e.target.id.includes('start')) currentStartDate = e.target.value;
    if (e.target.id.includes('end')) currentEndDate = e.target.value;

    // Clear aging filter if custom range is set to avoid logic conflicts
    if (currentStartDate || currentEndDate) currentAdminAgingFilter = null;

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        if (currentUserRole === 'admin') await renderAdminDashboard();
        else await renderClientDashboard(session.user.id);
    }
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
    const modalCard = document.querySelector('.modal-card');
    if (modalCard) modalCard.classList.toggle('modal-wide', isIAAF);
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

/**
 * Progressive Disclosure Logic
 * Ensures steps are shown only when prerequisites are met.
 */
function checkDisclosure() {
    const category = categorySelect.value;
    const owner = ownerSelect.value;
    const date = dateInput.value;
    const control = controlNoInput.value;
    const title = docTitleInput.value;

    const stepDate = document.getElementById('step-date');
    const stepControl = document.getElementById('step-control');
    const stepSubject = document.getElementById('step-subject');
    const stepIaaf = document.getElementById('step-iaaf');

    const isIAAF = category === 'IAAF';

    // Step 2: Date depends on Category and Owner being selected
    const hasBase = !!(category && owner);
    stepDate?.classList.toggle('visible', hasBase);

    // Step 2b: Control Number (IAAF only)
    const showControl = hasBase && isIAAF;
    if (stepControl) {
        stepControl.classList.toggle('visible', showControl);
        if (showControl) stepControl.classList.remove('hidden');
    }

    // Step 3: Subject depends on Date being selected (and Control No if IAAF)
    const controlReady = !isIAAF || (control && control.length === 4);
    const hasStep2 = hasBase && !!date && controlReady;
    stepSubject?.classList.toggle('visible', hasStep2);

    // Step 4: IAAF Details depends on Subject having content
    const hasStep3 = hasStep2 && isIAAF && title.length > 5;
    if (stepIaaf) {
        stepIaaf.classList.toggle('visible', hasStep3);
        if (hasStep3) stepIaaf.classList.remove('hidden');
    }
}

async function loadSubjectSuggestions() {
    const container = document.getElementById('subject-suggestions');
    if (!container) return;

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    // Fetch the 20 most recent titles to find common patterns
    const { data: docs } = await supabaseClient
        .from('documents')
        .select('title')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

    if (!docs || docs.length === 0) {
        container.innerHTML = '';
        return;
    }

    // Get unique titles and count occurrences
    const counts = docs.reduce((acc, d) => {
        acc[d.title] = (acc[d.title] || 0) + 1;
        return acc;
    }, {});

    const commonTitles = Object.keys(counts)
        .sort((a, b) => counts[b] - counts[a])
        .slice(0, 5); // Show top 5 suggestions

    container.innerHTML = commonTitles.map(title => `
        <div class="suggestion-chip" onclick="applySuggestion('${title.replace(/'/g, "\\'")}')">${title}</div>
    `).join('');
}

window.applySuggestion = (text) => {
    const input = document.getElementById('doc-title-input');
    input.value = text;
    input.dispatchEvent(new Event('input')); // Trigger disclosure and char count
};

ownerSelect?.addEventListener('change', checkDisclosure);
dateInput?.addEventListener('change', checkDisclosure);
docTitleInput?.addEventListener('input', checkDisclosure);
controlNoInput?.addEventListener('input', checkDisclosure);

function resetModalState() {
    if (addDocForm) addDocForm.reset();
    const modalCard = document.querySelector('.modal-card');
    if (modalCard) modalCard.classList.remove('modal-wide');
    if (charCounter) charCounter.innerText = '0 / 200';
    document.querySelectorAll('.iaaf-only').forEach(el => el.classList.add('hidden'));
    
    editingId = null;
    const modalTitle = document.querySelector('.modal-card h2');
    if (modalTitle) modalTitle.innerText = "Add Document";
    
    const submitBtn = document.querySelector('#add-doc-form button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = "Create Document";
    }
    
    document.querySelectorAll('.reveal-step').forEach(el => el.classList.remove('visible'));
}

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

// Multi-Action FAB Logic
const fabContainer = document.getElementById('fab-container');
document.getElementById('main-fab')?.addEventListener('click', () => {
    fabContainer.classList.toggle('active');
});

// Close FAB when clicking outside
document.addEventListener('click', (e) => {
    if (fabContainer && !fabContainer.contains(e.target)) {
        fabContainer.classList.remove('active');
    }
});

document.getElementById('opt-add-doc')?.addEventListener('click', () => {
    fabContainer.classList.remove('active');
    resetModalState();
    modalOverlay.classList.remove('hidden');
    docTitleInput.focus();
    
    const today = new Date().toISOString().split('T')[0];
    if (dateInput) {
        dateInput.value = today;
        updateTrackingFields(today);
    }
    checkDisclosure();
    loadSubjectSuggestions();
});

document.getElementById('opt-upload-details')?.addEventListener('click', () => {
    fabContainer.classList.remove('active');
    showToast("Bulk upload details functionality coming soon!", "info");
});

document.getElementById('close-modal')?.addEventListener('click', () => {
    modalOverlay.classList.add('hidden');
    resetModalState();
});

// Return Reason Modal Logic
let docIdToReturn = null;
const returnModal = document.getElementById('return-modal-overlay');
const returnReasonForm = document.getElementById('return-reason-form');
const returnReasonInput = document.getElementById('return-reason-input');

window.returnToClient = (id) => {
    docIdToReturn = id;
    returnReasonInput.value = ''; // Clear previous input
    returnModal.classList.remove('hidden');
    returnReasonInput.focus();
};

document.getElementById('close-return-modal')?.addEventListener('click', () => {
    returnModal.classList.add('hidden');
    docIdToReturn = null;
});

returnReasonForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const reason = returnReasonInput.value.trim();
    
    if (!reason) return; // HTML 'required' handles this, but safety first

    const success = await updateStatus(docIdToReturn, 'Revised', 'Returned to client for revision', { return_reason: reason });
    if (success) {
        returnModal.classList.add('hidden');
        docIdToReturn = null;
    }
});

docTitleInput?.addEventListener('input', (e) => {
    const length = e.target.value.length;
    if (charCounter) charCounter.innerText = `${length} / 200`;
});

addDocForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    const title = document.getElementById('doc-title-input').value.trim();
    const category = document.getElementById('doc-category-select').value;
    const ownerName = document.getElementById('doc-owner-name').value;
    const initialStatus = document.getElementById('doc-status-select').value;
    
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
            let dupQuery = supabaseClient
                .from('documents')
                .select('id')
                .eq('control_number', controlNo);
            
            if (editingId) dupQuery = dupQuery.neq('id', editingId);
            
            const { data: existing } = await dupQuery.maybeSingle();
            if (existing) throw new Error("This Control Number already exists.");
        }

        const now = new Date();
        const timePart = now.toISOString().split('T')[1];
        const createdAt = docDate ? `${docDate}T${timePart}` : now.toISOString();

        const insertData = { 
            title, 
            category, 
            owner_name: ownerName,
        status: initialStatus || 'Active',
            period,
            created_at: createdAt,
            updated_at: now.toISOString(),
            week: week ? parseInt(week) : null,
            doc_date: docDate || null,
            return_reason: initialStatus === 'Submitted' ? null : undefined // Clear reason on re-submit
        };

        if (!editingId) {
            insertData.owner_id = user.id;
        }

        if (category === 'IAAF') {
            insertData.control_number = controlNo;
            insertData.adj_type = adjType;
            insertData.reason_code = reasonCode;
            insertData.reason_description = REASON_DESC_MAP[reasonCode];
            insertData.amount_range = amountRange;
            insertData.charge_to = chargeTo;
        } else {
            // Clear IAAF fields if switching category to IR
            insertData.control_number = null;
            insertData.adj_type = null;
            insertData.reason_code = null;
            insertData.reason_description = null;
            insertData.amount_range = null;
            insertData.charge_to = null;
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
        showToast(editingId ? "Document updated successfully!" : "Document added successfully!");
        resetModalState();
        showApp(user);
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerText = editingId ? "Update Document" : "Create Document";
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
        showToast("Error fetching document details: " + error.message, "error");
        return;
    }
    document.getElementById('doc-title-input').value = doc.title;
    document.getElementById('doc-category-select').value = doc.category;
    document.getElementById('doc-owner-name').value = doc.owner_name;
    document.getElementById('doc-date').value = doc.doc_date;
    document.getElementById('doc-status-select').value = doc.status;
    
    const isIAAF = doc.category === 'IAAF';
    const modalCard = document.querySelector('.modal-card');
    if (modalCard) modalCard.classList.toggle('modal-wide', isIAAF);
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
    checkDisclosure(); // Dynamically show fields based on loaded data

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
        showToast("Error deleting document: " + err.message, "error");
    } finally {
        btn.disabled = false;
        documentIdToDelete = null;
    }
});

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMsg = toast.querySelector('.toast-message') || toast;
    const toastIcon = toast.querySelector('.material-symbols-outlined');

    toastMsg.innerText = message;
    toastIcon.innerText = type === 'success' ? 'check_circle' : 'error';
    
    toast.classList.remove('hidden', 'success', 'error');
    toast.classList.add(type);
    void toast.offsetHeight; 
    toast.style.animation = null;

    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(() => toast.classList.add('hidden'), 4000);
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
        if (realtimeSubscription) {
            supabaseClient.removeChannel(realtimeSubscription);
            realtimeSubscription = null;
        }
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
        showToast(err.message, "error");
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
                alert("Verification Required: A confirmation link has been sent to your email. Please verify your account before signing in.\n\nNote: On the Supabase Free Tier, there is a limit of 3 emails per hour. If you don't see it, check your spam or try again later.");
                document.getElementById('go-to-login').click();
            } else {
                // If confirmation is off, the auth listener will fire, but we'll trigger showApp manually to be safe
                showApp(data.user);
            }
        }
    } catch (err) {
        if (err.message.includes("rate limit")) {
            showToast("Supabase Limit Reached. Please try again later.", "error");
        } else {
            showToast("Sign Up Error: " + err.message, "error");
        }
        console.error("Detailed Auth Error:", err);
    } finally {
        btn.disabled = false;
        btn.innerText = "Sign Up";
    }
});

async function updateStatsDashboard() {
    // --- 1. Fetch high-level stats using aggregate queries ---
    const { count: totalCount, error: totalError } = await supabaseClient.from('documents').select('*', { count: 'exact', head: true });
    const { count: submittedCount, error: submittedError } = await supabaseClient.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'Submitted');
    const { count: returnedCount, error: returnedError } = await supabaseClient.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'Revised');
    const { count: completedCount, error: completedError } = await supabaseClient.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'Completed');
    const { count: cancelledCount, error: cancelledError } = await supabaseClient.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'Cancelled');

    if (totalError || submittedError || returnedError || completedError || cancelledError) {
        console.error("Error fetching dashboard stats:", totalError || submittedError || returnedError || completedError || cancelledError);
        return;
    }

    // Update metric cards
    if (document.getElementById('stat-total-docs')) document.getElementById('stat-total-docs').innerText = totalCount;
    if (document.getElementById('stat-pending-docs')) document.getElementById('stat-pending-docs').innerText = submittedCount;
    if (document.getElementById('stat-returned-docs')) document.getElementById('stat-returned-docs').innerText = returnedCount;
    if (document.getElementById('stat-completed-docs')) document.getElementById('stat-completed-docs').innerText = completedCount;
    if (document.getElementById('stat-cancelled-docs')) document.getElementById('stat-cancelled-docs').innerText = cancelledCount;

    // Admin-only breakdown matrix
    const adminSection = document.getElementById('admin-breakdown-section');
    const adminSerialSection = document.getElementById('admin-serial-monitor-section');
    const adminAgingSection = document.getElementById('admin-aging-section');

    // --- 2. Fetch data for Admin-specific sections (Aging, Serial, Owner Matrix) ---
    // This still fetches a subset of columns, but only when needed for admin dashboard.
    // For very large datasets, these might also need further optimization (e.g., database views, functions).
    const { data: adminDocs, error: adminDocsError } = await supabaseClient
        .from('documents')
        .select('status, owner_name, created_at, doc_date, control_number, category, title'); // Only fetch necessary columns

    if (adminDocsError) {
        console.error("Error fetching admin dashboard documents:", adminDocsError);
        return;
    }
    const docs = adminDocs || []; // Use the fetched adminDocs

    if (currentUserRole === 'admin') {
        adminSection.classList.remove('hidden');
        adminSerialSection.classList.remove('hidden');
        adminAgingSection.classList.remove('hidden');

        // Calculate Aging Brackets for Submitted docs
        const pendingDocs = docs.filter(d => !['Completed', 'Cancelled'].includes(d.status) && d.doc_date); // Ensure doc_date exists for aging
        const brackets = { '0-3 Days': 0, '4-7 Days': 0, '8-11 Days': 0, '12+ Days': 0 };
        const clientAging = {};
        
        pendingDocs.forEach(d => {
            const age = calculateAging(d.doc_date); // Use doc_date for aging
            const owner = d.owner_name || 'Unassigned';
            if (!clientAging[owner]) clientAging[owner] = { 'low': 0, 'mid': 0, 'high': 0, 'total': 0 };

            // Only count if age is valid (non-negative)
            if (age >= 0) {
                if (age <= 3) { brackets['0-3 Days']++; clientAging[owner].low++; }
                else if (age <= 7) { brackets['4-7 Days']++; clientAging[owner].mid++; }
                else if (age <= 11) { brackets['8-11 Days']++; clientAging[owner].high++; }
                else { brackets['12+ Days']++; clientAging[owner].high++; }
                clientAging[owner].total++;
            }
        });

        const agingContainer = document.getElementById('aging-brackets-container');
        const colors = { 
            '0-3 Days': 'var(--success)', 
            '4-7 Days': 'var(--info)', 
            '8-11 Days': 'var(--pending)', // Using pending color for consistency
            '12+ Days': 'var(--danger)' 
        };
        
        // Check if agingContainer exists before updating
        if (agingContainer) {
        const agingHTML = Object.entries(brackets).map(([label, count]) => `
            <div class="aging-bracket-card" style="border-top-color: ${colors[label]}" onclick="filterByAging('${label}')">
                <span style="font-size: 0.65rem; font-weight: 700; color: var(--gray-500); text-transform: uppercase; letter-spacing: 0.025em;">${label}</span>
                <div style="display: flex; align-items: baseline; gap: 0.25rem;">
                    <h3 style="margin:0; font-size: 1.75rem; color: var(--gray-900);">${count}</h3>
                    <span style="font-size: 0.75rem; color: var(--gray-500); font-weight: 500;">docs</span>
                </div>
            </div>
        `).join('');
            if (agingHTML !== lastAgingBracketsHTML) {
                agingContainer.innerHTML = agingHTML;
                lastAgingBracketsHTML = agingHTML;
            }
        }

        const clientAgingTbody = document.getElementById('client-aging-tbody');
        if (clientAgingTbody) {
            const clientAgingHTML = Object.entries(clientAging).map(([name, data]) => `
                <tr onclick="filterByOwnerAging('${name}')" style="cursor: pointer;" class="hover-row">
                    <td style="font-weight: 600; color: var(--gray-900);">${name || 'Unassigned'}</td>
                    <td style="text-align: center; color: var(--success); font-weight: 500;">${data.low}</td>
                    <td style="text-align: center;">${data.mid > 0 ? `<span class="badge Revised" style="padding: 0.25rem 0.5rem;">${data.mid}</span>` : '<span style="color:var(--gray-300)">0</span>'}</td>
                    <td style="text-align: center;">${data.high > 0 ? `<span class="badge Cancelled" style="padding: 0.25rem 0.5rem;">${data.high}</span>` : '<span style="color:var(--gray-300)">0</span>'}</td>
                    <td style="text-align: center; font-weight: 700; color: var(--primary);">${data.total}</td>
                </tr>
            `).join('') || '<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--gray-400);">No pending documents to analyze.</td></tr>';
            if (clientAgingHTML !== lastClientAgingTableHTML) {
                clientAgingTbody.innerHTML = clientAgingHTML;
                lastClientAgingTableHTML = clientAgingHTML;
            }
        }

        // Render Serial Status Grid (IAAF only)
        const rangeControls = document.getElementById('serial-range-controls');
        const serialGrid = document.getElementById('serial-status-grid');
        const iaafDocs = docs.filter(d => d.category === 'IAAF' && d.control_number);
        
        // Create a map of existing serials for quick lookup
        const serialMap = {};
        iaafDocs.forEach(d => {
            const num = d.control_number ? parseInt(d.control_number.split('-').pop()) : NaN;
            if (!isNaN(num)) serialMap[num] = d;
        });

        // Render Range Buttons (1-100, 101-200, ... up to 3000)
        const ranges = [];
        for (let i = 1; i <= 3000; i += 100) {
            ranges.push({ start: i, end: i + 99 });
        }

        // Check if rangeControls exists before updating
        if (rangeControls) {
            rangeControls.innerHTML = ranges.map(r => `
                <button class="tab-btn ${currentSerialStart === r.start ? 'active' : ''}" 
                        style="font-size: 0.75rem; padding: 0.4rem 0.8rem;"
                        onclick="setSerialRange(${r.start})">
                    ${r.start}-${r.end}
                </button>
                <span class="material-symbols-outlined"></span>
            `).join('');
        }

        // Render the 100 slots for the current range
        let gridHTML = '';
        for (let i = currentSerialStart; i < currentSerialStart + 100 && i <= 3000; i++) {
            const doc = serialMap[i];
            const displayNum = i.toString().padStart(4, '0');
            if (doc) {
                gridHTML += `<div class="serial-node ${doc.status}" title="Serial: ${displayNum}\nStatus: ${doc.status}\nTitle: ${doc.title}">${displayNum}</div>`;
            } else {
                gridHTML += `<div class="serial-node empty" title="Serial: ${displayNum}\nStatus: Available">${displayNum}</div>`;
            }
        }
        if (serialGrid) { // Check if serialGrid exists before updating
            serialGrid.innerHTML = gridHTML;
        }

        const matrixBody = document.querySelector('#owner-status-matrix tbody');
        
        // Group documents by owner
        const ownerGroups = docs.reduce((acc, doc) => {
            const owner = doc.owner_name || 'Unassigned';
            if (!acc[owner]) {
                acc[owner] = { Active: 0, Submitted: 0, Revised: 0, Completed: 0, Cancelled: 0, Total: 0 };
            }

            const statusKey = doc.status;
            // Ensure the status key exists in the accumulator, otherwise default to Active
            if (acc[owner].hasOwnProperty(statusKey)) {
                acc[owner][statusKey]++;
            } else {
                acc[owner].Active++; // Default bucket
            }
            acc[owner].Total++;
            return acc;
        }, {});

        const matrixHTML = Object.entries(ownerGroups).map(([name, counts]) => `
            <tr class="hover-row">
                <td style="font-weight: 500; color: var(--gray-900);">${name}</td>
                <td>${counts.Active}</td>
                <td>${counts.Submitted > 0 ? `<span class="badge Submitted" style="font-size: 0.65rem;">${counts.Submitted}</span>` : '0'}</td>
                <td>${counts.Revised > 0 ? `<span class="badge Revised" style="font-size: 0.65rem;">${counts.Revised}</span>` : '0'}</td>
                <td>${counts.Completed > 0 ? `<span class="badge Completed" style="font-size: 0.65rem;">${counts.Completed}</span>` : '0'}</td>
                <td>${counts.Cancelled > 0 ? `<span class="badge Cancelled" style="font-size: 0.65rem;">${counts.Cancelled}</span>` : '0'}</td>
                <td style="font-weight: 700; color: var(--primary);">${counts.Total}</td>
            </tr>
        `).join('');

        if (matrixBody) { // Check if matrixBody exists before updating
            if (matrixHTML !== lastOwnerMatrixHTML) {
                matrixBody.innerHTML = matrixHTML;
                lastOwnerMatrixHTML = matrixHTML;
            }
        }
    } else if (adminSection) {
        adminSection.classList.add('hidden');
        adminSerialSection.classList.add('hidden');
        adminAgingSection.classList.add('hidden');
    }
}

async function renderReportsView() {
    const { data: docs, error } = await supabaseClient
        .from('documents') // This still fetches all documents for reports, consider aggregate queries for large datasets
        .select('title, category, status, created_at, period');
    
    if (error || !docs) return;

    // 1. Category Distribution
    const iaafCount = docs.filter(d => d.category === 'IAAF').length;
    const irCount = docs.filter(d => d.category === 'IR').length;
    const maxVal = Math.max(iaafCount, irCount, 1);

    document.getElementById('category-distribution-chart').innerHTML = `
        <div class="chart-row">
            <span class="chart-label">IAAF</span>
            <div class="chart-track"><div class="chart-fill" style="width: ${(iaafCount/maxVal)*100}%; background: #be185d;"></div></div>
            <span class="chart-label" style="text-align:left; width: 30px;">${iaafCount}</span>
        </div>
        <div class="chart-row">
            <span class="chart-label">IR</span>
            <div class="chart-track"><div class="chart-fill" style="width: ${(irCount/maxVal)*100}%; background: #0369a1;"></div></div>
            <span class="chart-label" style="text-align:left; width: 30px;">${irCount}</span>
        </div>
    `;

    // 2. Average Aging by Category
    const calcAvgAging = (category) => {
        const group = docs.filter(d => d.category === category);
        if (group.length === 0) return 0;
        const sum = group.reduce((acc, d) => acc + calculateAging(d.created_at), 0);
        return (sum / group.length).toFixed(1);
    };

    const iaafAging = calcAvgAging('IAAF');
    const irAging = calcAvgAging('IR');
    const maxAging = Math.max(iaafAging, irAging, 1);

    document.getElementById('aging-distribution-chart').innerHTML = `
        <div class="chart-row">
            <span class="chart-label">IAAF</span>
            <div class="chart-track"><div class="chart-fill" style="width: ${(iaafAging/maxAging)*100}%; background: #be185d;"></div></div>
            <span class="chart-label" style="text-align:left; width: 50px;">${iaafAging}d</span>
        </div>
        <div class="chart-row">
            <span class="chart-label">IR</span>
            <div class="chart-track"><div class="chart-fill" style="width: ${(irAging/maxAging)*100}%; background: #0369a1;"></div></div>
            <span class="chart-label" style="text-align:left; width: 50px;">${irAging}d</span>
        </div>
    `;

    // 3. Most Common Subjects
    const titleCounts = docs.reduce((acc, d) => {
        // Normalize title to group similar subjects (avoiding splits by case, owner names, or punctuation)
        let t = (d.title || 'Untitled').toLowerCase().trim();
        
        // Remove owner names if they are part of the subject line to prevent splitting by person
        const owners = ['jaime', 'darwin', 'dj', 'abi', 'marie', 'jhing', 'maria', 'nicole'];
        owners.forEach(o => t = t.replace(new RegExp(`\\b${o}\\b`, 'g'), ''));

        // Clean punctuation and extract significant keywords (first 3 words longer than 1 character)
        const words = t.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !['for', 'the', 'and', 'with'].includes(w));
        
        // Form a standardized keyword phrase (Title-Cased) for the chart display
        const keyword = words.slice(0, 3).join(' ');
        const displayTitle = keyword ? keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Standard Record';

        acc[displayTitle] = (acc[displayTitle] || 0) + 1;
        return acc;
    }, {});

    const sortedTitles = Object.entries(titleCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5); // Show top 5

    const maxSubjectFreq = sortedTitles.length > 0 ? sortedTitles[0][1] : 1;
    const subjectChart = document.getElementById('subject-frequency-chart');
    if (subjectChart) {
        subjectChart.innerHTML = sortedTitles.map(([title, count]) => `
            <div class="chart-row" title="${title}">
                <span class="chart-label" style="width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.7rem;">${title}</span>
                <div class="chart-track"><div class="chart-fill" style="width: ${(count/maxSubjectFreq)*100}%; background: var(--accent);"></div></div>
                <span class="chart-label" style="text-align:left; width: 30px;">${count}</span>
            </div>
        `).join('') || '<p style="color:var(--gray-400); font-size:0.8rem; padding: 1rem 0;">No recurring subjects found.</p>';
    }

    // 4. Daily Document Volume (Trend for the last 7 days with data)
    const dailyCounts = docs.reduce((acc, d) => {
        const dateKey = new Date(d.created_at).toISOString().split('T')[0];
        acc[dateKey] = (acc[dateKey] || 0) + 1;
        return acc;
    }, {});

    const sortedDateKeys = Object.keys(dailyCounts).sort().slice(-7);
    const maxDailyCount = sortedDateKeys.length > 0 ? Math.max(...sortedDateKeys.map(k => dailyCounts[k])) : 1;
    
    const dailyChart = document.getElementById('daily-volume-chart');
    if (dailyChart) {
        dailyChart.innerHTML = sortedDateKeys.map(key => {
            const count = dailyCounts[key];
            const displayDate = new Date(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return `
                <div class="chart-row">
                    <span class="chart-label" style="width: 70px;">${displayDate}</span>
                    <div class="chart-track"><div class="chart-fill" style="width: ${(count/maxDailyCount)*100}%; background: var(--info);"></div></div>
                    <span class="chart-label" style="text-align:left; width: 30px;">${count}</span>
                </div>
            `;
        }).join('') || '<p style="color:var(--gray-400); font-size:0.8rem; padding: 1rem 0;">No daily trend data found.</p>';
    }

    // 5. Monthly Summary Table
    const monthlyTableBody = document.querySelector('#monthly-summary-table tbody');
    const monthlyGroups = docs.reduce((acc, d) => {
        const month = d.period || 'Unknown';
        if (!acc[month]) acc[month] = { total: 0, iaaf: 0, ir: 0, completed: 0 };
        acc[month].total++;
        if (d.category === 'IAAF') acc[month].iaaf++;
        if (d.category === 'IR') acc[month].ir++;
        if (d.status === 'Completed') acc[month].completed++;
        return acc;
    }, {});
    monthlyGroupsCache = monthlyGroups; // Cache for export

    monthlyTableBody.innerHTML = Object.entries(monthlyGroups)
        .sort((a, b) => b[0].localeCompare(a[0])) // Sort by period descending
        .map(([month, data]) => {
            const rate = ((data.completed / data.total) * 100).toFixed(0);
            return `
                <tr>
                    <td style="font-weight: 600;">${month}</td>
                    <td style="text-align: center;">${data.total}</td>
                    <td style="text-align: center;">${data.iaaf}</td>
                    <td style="text-align: center;">${data.ir}</td>
                    <td style="text-align: center;">
                        <span class="badge" style="background: var(--gray-100); color: var(--gray-900);">${rate}% Done</span>
                    </td>
                </tr>
            `;
        }).join('');
}

async function renderProfileView(passedUser = null) {
    let user = passedUser;
    if (!user) {
        const { data: { user: authUser } } = await supabaseClient.auth.getUser();
        user = authUser;
    }
    if (!user) return;

    const role = currentUserRole || user.user_metadata?.role;
    
    document.getElementById('profile-email').value = user.email;
    document.getElementById('profile-role-display').innerText = role;

    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

    const fullName = profile?.full_name || user.email?.split('@')[0] || 'Account';
    const avatarUrl = profile?.avatar_url || '';

    document.getElementById('profile-full-name').value = fullName;
    document.getElementById('profile-name-display').innerText = fullName;
    document.getElementById('header-user-name').innerText = fullName;
    document.getElementById('header-user-role').innerText = role;

    const profileImg = document.getElementById('profile-avatar-img');
    const profilePh = document.getElementById('profile-avatar-placeholder');
    const headerImg = document.getElementById('header-avatar-img');
    const headerPh = document.getElementById('header-avatar-placeholder');

    if (avatarUrl) {
        if (profileImg) { profileImg.src = avatarUrl; profileImg.style.display = 'block'; }
        if (profilePh) profilePh.style.display = 'none';
        if (headerImg) { headerImg.src = avatarUrl; headerImg.style.display = 'block'; }
        if (headerPh) headerPh.style.display = 'none';
    } else {
        if (profileImg) profileImg.style.display = 'none';
        if (profilePh) profilePh.style.display = 'flex';
        if (headerImg) { headerImg.src = ''; headerImg.style.display = 'none'; }
        if (headerPh) headerPh.style.display = 'flex';
    }
}

async function updateProfile() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const fullName = document.getElementById('profile-full-name').value.trim();
    const btn = document.querySelector('#profile-form button[type="submit"]');
    
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Saving...';

    try {
        const { error } = await supabaseClient
            .from('profiles')
            .upsert({ 
                id: user.id, 
                full_name: fullName, 
                role: currentUserRole || user.user_metadata?.role || 'client',
                updated_at: new Date().toISOString() 
            });

        if (error) throw error;

        const displayName = fullName || user.email.split('@')[0];
        document.getElementById('profile-name-display').innerText = displayName;
        document.getElementById('header-user-name').innerText = displayName;
        showToast("Profile updated successfully!");
    } catch (err) {
        let msg = err.message;
        if (msg.includes("row-level security")) {
            msg = "Permission denied: Please check your Supabase 'profiles' table RLS policies (Insert/Update).";
        } else if (msg.includes("column") && msg.includes("schema cache")) {
            msg = "Database Error: A required column is missing in your 'profiles' table.";
        }
        showToast("Update failed: " + msg, "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined">save</span> Save Changes';
    }
}

window.exportReportsToCSV = () => {
    if (!monthlyGroupsCache || Object.keys(monthlyGroupsCache).length === 0) {
        alert("No data available to export.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,Period,Total Docs,IAAF,IR,Completion Rate\n";
    
    Object.entries(monthlyGroupsCache)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .forEach(([month, data]) => {
            const rate = ((data.completed / data.total) * 100).toFixed(0) + "%";
            csvContent += `${month},${data.total},${data.iaaf},${data.ir},${rate}\n`;
        });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `DocTrack_Monthly_Summary_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.exportRawDataToCSV = async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const startDate = document.getElementById('export-start-date').value;
    const endDate = document.getElementById('export-end-date').value;

    let query = supabaseClient.from('documents').select('*');
    
    // If not admin, only export their own docs
    const role = currentUserRole || user.user_metadata?.role;
    if (role !== 'admin') {
        query = query.eq('owner_id', user.id);
    }

    // Apply date range filters based on Document Date
    if (startDate) query = query.gte('doc_date', startDate);
    if (endDate) query = query.lte('doc_date', endDate);

    const { data: docs, error } = await query.order('created_at', { ascending: false });

    if (error || !docs || docs.length === 0) {
        alert("No document data found to export.");
        return;
    }

    const headers = ["Title", "Owner", "Category", "Control Number", "Status", "Period", "Week", "Date", "Created At"];
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n";

    docs.forEach(doc => {
        const row = [
            `"${(doc.title || '').replace(/"/g, '""')}"`,
            `"${(doc.owner_name || '').replace(/"/g, '""')}"`,
            `"${doc.category || ''}"`,
            `"${doc.control_number || ''}"`,
            `"${doc.status || ''}"`,
            `"${doc.period || ''}"`,
            `"${doc.week || ''}"`,
            `"${doc.doc_date || ''}"`,
            `"${doc.created_at || ''}"`
        ];
        csvContent += row.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `DocTrack_Raw_Data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// Realtime Subscription Logic
function initRealtimeSubscription(user) {
    if (realtimeSubscription) return;
    
    hideSplashScreen();

    realtimeSubscription = supabaseClient
        .channel('schema-db-changes')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'documents' }, 
            () => {
                if (currentUserRole === 'admin') {
                    renderAdminDashboard(true); // Silent refresh on realtime change
                } else {
                    renderClientDashboard(user.id, true); // Silent refresh on realtime change
                }
                // Automatically refresh dashboard stats on data changes
                if (currentSidebarView === 'dashboard') {
                    updateStatsDashboard();
                }
            })
        .subscribe();
}

// 3. Handle Logout
document.addEventListener('click', (e) => {
    if (e.target.closest('#logout-btn')) supabaseClient.auth.signOut();
});

async function showApp(user) {
    // Hide login screen and show the app
    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    hideSplashScreen();

    // Update header with initial user info from metadata
    const role = user.user_metadata?.role || 'user';
    const accountName = user.email?.split('@')[0] || 'Account';

    // Immediate UI update to prevent "User" showing during database load
    document.getElementById('header-user-name').innerText = accountName;
    document.getElementById('header-user-role').innerText = role;
    if (document.getElementById('profile-name-display')) document.getElementById('profile-name-display').innerText = accountName;
    if (document.getElementById('profile-role-display')) document.getElementById('profile-role-display').innerText = role;

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
                document.getElementById('header-user-role').innerText = currentUserRole;
            }
        } catch (err) {
            console.warn("Profile table fetch failed, falling back to metadata.", err);
        }
    }

    // Fetch and display profile info (name, avatar) in header
    await renderProfileView(user);

    // Default to the documents view on login
    await switchSidebarView('documents');

    // Initialize realtime syncing
    initRealtimeSubscription(user);

    // Stop any existing intervals; Realtime handles updates now
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
}

function showAuth() {
    authContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
    hideSplashScreen();
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    // Ensure we default to the login view when showing auth
    loginView.classList.remove('hidden');
    signupView.classList.add('hidden');
}

function calculateAging(dateInput) {
    if (!dateInput) return 0;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const created = new Date(dateInput);
    created.setHours(0, 0, 0, 0);
    const diffTime = now - created;
    const days = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return days < 0 ? 0 : days;
}

async function renderAdminDashboard(isSilent = false) {
    document.getElementById('admin-view').classList.remove('hidden');
    document.getElementById('client-view').classList.add('hidden');
    
    const topLoader = document.getElementById('top-loader');
    // Only show loader if it's not a background silent refresh to prevent "dancing"
    if (!isSilent && topLoader) topLoader.classList.add('loading');
    
    const tbody = document.querySelector('#admin-doc-table tbody');
    // Only show loading state if not a silent background refresh
    if (!isSilent) {
        tbody.innerHTML = `
        <tr>
            <td colspan="9">
                <div class="table-loader-content">
                    <div class="spinner spinner-dark"></div>
                    <span style="font-size: 0.875rem; color: var(--gray-600); font-weight: 500;">Fetching records...</span>
                </div>
            </td>
        </tr>`;
    }

    const adminPagination = document.getElementById('admin-pagination');
    adminPagination.innerHTML = '';

    document.querySelectorAll('#admin-view .tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.id === `admin-tab-${currentAdminTab}`);
    });

    let query = supabaseClient
        .from('documents') // Changed to select specific columns
        .select('*', { count: 'exact' });

    // Optimized filtering for Admin tabs
    if (!currentSearchTerm) {
        if (currentAdminTab === 'active') {
            query = query.eq('status', 'Active');
        } else if (currentAdminTab === 'submitted') {
            query = query.eq('status', 'Submitted');
        } else if (currentAdminTab === 'returned') {
            query = query.eq('status', 'Revised');
        } else if (currentAdminTab === 'completed') {
            query = query.eq('status', 'Completed');
        } else if (currentAdminTab === 'cancelled') {
            query = query.eq('status', 'Cancelled');
        }
    }

    // Apply Aging Bracket filter if active
    if (currentAdminAgingFilter && !currentSearchTerm) {
        // Ensure we only show pending/in-progress docs when filtering by aging
        query = query.not('status', 'in', '("Completed","Cancelled")');

        const now = new Date();
        if (currentAdminAgingFilter === '0-3 Days') {
            const limit = new Date();
            limit.setDate(limit.getDate() - 3);
            query = query.gte('doc_date', limit.toISOString().split('T')[0]);
        } else if (currentAdminAgingFilter === '4-7 Days') {
            const limit3 = new Date(); limit3.setDate(limit3.getDate() - 3);
            const limit7 = new Date(); limit7.setDate(limit7.getDate() - 7);
            query = query.lt('doc_date', limit3.toISOString().split('T')[0])
                         .gte('doc_date', limit7.toISOString().split('T')[0]);
        } else if (currentAdminAgingFilter === '8-11 Days') {
            const limit7 = new Date(); limit7.setDate(limit7.getDate() - 7);
            const limit11 = new Date(); limit11.setDate(limit11.getDate() - 11);
            query = query.lt('doc_date', limit7.toISOString().split('T')[0])
                         .gte('doc_date', limit11.toISOString().split('T')[0]);
        } else if (currentAdminAgingFilter === '12+ Days') {
            const limit11 = new Date(); limit11.setDate(limit11.getDate() - 11);
            query = query.lt('doc_date', limit11.toISOString().split('T')[0]);
        }
    }

    // Server-side filtering logic
    if (currentSearchTerm) {
        query = query.or(`title.ilike.%${currentSearchTerm}%,owner_name.ilike.%${currentSearchTerm}%,control_number.ilike.%${currentSearchTerm}%`);
    }

    if (currentStartDate) query = query.gte('doc_date', currentStartDate);
    if (currentEndDate) query = query.lte('doc_date', currentEndDate);

    const from = currentAdminPage * PAGE_SIZE; // Pagination
    const to = from + PAGE_SIZE - 1;

    const { data: docs, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

    if (topLoader) topLoader.classList.remove('loading');

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
        const filterLabel = (currentAdminAgingFilter && !currentSearchTerm) ? ` | Aging: ${currentAdminAgingFilter}` : '';
        const dateLabel = (currentStartDate || currentEndDate) ? ` | Date: ${currentStartDate || 'Any'} to ${currentEndDate || 'Today'}` : '';
        const searchLabel = currentSearchTerm ? ` | Search: "${currentSearchTerm}"` : '';
        const tabName = currentSearchTerm ? "SEARCH RESULTS" : currentAdminTab.toUpperCase();
        const statsHTML = `<span class="material-symbols-outlined">analytics</span> ${tabName} Documents${filterLabel}${dateLabel}${searchLabel} | Total: ${count || 0}`;
        
        if (statsHTML !== lastAdminStatsBarHTML) {
            statsBar.innerHTML = statsHTML;
            lastAdminStatsBarHTML = statsHTML;
        }
    }

    const hasDocs = docs && docs.length > 0;
    // Always keep table container visible to maintain structure
    document.querySelector('#admin-view .table-container')?.classList.remove('hidden');
    document.getElementById('no-results')?.classList.add('hidden');

    const newHTML = hasDocs ? docs.map(doc => {
        const aging = calculateAging(doc.doc_date || doc.created_at);
        const createdDate = doc.doc_date || new Date(doc.created_at).toLocaleDateString();
        const updatedDate = doc.updated_at ? new Date(doc.updated_at).toLocaleString() : 'N/A';
        
        // Color-code aging badge: 0-3 (Green), 4-7 (Blue), 8-11 (Orange/Pending), 12+ (Red)
        const agingClass = aging >= 12 ? 'Cancelled' : (aging >= 8 ? 'Revised' : (aging >= 4 ? 'Submitted' : 'Completed'));
        
        const detailLine = doc.category === 'IAAF' ? `${doc.adj_type || ''} | ${doc.amount_range || ''} | ${doc.charge_to || ''} | ${doc.reason_description || ''}` : 'Standard Record';
        const returnReasonHtml = (doc.status === 'Revised' && doc.return_reason) ? `<span class="doc-meta-detail" style="color: var(--danger); font-weight: 500;">Return Reason: ${doc.return_reason}</span>` : '';

        return `
        <tr>
            <td style="box-shadow: inset 5px 0 0 ${doc.category === 'IAAF' ? '#be185d' : '#0369a1'};">
                <div style="font-weight: 600;">${doc.title}</div>
                <span class="doc-meta-detail">${detailLine}</span>
                ${returnReasonHtml}
            </td>
            <td style="font-weight: 500; text-align: center; border-right: 1px solid var(--gray-200);">${doc.owner_name || '—'}</td>
            <td style="text-align: center;"><span class="badge ${doc.category === 'IAAF' ? 'iaaf-badge' : 'ir-badge'}">${doc.category || 'N/A'}</span></td>
            <td style="font-family: monospace; font-size: 0.85rem; text-align: center;">${doc.control_number || '—'}</td>
            <td style="text-align: center;"><span class="badge ${doc.status}">${doc.status}</span></td>
            <td class="col-meta" style="font-size: 0.75rem; text-align: center;">${createdDate}</td>
            <td class="col-meta" style="font-size: 0.75rem; text-align: center;">${updatedDate}</td>
            <td class="col-meta"><span class="badge ${agingClass}">${aging} Days</span></td>
            <td class="col-meta">
                <div class="action-btns">
                    <button class="icon-btn" onclick="receiveDocument('${doc.id}')" title="Mark Completed" 
                        ${doc.status === 'Completed' ? 'disabled style="opacity:0.3"' : ''}>
                        <span class="material-symbols-outlined">check_circle</span>
                    </button>
                    <button class="icon-btn" onclick="returnToClient('${doc.id}')" title="Return to Client"
                        ${doc.status === 'Completed' ? 'disabled style="opacity:0.3"' : ''}>
                        <span class="material-symbols-outlined">assignment_return</span>
                    </button>
                    <button class="icon-btn delete" onclick="deleteDocument('${doc.id}')" title="Delete"><span class="material-symbols-outlined">delete</span></button>
                </div>
            </td>
        </tr>
    `}).join('') : `
        <tr>
            <td colspan="9" style="text-align:center; padding: 4rem; color: var(--gray-400);">
                <span class="material-symbols-outlined" style="font-size: 3rem; opacity: 0.2; display: block; margin-bottom: 1rem;">search_off</span>
                ${currentSearchTerm ? 'No documents found matching your search.' : 'No documents available in this category.'}
            </td>
        </tr>`;

    if (newHTML !== lastAdminTableHTML) {
        tbody.innerHTML = newHTML;
        lastAdminTableHTML = newHTML;
    }

    renderPagination(count, currentAdminPage, 'admin');
}

async function renderClientDashboard(userId, isSilent = false) {
    document.getElementById('client-view').classList.remove('hidden');
    document.getElementById('admin-view').classList.add('hidden');

    const container = document.getElementById('client-doc-list');
    const topLoader = document.getElementById('top-loader');
    // Only show loader if it's not a background silent refresh to prevent "dancing"
    if (!isSilent && topLoader) topLoader.classList.add('loading');

    // Only show loading state if not a silent background refresh
    if (!isSilent) {
        container.innerHTML = `
        <tr>
            <td colspan="9">
                <div class="table-loader-content">
                    <div class="spinner spinner-dark"></div>
                    <span style="font-size: 0.875rem; color: var(--gray-600); font-weight: 500;">Loading your documents...</span>
                </div>
            </td>
        </tr>`;
    }


    const clientPagination = document.getElementById('client-pagination');
    clientPagination.innerHTML = '';

    // Update active tab UI
    document.querySelectorAll('#client-view .tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.id === `client-tab-${currentClientTab}`);
    });

    let query = supabaseClient
        .from('documents') // Changed to select specific columns
        .select('*', { count: 'exact' })
        .eq('owner_id', userId);

    // Use a whitelist approach (.in) instead of a blacklist (.not.in) 
    // This is much more stable and prevents the "failed to parse filter" error
    if (!currentSearchTerm) {
        switch (currentClientTab) {
            case 'all':
                // No filter applied to status
                break;
            case 'cancelled':
                query = query.eq('status', 'Cancelled');
                break;
            case 'completed':
                query = query.eq('status', 'Completed');
                break;
            case 'submitted':
                query = query.eq('status', 'Submitted');
                break;
            case 'returned':
                query = query.eq('status', 'Revised');
                break;
            case 'active':
            default: 
                query = query.eq('status', 'Active');
                break;
        }
    }

    // Server-side filtering logic
    if (currentSearchTerm) {
        query = query.or(`title.ilike.%${currentSearchTerm}%,owner_name.ilike.%${currentSearchTerm}%,control_number.ilike.%${currentSearchTerm}%`);
    }

    if (currentStartDate) query = query.gte('doc_date', currentStartDate);
    if (currentEndDate) query = query.lte('doc_date', currentEndDate);

    const from = currentClientPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data: docs, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

    if (topLoader) topLoader.classList.remove('loading');

    if (error) {
        console.error("Client Fetch Error:", error.message);
        let errorMsg = error.message;
        container.innerHTML = `<tr><td colspan="9" style="text-align:center; color: #e11d48; padding: 1rem;">Error: ${errorMsg}</td></tr>`;
        return;
    }

    const hasDocs = docs && docs.length > 0;
    // Always keep table container visible to maintain structure
    document.querySelector('#client-view .table-container')?.classList.remove('hidden');
    document.getElementById('no-results')?.classList.add('hidden');

    const newHTML = hasDocs ? docs.map(doc => {
        const aging = calculateAging(doc.doc_date || doc.created_at);
        const createdDate = doc.doc_date || new Date(doc.created_at).toLocaleDateString();
        const updatedDate = doc.updated_at ? new Date(doc.updated_at).toLocaleString() : 'N/A';
        const agingClass = aging >= 12 ? 'Cancelled' : (aging >= 8 ? 'Revised' : (aging >= 4 ? 'Submitted' : 'Completed'));
        const detailLine = doc.category === 'IAAF' ? `${doc.adj_type || ''} | ${doc.amount_range || ''} | ${doc.charge_to || ''} | ${doc.reason_description || ''}` : 'Standard Record';
        const returnReasonHtml = (doc.status === 'Revised' && doc.return_reason) ? `<span class="doc-meta-detail" style="color: var(--danger); font-weight: 500;">Return Reason: ${doc.return_reason}</span>` : '';

        return `
        <tr>
            <td style="box-shadow: inset 5px 0 0 ${doc.category === 'IAAF' ? '#be185d' : '#0369a1'};">
                <div style="font-weight: 600;">${doc.title}</div>
                <span class="doc-meta-detail">${detailLine}</span>
                ${returnReasonHtml}
            </td>
            <td style="font-weight: 500; text-align: center; border-right: 1px solid var(--gray-200);">${doc.owner_name || '—'}</td>
            <td style="text-align: center;"><span class="badge ${doc.category === 'IAAF' ? 'iaaf-badge' : 'ir-badge'}">${doc.category || 'N/A'}</span></td>
            <td style="font-family: monospace; font-size: 0.85rem; text-align: center;">${doc.control_number || '—'}</td>
            <td style="text-align: center;"><span class="badge ${doc.status}">${doc.status}</span></td>
            <td class="col-meta" style="font-size: 0.75rem; text-align: center;">${createdDate}</td>
            <td class="col-meta" style="font-size: 0.75rem; text-align: center;">${updatedDate}</td>
            <td class="col-meta"><span class="badge ${agingClass}">${aging} Days</span></td>
            <td class="col-meta">
                <div class="action-btns">
                    <button class="icon-btn" onclick="editDocument('${doc.id}')" title="Edit" 
                        ${doc.status === 'Submitted' || doc.status === 'Completed' ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
                        <span class="material-symbols-outlined" style="font-size: 1.2rem;">edit</span>
                    </button>
                    <button class="icon-btn" onclick="submitToAdmin('${doc.id}')" title="Submit to Admin"
                        ${doc.status === 'Submitted' || doc.status === 'Completed' ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
                        <span class="material-symbols-outlined" style="font-size: 1.2rem;">send</span>
                    </button>
                </div>
            </td>
        </tr>
    `}).join('') : `
        <tr>
            <td colspan="9" style="text-align:center; padding: 4rem; color: var(--gray-400);">
                <span class="material-symbols-outlined" style="font-size: 3rem; opacity: 0.2; display: block; margin-bottom: 1rem;">description</span>
                ${currentSearchTerm ? 'No documents found matching your search.' : 'You have no documents in this tab.'}
            </td>
        </tr>`;

    if (newHTML !== lastClientTableHTML) {
        container.innerHTML = newHTML;
        lastClientTableHTML = newHTML;
    }

    renderPagination(count, currentClientPage, 'client');
}

function renderPagination(totalCount, currentPage, type) {
    const container = document.getElementById(`${type}-pagination`);
    if (!container) return;

    if (!totalCount || totalCount <= PAGE_SIZE) {
        container.classList.add('hidden');
        container.innerHTML = '';
        return;
    }
    container.classList.remove('hidden');

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);
    
    container.innerHTML = `
        <button class="page-btn" ${currentPage === 0 ? 'disabled' : ''} id="${type}-first" title="First Page">
            <span class="material-symbols-outlined">first_page</span>
        </button>
        <button class="page-btn" ${currentPage === 0 ? 'disabled' : ''} id="${type}-prev">
            <span class="material-symbols-outlined">chevron_left</span>
        </button>
        <span class="page-info">Page ${currentPage + 1} of ${totalPages}</span>
        <button class="page-btn" ${currentPage >= totalPages - 1 ? 'disabled' : ''} id="${type}-next">
            <span class="material-symbols-outlined">chevron_right</span>
        </button>
        <button class="page-btn" ${currentPage >= totalPages - 1 ? 'disabled' : ''} id="${type}-last" title="Last Page">
            <span class="material-symbols-outlined">last_page</span>
        </button>
    `;

    const updatePage = async (newPage) => {
        if (type === 'admin') {
            currentAdminPage = newPage;
            await renderAdminDashboard();
        } else {
            currentClientPage = newPage;
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session) await renderClientDashboard(session.user.id);
        }
    };

    document.getElementById(`${type}-first`).onclick = () => updatePage(0);
    document.getElementById(`${type}-prev`).onclick = () => updatePage(currentPage - 1);
    document.getElementById(`${type}-next`).onclick = () => updatePage(currentPage + 1);
    document.getElementById(`${type}-last`).onclick = () => updatePage(totalPages - 1);
}

// Global function for admin actions
window.updateStatus = async (id, status, customMsg = null, extraData = {}) => {
    try {
        const updatePayload = { 
            status, 
            updated_at: new Date().toISOString(),
            ...extraData 
        };
        const { error: updateError } = await supabaseClient
            .from('documents')
            .update(updatePayload)
            .eq('id', id);
        
        if (updateError) throw updateError;

        showToast(customMsg || `Status updated: ${status}`);
        
        // Targeted refresh instead of full app reset
        const { data: sessionData } = await supabaseClient.auth.getSession();
        const user = sessionData?.session?.user;
        if (user) {
            // Use metadata as fallback if local role variable is not set
            const role = currentUserRole || user.user_metadata?.role;
            if (role === 'admin') {
                await renderAdminDashboard();
            } else {
                await renderClientDashboard(user.id);
            }
            if (currentSidebarView === 'dashboard') await updateStatsDashboard();
        }
        return true; // Return success status
    } catch (err) {
        showToast("Update failed: " + err.message, "error");
        return false;
    }
};

window.submitToAdmin = async (id) => {
    if (!confirm("Are you sure you want to submit this document for review?")) return;
    
    await updateStatus(id, 'Submitted', 'Successfully submitted to Admin!');
};

window.receiveDocument = async (id) => {
    if (!confirm("Mark this document as Completed?")) return;
    await updateStatus(id, 'Completed');
};

window.filterByAging = async (label) => {
    currentAdminAgingFilter = label;
    currentStartDate = '';
    currentEndDate = '';
    document.querySelectorAll('.dashboard-date-filter').forEach(input => input.value = '');
    currentAdminTab = 'all'; // Show all in-progress monitoring across all categories
    currentAdminPage = 0;
    await switchSidebarView('documents');
};

window.filterByOwnerAging = async (ownerName) => {
    currentAdminAgingFilter = null;
    currentStartDate = '';
    currentEndDate = '';
    document.querySelectorAll('.dashboard-date-filter').forEach(input => input.value = '');
    currentAdminTab = 'all';
    currentAdminPage = 0;
    currentSearchTerm = ownerName;

    // Sync Search UI across the application
    document.querySelectorAll('.dashboard-search').forEach(input => {
        input.value = ownerName;
    });
    document.querySelectorAll('.clear-search-btn').forEach(btn => {
        btn.classList.remove('hidden');
    });

    await switchSidebarView('documents');
};

window.setSerialRange = (start) => {
    currentSerialStart = start;
    updateStatsDashboard();
};

async function renderDocDetailsView() {
    const tbody = document.getElementById('details-excel-tbody');
    if (!tbody) return;

    const { data: docs, error } = await supabaseClient
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        showToast("Error fetching details: " + error.message, "error");
        return;
    }

    tbody.innerHTML = docs.map(doc => {
        const dateObj = new Date(doc.created_at);
        return `
            <tr>
                <td>${doc.period || ''}</td>
                <td>${doc.week || ''}</td>
                <td>${doc.doc_date || dateObj.toLocaleDateString()}</td>
                <td>${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td>${doc.category === 'IAAF' ? (doc.control_number || '') : ''}</td>
                <td>${doc.category === 'IR' ? (doc.control_number || '') : ''}</td>
                <td>—</td> <!-- DC Code Placeholder -->
                <td>—</td> <!-- SKU Code Placeholder -->
                <td>${doc.reason_description || 'Standard Document'}</td>
                <td>1</td> <!-- Qty Placeholder -->
                <td>—</td> <!-- Unit Cost Placeholder -->
                <td>—</td> <!-- Total Unit Cost Placeholder -->
                <td>—</td> <!-- Retail Cost Placeholder -->
                <td>—</td> <!-- Total Retail Cost Placeholder -->
                <td>${doc.adj_type || ''}</td>
                <td>${doc.reason_code || ''}</td>
                <td>${doc.reason_description || ''}</td>
                <td>${doc.title}</td>
                <td><span class="badge ${doc.status}">${doc.status}</span></td>
                <td>Pending</td> <!-- Wins Status Placeholder -->
                <td>${doc.status}</td>
                <td>${doc.owner_name}</td>
                <td>Admin</td>
                <td>${new Date(doc.updated_at || doc.created_at).toLocaleString()}</td>
            </tr>
        `;
    }).join('');
}
