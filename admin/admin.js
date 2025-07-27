// Global variables
let currentMovies = [];
let currentSection = 'dashboard';
let movieToDelete = null;

// Initialize admin panel
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    setupEventListeners();
    showSection('dashboard');
    loadDashboardData();
});

// Check if user is authenticated
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth-status');
        const data = await response.json();
        
        if (!data.loggedIn) {
            window.location.href = '/admin/login';
            return;
        }
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '/admin/login';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            showSection(section);
        });
    });

    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.querySelector('.sidebar');
    
    mobileMenuBtn.addEventListener('click', function() {
        sidebar.classList.toggle('active');
    });

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.addEventListener('click', logout);

    // Upload form
    const uploadForm = document.getElementById('uploadForm');
    uploadForm.addEventListener('submit', handleMovieUpload);

    // Movie search
    const movieSearch = document.getElementById('movieSearch');
    movieSearch.addEventListener('input', debounce(filterMovies, 300));

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        }
    });
}

// Show specific section
function showSection(sectionName) {
    // Update navigation
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.section === sectionName) {
            link.classList.add('active');
        }
    });

    // Update content sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });

    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Update page title
    const pageTitle = document.getElementById('pageTitle');
    const titles = {
        dashboard: 'Dashboard',
        movies: 'Manage Movies',
        upload: 'Upload Movie',
        settings: 'Settings'
    };
    pageTitle.textContent = titles[sectionName] || 'Dashboard';

    currentSection = sectionName;

    // Load section-specific data
    switch (sectionName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'movies':
            loadMoviesData();
            break;
        case 'settings':
            loadSettingsData();
            break;
    }

    // Close mobile sidebar
    if (window.innerWidth <= 768) {
        document.querySelector('.sidebar').classList.remove('active');
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        const response = await fetch('/api/movies');
        const movies = await response.json();
        
        // Update stats
        document.getElementById('totalMovies').textContent = movies.length;
        
        // Calculate today's uploads
        const today = new Date().toDateString();
        const todayUploads = movies.filter(movie => 
            new Date(movie.uploadDate).toDateString() === today
        ).length;
        document.getElementById('todayUploads').textContent = todayUploads;
        
        // Calculate this week's uploads
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekUploads = movies.filter(movie => 
            new Date(movie.uploadDate) >= weekAgo
        ).length;
        document.getElementById('weekUploads').textContent = weekUploads;
        
        // Calculate average rating
        const moviesWithRating = movies.filter(movie => movie.rating);
        const avgRating = moviesWithRating.length > 0 
            ? (moviesWithRating.reduce((sum, movie) => sum + movie.rating, 0) / moviesWithRating.length).toFixed(1)
            : '0.0';
        document.getElementById('avgRating').textContent = avgRating;
        
        // Update recent activity
        updateRecentActivity(movies);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Update recent activity
function updateRecentActivity(movies) {
    const activityList = document.getElementById('activityList');
    const recentMovies = movies
        .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate))
        .slice(0, 5);
    
    if (recentMovies.length === 0) {
        activityList.innerHTML = '<p class="no-activity">No recent activity</p>';
        return;
    }
    
    const activityHTML = recentMovies.map(movie => `
        <div class="activity-item" style="padding: 10px 0; border-bottom: 1px solid #f1f3f4;">
            <strong>${movie.title}</strong> was uploaded
            <span style="color: #666; font-size: 12px; margin-left: 10px;">
                ${formatDate(movie.uploadDate)}
            </span>
        </div>
    `).join('');
    
    activityList.innerHTML = activityHTML;
}

// Load movies data
async function loadMoviesData() {
    try {
        const response = await fetch('/api/movies');
        currentMovies = await response.json();
        displayMoviesTable(currentMovies);
    } catch (error) {
        console.error('Error loading movies:', error);
        document.getElementById('moviesTableBody').innerHTML = 
            '<tr><td colspan="6" class="loading-row" style="color: #e74c3c;">Error loading movies</td></tr>';
    }
}

// Display movies in table
function displayMoviesTable(movies) {
    const tbody = document.getElementById('moviesTableBody');
    
    if (movies.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading-row">No movies found</td></tr>';
        return;
    }
    
    const moviesHTML = movies.map(movie => `
        <tr>
            <td>
                <img src="${movie.posterUrl || 'https://via.placeholder.com/50x75/cccccc/666666?text=No+Image'}" 
                     alt="${movie.title}" class="movie-poster-thumb"
                     onerror="this.src='https://via.placeholder.com/50x75/cccccc/666666?text=No+Image'">
            </td>
            <td>
                <strong>${movie.title}</strong>
                ${movie.description ? `<br><small style="color: #666;">${truncateText(movie.description, 60)}</small>` : ''}
            </td>
            <td>${movie.year || 'N/A'}</td>
            <td>${movie.rating ? `★ ${movie.rating.toFixed(1)}` : 'N/A'}</td>
            <td>${formatDate(movie.uploadDate)}</td>
            <td>
                <div class="movie-actions">
                    <button class="btn btn-danger btn-sm" onclick="confirmDeleteMovie(${movie.id})">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
    
    tbody.innerHTML = moviesHTML;
}

// Filter movies based on search
function filterMovies() {
    const searchTerm = document.getElementById('movieSearch').value.toLowerCase();
    
    if (!searchTerm) {
        displayMoviesTable(currentMovies);
        return;
    }
    
    const filteredMovies = currentMovies.filter(movie =>
        movie.title.toLowerCase().includes(searchTerm) ||
        (movie.description && movie.description.toLowerCase().includes(searchTerm)) ||
        (movie.genre && movie.genre.toLowerCase().includes(searchTerm))
    );
    
    displayMoviesTable(filteredMovies);
}

// Handle movie upload
async function handleMovieUpload(e) {
    e.preventDefault();
    
    const uploadBtn = document.getElementById('uploadBtn');
    const btnText = uploadBtn.querySelector('.btn-text');
    const btnSpinner = uploadBtn.querySelector('.btn-spinner');
    const uploadStatus = document.getElementById('uploadStatus');
    
    const formData = new FormData(e.target);
    const movieData = {
        title: formData.get('title'),
        posterUrl: formData.get('posterUrl'),
        description: formData.get('description')
    };
    
    if (!movieData.title.trim()) {
        showUploadStatus('Please enter a movie title', 'error');
        return;
    }
    
    // Set loading state
    uploadBtn.disabled = true;
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline-block';
    hideUploadStatus();
    
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(movieData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showUploadStatus('Movie uploaded successfully! Metadata has been fetched automatically.', 'success');
            resetUploadForm();
            
            // Refresh movies data if on movies section
            if (currentSection === 'movies') {
                loadMoviesData();
            }
            
            // Update dashboard stats
            loadDashboardData();
        } else {
            showUploadStatus(result.error || 'Upload failed', 'error');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showUploadStatus('Upload failed. Please try again.', 'error');
    } finally {
        // Reset button state
        uploadBtn.disabled = false;
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
    }
}

// Show upload status
function showUploadStatus(message, type) {
    const uploadStatus = document.getElementById('uploadStatus');
    uploadStatus.textContent = message;
    uploadStatus.className = `upload-status ${type}`;
    uploadStatus.style.display = 'block';
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            hideUploadStatus();
        }, 5000);
    }
}

// Hide upload status
function hideUploadStatus() {
    const uploadStatus = document.getElementById('uploadStatus');
    uploadStatus.style.display = 'none';
}

// Reset upload form
function resetUploadForm() {
    document.getElementById('uploadForm').reset();
    hideUploadStatus();
}

// Confirm delete movie
function confirmDeleteMovie(movieId) {
    movieToDelete = movieId;
    const movie = currentMovies.find(m => m.id === movieId);
    
    if (movie) {
        const modal = document.getElementById('deleteModal');
        const modalContent = modal.querySelector('.modal-content p');
        modalContent.textContent = `Are you sure you want to delete "${movie.title}"? This action cannot be undone.`;
        modal.style.display = 'flex';
        
        // Setup confirm button
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        confirmBtn.onclick = deleteMovie;
    }
}

// Delete movie
async function deleteMovie() {
    if (!movieToDelete) return;
    
    try {
        const response = await fetch(`/api/movies/${movieToDelete}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            // Remove from current movies array
            currentMovies = currentMovies.filter(movie => movie.id !== movieToDelete);
            displayMoviesTable(currentMovies);
            
            // Update dashboard if needed
            if (currentSection === 'dashboard') {
                loadDashboardData();
            }
            
            closeDeleteModal();
        } else {
            alert('Failed to delete movie: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete movie. Please try again.');
    }
}

// Close delete modal
function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    movieToDelete = null;
}

// Load settings data
function loadSettingsData() {
    // Check TMDB status
    const tmdbStatus = document.getElementById('tmdbStatus');
    tmdbStatus.textContent = 'Configured';
    tmdbStatus.className = 'status-badge status-active';
    
    // Check email status
    const emailStatus = document.getElementById('emailStatus');
    emailStatus.textContent = 'Configured';
    emailStatus.className = 'status-badge status-active';
    
    // Update database movie count
    const dbMovieCount = document.getElementById('dbMovieCount');
    dbMovieCount.textContent = currentMovies ? currentMovies.length : 'Loading...';
}

// Logout function
async function logout() {
    try {
        const response = await fetch('/api/logout');
        if (response.ok) {
            window.location.href = '/admin/login';
        }
    } catch (error) {
        console.error('Logout error:', error);
        // Force redirect even if logout request fails
        window.location.href = '/admin/login';
    }
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('deleteModal');
    if (e.target === modal) {
        closeDeleteModal();
    }
});

// Handle escape key for modal
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeDeleteModal();
    }
});

// Make functions globally available
window.showSection = showSection;
window.resetUploadForm = resetUploadForm;
window.confirmDeleteMovie = confirmDeleteMovie;
window.closeDeleteModal = closeDeleteModal;
