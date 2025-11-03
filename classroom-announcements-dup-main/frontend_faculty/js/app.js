const API_URL = 'http://localhost:5000/api';
const CLASSROOM_ID = 'IT-314';

let allAnnouncements = [];
let currentSearch = '';
let importantFilterActive = false;
let urgentFilterActive = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadAnnouncements();
    
    const form = document.getElementById('announcementForm');
    if (form) {
        form.addEventListener('submit', createAnnouncement);
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchAnnouncements();
        });
    }
});

// Load all announcements
async function loadAnnouncements() {
    showLoading(true);
    try {
        const res = await fetch(`${API_URL}/announcements/classroom/${CLASSROOM_ID}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
            allAnnouncements = data.data;
            displayAnnouncements(allAnnouncements);
        }
    } catch (err) {
        console.error('Error loading announcements:', err);
        alert('Failed to load announcements');
    } finally {
        showLoading(false);
    }
}

// Display announcements
function displayAnnouncements(announcements) {
    const container = document.getElementById('announcements');
    if (!container) return;

    if (!announcements.length) {
        container.innerHTML = '<p style="text-align:center; color:#888; padding: 40px;">No announcements yet.</p>';
        return;
    }

    container.innerHTML = announcements.map(ann => `
        <div class="announcement-card ${ann.isPinned ? 'pinned' : ''} ${ann.isUrgent ? 'urgent' : ''} ${ann.isImportant ? 'important' : ''}" data-id="${ann._id}">
            <div class="announcement-header">
                <div>
                    <h3 class="announcement-title">${ann.title}</h3>
                    <div class="badges">
                        ${ann.isPinned ? '<span class="badge badge-pinned">📌 PINNED</span>' : ''}
                        ${ann.isUrgent ? '<span class="badge badge-urgent">🔴 URGENT</span>' : ''}
                        ${ann.isImportant ? '<span class="badge badge-important">⭐ IMPORTANT</span>' : ''}
                    </div>
                </div>
            </div>
            <div class="announcement-meta">
                ${ann.authorName} • ${ann.authorRole} • ${formatDate(ann.createdAt)}
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
                        ${ann.link.text || 'View Link'} →
                    </a>
                </div>
            ` : ''}
            
            <div class="action-buttons">
                <button class="action-btn" onclick="editInPlace('${ann._id}')">Edit</button>
                <button class="action-btn" onclick="togglePin('${ann._id}', ${ann.isPinned})">${ann.isPinned ? 'Unpin' : 'Pin'}</button>
                <button class="action-btn delete" onclick="deleteAnnouncement('${ann._id}')">Delete</button>
                <button class="action-btn" onclick="showActivityLog('${ann._id}')">Activity Log</button>
            </div>
        </div>
    `).join('');
}

// Create new announcement
async function createAnnouncement(e) {
    e.preventDefault();
    
    const linkUrl = document.getElementById('linkUrl').value.trim();
    const linkText = document.getElementById('linkText').value.trim();

    const announcementData = {
        title: document.getElementById('title').value,
        content: document.getElementById('content').value,
        authorName: 'Prof. Saurabh Tiwari',
        authorRole: 'Instructor',
        classroomId: CLASSROOM_ID,
        subject: 'Software Engineering',
        isImportant: document.getElementById('isImportant').checked,
        isUrgent: document.getElementById('isUrgent').checked,
        isPinned: document.getElementById('isPinned').checked,
        tags: document.getElementById('tags').value.split(',').map(t => t.trim()).filter(t => t),
        link: linkUrl ? { url: linkUrl, text: linkText || 'View Link' } : undefined
    };

    try {
        const res = await fetch(`${API_URL}/announcements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(announcementData)
        });
        const data = await res.json();
        if (data.success) {
            alert('Announcement posted successfully!');
            document.getElementById('announcementForm').reset();
            loadAnnouncements();
        } else {
            alert('Failed to post announcement: ' + data.message);
        }
    } catch (err) {
        console.error('Error creating announcement:', err);
        alert('Failed to post announcement');
    }
}

// Search announcements
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
        updateFilterButtons();
    } catch (err) {
        console.error('Error searching:', err);
        alert('Failed to search announcements');
    } finally {
        showLoading(false);
    }
}

// Filter Important
function filterImportant() {
    importantFilterActive = !importantFilterActive;
    if (importantFilterActive) urgentFilterActive = false; // Disable other filter
    updateFilterButtons();
    searchAnnouncements();
}

// Filter Urgent
function filterUrgent() {
    urgentFilterActive = !urgentFilterActive;
    if (urgentFilterActive) importantFilterActive = false; // Disable other filter
    updateFilterButtons();
    searchAnnouncements();
}

// Clear all filters
function clearFilters() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    currentSearch = '';
    importantFilterActive = false;
    urgentFilterActive = false;
    updateFilterButtons();
    displayAnnouncements(allAnnouncements);
}

// Update filter button states
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

// In-place edit
function editInPlace(id) {
    const card = document.querySelector(`[data-id="${id}"]`);
    if (!card) return;

    const titleEl = card.querySelector('.announcement-title');
    const contentEl = card.querySelector('.announcement-content');
    
    const currentTitle = titleEl.textContent;
    const currentContent = contentEl.textContent;

    // UPDATED: Create larger, full-width inputs
    titleEl.innerHTML = `<input type="text" value="${currentTitle}" class="inplace-edit-row" id="edit-title-${id}" style="min-height: auto;">`;
    contentEl.innerHTML = `<textarea class="inplace-edit-row" id="edit-content-${id}" rows="8" style="min-height: 200px;">${currentContent}</textarea>`;

    const actionsHTML = `
        <div class="inplace-edit-actions">
            <button class="btn-secondary" onclick="loadAnnouncements()">Cancel</button>
            <button class="btn-primary" onclick="saveEdit('${id}')">Save Changes</button>
        </div>
    `;
    
    const actionsDiv = card.querySelector('.action-buttons');
    if (actionsDiv) actionsDiv.innerHTML = actionsHTML;
}


// Save edit
async function saveEdit(id) {
    const newTitle = document.getElementById(`edit-title-${id}`).value;
    const newContent = document.getElementById(`edit-content-${id}`).value;

    try {
        const res = await fetch(`${API_URL}/announcements/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: newTitle,
                content: newContent,
                editorName: 'Prof. Saurabh Tiwari',
                editorRole: 'Instructor'
            })
        });
        const data = await res.json();
        if (data.success) {
            alert('Announcement updated successfully!');
            loadAnnouncements();
        } else {
            alert('Failed to update: ' + data.message);
        }
    } catch (err) {
        console.error('Error updating:', err);
        alert('Failed to update announcement');
    }
}

// Toggle pin
async function togglePin(id, currentlyPinned) {
    try {
        const res = await fetch(`${API_URL}/announcements/${id}/pin`, {
            method: 'PATCH'
        });
        const data = await res.json();
        if (data.success) {
            loadAnnouncements();
        } else {
            alert('Failed to toggle pin: ' + data.message);
        }
    } catch (err) {
        console.error('Error toggling pin:', err);
        alert('Failed to toggle pin');
    }
}

// Delete announcement
async function deleteAnnouncement(id) {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
        const res = await fetch(`${API_URL}/announcements/${id}`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
            alert('Announcement deleted successfully');
            loadAnnouncements();
        } else {
            alert('Failed to delete: ' + data.message);
        }
    } catch (err) {
        console.error('Error deleting:', err);
        alert('Failed to delete announcement');
    }
}

// Show activity log
async function showActivityLog(id) {
    try {
        const res = await fetch(`${API_URL}/announcements/${id}/activity`);
        const data = await res.json();
        
        const modal = document.getElementById('activityModal');
        const content = document.getElementById('activityContent');
        
        if (data.success && data.data.length > 0) {
            content.innerHTML = data.data.map(act => `
                <div class="activity-entry">
                    <div class="activity-action">${act.action}</div>
                    <div class="activity-meta">
                        By: ${act.performedBy.name} (${act.performedBy.role})<br>
                        ${formatDate(act.timestamp)}
                    </div>
                </div>
            `).join('');
        } else {
            content.innerHTML = '<p style="color:#888;">No activity recorded yet.</p>';
        }
        
        modal.classList.add('show');
    } catch (err) {
        console.error('Error loading activity:', err);
        alert('Failed to load activity log');
    }
}

// Close activity modal
function closeActivityModal() {
    const modal = document.getElementById('activityModal');
    modal.classList.remove('show');
}

// Format date
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

// Show loading
function showLoading(isLoading) {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.style.display = isLoading ? 'block' : 'none';
}
