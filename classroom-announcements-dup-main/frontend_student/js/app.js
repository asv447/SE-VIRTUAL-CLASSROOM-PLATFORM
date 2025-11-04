const API_URL = 'http://localhost:5000/api';
const CLASSROOM_ID = 'IT-314';

let allAnnouncements = [];
let currentSearch = '';
let importantFilterActive = false;
let urgentFilterActive = false;

document.addEventListener('DOMContentLoaded', () => {
    loadAnnouncements();

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchAnnouncements();
        });
    }
});

async function loadAnnouncements() {
    showLoading(true);
    showError(false);

    try {
        const res = await fetch(`${API_URL}/announcements/classroom/${CLASSROOM_ID}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
            allAnnouncements = data.data;
            displayAnnouncements(allAnnouncements);
        } else {
            throw new Error();
        }
    } catch (err) {
        showError(true);
    } finally {
        showLoading(false);
    }
}

function displayAnnouncements(announcements) {
    const container = document.getElementById('announcements');
    
    if (!announcements.length) {
        container.innerHTML = '<p style="text-align:center; color:#888;">No announcements yet.</p>';
        return;
    }

    container.innerHTML = announcements.map(ann => `
        <div class="announcement-card ${ann.isPinned ? 'pinned' : ''} ${ann.isUrgent ? 'urgent' : ''} ${ann.isImportant ? 'important' : ''}">
            <div class="announcement-header">
                <h3 class="announcement-title">${ann.title}</h3>
                <div class="badges">
                    ${ann.isPinned ? '<span class="badge badge-pinned">PINNED</span>' : ''}
                    ${ann.isUrgent ? '<span class="badge badge-urgent">URGENT</span>' : ''}
                    ${ann.isImportant ? '<span class="badge badge-important">IMPORTANT</span>' : ''}
                </div>
            </div>
            <div class="announcement-meta">
                ${ann.authorName} • ${ann.subject} • ${formatDate(ann.createdAt)}
            </div>
            <div class="announcement-content">${ann.content}</div>

            ${ann.tags && ann.tags.length ? `
                <div class="tags">
                    ${ann.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            ` : ''}

            ${ann.link && ann.link.url ? `
                <div class="announcement-link">
                    <a href="${ann.link.url}" target="_blank" class="link-button">
                        ${ann.link.text || 'View Link'} >
                    </a>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// UPDATED: Search function with both filters
async function searchAnnouncements() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    currentSearch = searchTerm;

    let url = `${API_URL}/announcements/classroom/${CLASSROOM_ID}/search?`;
    if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;
    if (importantFilterActive) url += `important=true&`;
    if (urgentFilterActive) url += `urgent=true&`;

    showLoading(true);

    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data && Array.isArray(data.data)) {
            displayAnnouncements(data.data);
        } else {
            displayAnnouncements([]);
        }
        updateFilterButtons();  // UPDATED: plural
    } catch {
        showError(true);
    } finally {
        showLoading(false);
    }
}

// UPDATED: Important filter (disable urgent when active)
function filterImportant() {
    importantFilterActive = !importantFilterActive;
    if (importantFilterActive) urgentFilterActive = false;  // Only one at a time
    updateFilterButtons();
    searchAnnouncements();
}

// NEW: Urgent filter (disable important when active)
function filterUrgent() {
    urgentFilterActive = !urgentFilterActive;
    if (urgentFilterActive) importantFilterActive = false;  // Only one at a time
    updateFilterButtons();
    searchAnnouncements();
}

// UPDATED: Clear all filters
function clearFilters() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    currentSearch = '';
    importantFilterActive = false;
    urgentFilterActive = false;  // NEW
    updateFilterButtons();
    displayAnnouncements(allAnnouncements);
}

// UPDATED: Update both filter buttons
function updateFilterButtons() {
    const importantBtn = document.getElementById('importantFilter');
    const urgentBtn = document.getElementById('urgentFilter');
    
    if (importantBtn) {
        if (importantFilterActive) importantBtn.classList.add('active');
        else importantBtn.classList.remove('active');
    }
    
    if (urgentBtn) {
        if (urgentFilterActive) urgentBtn.classList.add('active');
        else urgentBtn.classList.remove('active');
    }
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} at ${hours}:${minutes}`;
}

function showLoading(isLoading) {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.style.display = isLoading ? 'block' : 'none';
}

function showError(isError) {
    const errorEl = document.getElementById('error');
    if (errorEl) errorEl.style.display = isError ? 'block' : 'none';
}

// Optional: Copy class code
function copyClassCode() {
    const codeEl = document.querySelector('.class-code');
    if (!codeEl) return;
    const code = codeEl.textContent;
    navigator.clipboard.writeText(code)
        .then(() => alert('Class code copied: ' + code))
        .catch(() => alert('Failed to copy class code.'));
}
