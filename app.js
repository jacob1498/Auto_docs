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

// Modal Logic
const modalOverlay = document.getElementById('modal-overlay');
const addDocForm = document.getElementById('add-doc-form');
const docTitleInput = document.getElementById('doc-title-input');
const charCounter = document.getElementById('char-counter');

document.getElementById('upload-trigger')?.addEventListener('click', () => {
    modalOverlay.classList.remove('hidden');
    docTitleInput.focus();
});

document.getElementById('close-modal')?.addEventListener('click', () => {
    modalOverlay.classList.add('hidden');
    addDocForm.reset();
    if (charCounter) charCounter.innerText = '0 / 50';
});

docTitleInput?.addEventListener('input', (e) => {
    const length = e.target.value.length;
    if (charCounter) charCounter.innerText = `${length} / 50`;
});

addDocForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const title = document.getElementById('doc-title-input').value.trim();

    if (title.length < 3) {
        alert("Title must be at least 3 characters long.");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Creating...';

    const { data: { user } } = await supabaseClient.auth.getUser();
    
    try {
        const { error } = await supabaseClient
            .from('documents')
            .insert([{ title, owner_id: user.id, status: 'pending' }]);

        if (error) throw error;

        modalOverlay.classList.add('hidden');
        addDocForm.reset();
        if (charCounter) charCounter.innerText = '0 / 50';
        showToast("Document added successfully!");
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
            // Background attempt to create profile record - capture error so it doesn't block UI
            const { error: pError } = await supabaseClient.from('profiles').insert([{ id: data.user.id, role }]);
            if (pError) console.warn("Profile table insert deferred (usually RLS/Confirmation issue):", pError.message);

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

    let role = user.user_metadata?.role;

    try {
        // Try to get the latest role from the database
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        
        if (profile && !error) {
            role = profile.role;
        }
    } catch (err) {
        console.warn("Profile table fetch failed, falling back to metadata.", err);
    }

    if (role === 'admin') {
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

async function renderAdminDashboard() {
    document.getElementById('admin-view').classList.remove('hidden');
    document.getElementById('client-view').classList.add('hidden');
    const sortBy = document.getElementById('sort-date').value;
    const filterStatus = document.getElementById('filter-status').value;

    let query = supabaseClient
        .from('documents')
        .select(`*, profiles(email)`);

    if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
    }

    const { data: docs } = await query.order('created_at', { ascending: sortBy === 'asc' });

    const tbody = document.querySelector('#admin-doc-table tbody');
    tbody.innerHTML = docs ? docs.map(doc => `
        <tr>
            <td>${doc.title}</td>
            <td>${doc.profiles ? doc.profiles.email : 'Unknown'}</td>
            <td><span class="badge ${doc.status}">${doc.status}</span></td>
            <td>
                <div class="action-btns">
                    <button onclick="updateStatus('${doc.id}', 'approved')" style="background: var(--primary); color: white;">Approve</button>
                    <button class="btn-danger" onclick="deleteDocument('${doc.id}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join('') : '';
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

    const { data: docs } = await query.order('created_at', { ascending: sortBy === 'asc' });

    const container = document.getElementById('client-doc-list');
    container.innerHTML = docs ? docs.map(doc => `
        <div class="doc-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div class="doc-icon">
                    <span class="material-symbols-outlined">description</span>
                </div>
                <span class="badge ${doc.status}">${doc.status}</span>
            </div>
            <div style="flex: 1;">
                <h3 style="margin: 0; font-size: 1.125rem;">${doc.title}</h3>
                <p style="font-size: 0.875rem; color: var(--gray-600); margin: 0;">Last updated: ${new Date(doc.created_at || Date.now()).toLocaleDateString()}</p>
            </div>
            <div class="card-actions" style="margin-top: 1rem; border-top: 1px solid var(--gray-100); padding-top: 1rem;">
                <button class="btn-danger" style="width: 100%;" onclick="deleteDocument('${doc.id}')">Delete Document</button>
            </div>
        </div>
    `).join('') : '';
}

// Global function for admin actions
window.updateStatus = async (id, status) => {
    const { error } = await supabaseClient
        .from('documents')
        .update({ status })
        .eq('id', id);
    
    if (!error) {
        showToast(`Document ${status}`);
        const { data: { user } } = await supabaseClient.auth.getUser();
        showApp(user);
    }
};
