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
    btn.innerText = "Signing In...";

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
    btn.innerText = "Creating Account...";

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

    const { data: docs } = await supabaseClient
        .from('documents')
        .select(`*, profiles(email)`);

    const tbody = document.querySelector('#admin-doc-table tbody');
    tbody.innerHTML = docs ? docs.map(doc => `
        <tr>
            <td>${doc.title}</td>
            <td>${doc.profiles ? doc.profiles.email : 'Unknown'}</td>
            <td><span class="badge ${doc.status}">${doc.status}</span></td>
            <td>
                <button onclick="updateStatus('${doc.id}', 'approved')">Approve</button>
            </td>
        </tr>
    `).join('') : '';
}

async function renderClientDashboard(userId) {
    document.getElementById('client-view').classList.remove('hidden');
    document.getElementById('admin-view').classList.add('hidden');

    const { data: docs } = await supabaseClient
        .from('documents')
        .select('*')
        .eq('owner_id', userId);

    const container = document.getElementById('client-doc-list');
    container.innerHTML = docs ? docs.map(doc => `
        <div class="doc-card">
            <h3>${doc.title}</h3>
            <p>Status: <span class="badge ${doc.status}">${doc.status}</span></p>
        </div>
    `).join('') : '';
}

// Global function for admin actions
window.updateStatus = async (id, status) => {
    const { error } = await supabaseClient
        .from('documents')
        .update({ status })
        .eq('id', id);
    
    if (!error) location.reload();
};