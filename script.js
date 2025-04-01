// Configuration
const API_BASE_URL ="https://backend-code-savv.onrender.com"
const UPLOAD_PASSWORD = (process.env.UPLOAD_PASSWORD); // Should match your backend

// DOM Elements
const elements = {
    navButtons: document.querySelectorAll('nav button'),
    vlogGrid: document.querySelector('.vlogs-container'),
    uploadForm: document.getElementById('upload-form'),
    commentForms: document.querySelectorAll('.comment-form'),
    filterButtons: document.querySelectorAll('.filter-btn'),
    loadMoreBtn: document.getElementById('load-more'),
    modals: {
        upload: document.getElementById('upload-modal'),
        comment: document.getElementById('comment-modal')
    },
    closeButtons: document.querySelectorAll('.close-modal')
};

// State Management
let state = {
    vlogs: [],
    filteredVlogs: [],
    currentFilter: 'all',
    displayCount: 4,
    currentVlogId: null
};

// Initialize the application
async function init() {
    await fetchVlogs();
    setupEventListeners();
    renderVlogs();
}

// Fetch vlogs from backend
async function fetchVlogs() {
    try {
        const response = await fetch(`${API_BASE_URL}/vlogs`);
        if (!response.ok) throw new Error('Network response was not ok');
        state.vlogs = await response.json();
        state.filteredVlogs = [...state.vlogs];
    } catch (error) {
        console.error('Error fetching vlogs:', error);
        showToast('Failed to load vlogs. Please try again later.', 'error');
    }
}

// Render vlogs based on current state
function renderVlogs() {
    elements.vlogGrid.innerHTML = '';

    const vlogsToDisplay = state.filteredVlogs
        .slice(0, state.displayCount)
        .map(vlog => createVlogCard(vlog))
        .join('');

    elements.vlogGrid.innerHTML = vlogsToDisplay || 
        '<p class="no-vlogs">No vlogs found matching your criteria.</p>';

    // Update load more button visibility
    elements.loadMoreBtn.style.display = 
        state.displayCount >= state.filteredVlogs.length ? 'none' : 'block';
}

// Create HTML for a single vlog card
function createVlogCard(vlog) {
    return `
        <div class="vlog" data-id="${vlog._id}">
            <div class="vlog-media">
                ${vlog.mediaType === 'video' ? 
                    `<video controls>
                        <source src="${API_BASE_URL}/${vlog.mediaPath}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>` : 
                    `<img src="${API_BASE_URL}/${vlog.mediaPath}" alt="${vlog.title}">`}
            </div>
            <div class="vlog-content">
                <h3>${vlog.title}</h3>
                <p class="upload-date">${new Date(vlog.uploadDate).toLocaleDateString()}</p>
                <div class="vlog-actions">
                    <button class="view-comments" onclick="showComments('${vlog._id}')">
                        <i class="fas fa-comment"></i> ${vlog.comments.length} Comments
                    </button>
                    <button class="add-comment" onclick="openCommentModal('${vlog._id}')">
                        <i class="fas fa-plus"></i> Add Comment
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Filter vlogs by type
function filterVlogs(type) {
    state.currentFilter = type;
    state.displayCount = 4;
    
    state.filteredVlogs = type === 'all' 
        ? [...state.vlogs] 
        : state.vlogs.filter(vlog => vlog.mediaType === type);
    
    renderVlogs();
}

// Load more vlogs
function loadMoreVlogs() {
    state.displayCount += 4;
    renderVlogs();
}

// Show comments for a specific vlog
async function showComments(vlogId) {
    try {
        const response = await fetch(`${API_BASE_URL}/vlogs/${vlogId}`);
        if (!response.ok) throw new Error('Failed to fetch comments');
        
        const vlog = await response.json();
        const commentsHtml = vlog.comments.length > 0 
            ? vlog.comments.map(comment => `
                <div class="comment">
                    <strong>${comment.name}</strong>
                    <p>${comment.text}</p>
                    <small>${new Date(comment.date).toLocaleDateString()}</small>
                </div>
            `).join('')
            : '<p>No comments yet. Be the first to comment!</p>';
        
        // Display comments in modal
        elements.modals.comment.querySelector('.modal-content').innerHTML = `
            <h2>Comments for "${vlog.title}"</h2>
            <div class="comments-container">${commentsHtml}</div>
            <button onclick="closeModal('comment')">Close</button>
        `;
        
        openModal('comment');
    } catch (error) {
        console.error('Error showing comments:', error);
        showToast('Failed to load comments', 'error');
    }
}

// Handle comment submission
async function submitComment(event, vlogId) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const commentData = {
        name: formData.get('name'),
        text: formData.get('comment')
    };

    try {
        const response = await fetch(`${API_BASE_URL}/vlogs/${vlogId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(commentData)
        });

        if (!response.ok) throw new Error('Failed to submit comment');
        
        showToast('Comment added successfully!', 'success');
        form.reset();
        closeModal('comment');
        await fetchVlogs(); // Refresh the vlog list
        renderVlogs();
    } catch (error) {
        console.error('Error submitting comment:', error);
        showToast('Failed to add comment', 'error');
    }
}

// Handle vlog upload
async function uploadVlog(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    formData.append('password', UPLOAD_PASSWORD);

    try {
        const response = await fetch(`${API_BASE_URL}/vlogs`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }
        
        showToast('Vlog uploaded successfully!', 'success');
        form.reset();
        closeModal('upload');
        await fetchVlogs(); // Refresh the vlog list
        renderVlogs();
    } catch (error) {
        console.error('Error uploading vlog:', error);
        showToast(error.message || 'Failed to upload vlog', 'error');
    }
}

// Modal handling
function openModal(modalType) {
    elements.modals[modalType].style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal(modalType) {
    elements.modals[modalType].style.display = 'none';
    document.body.style.overflow = 'auto';
}

function openCommentModal(vlogId) {
    state.currentVlogId = vlogId;
    elements.modals.comment.querySelector('.modal-content').innerHTML = `
        <h2>Add Comment</h2>
        <form onsubmit="submitComment(event, '${vlogId}')">
            <div class="form-group">
                <label for="comment-name">Your Name</label>
                <input type="text" id="comment-name" name="name" required>
            </div>
            <div class="form-group">
                <label for="comment-text">Your Comment</label>
                <textarea id="comment-text" name="comment" required></textarea>
            </div>
            <button type="submit">Submit Comment</button>
        </form>
        <button onclick="closeModal('comment')">Cancel</button>
    `;
    openModal('comment');
}

// Toast notifications
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }, 100);
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    elements.navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const sectionId = button.getAttribute('onclick').match(/'([^']+)'/)[1];
            document.getElementById(sectionId).scrollIntoView({ behavior: 'smooth' });
        });
    });

    // Filter buttons
    elements.filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterVlogs(button.dataset.filter);
        });
    });

    // Load more button
    elements.loadMoreBtn.addEventListener('click', loadMoreVlogs);

    // Upload form
    elements.uploadForm.addEventListener('submit', uploadVlog);

    // Modal close buttons
    elements.closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            closeModal(modal.id.replace('-modal', ''));
        });
    });

    // Close modals when clicking outside
    Object.values(elements.modals).forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id.replace('-modal', ''));
            }
        });
    });
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Expose functions to global scope for HTML onclick attributes
window.showComments = showComments;
window.openCommentModal = openCommentModal;
window.submitComment = submitComment;
window.closeModal = closeModal;
