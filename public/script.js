// Global variables
let allMovies = [];
let filteredMovies = [];
let currentPage = 1;
const moviesPerPage = 12;

// DOM elements
const movieGrid = document.getElementById('movieGrid');
const searchInput = document.getElementById('searchInput');
const loading = document.getElementById('loading');
const noResults = document.getElementById('noResults');
const menuToggle = document.getElementById('menuToggle');
const navMenu = document.getElementById('navMenu');
const searchBtn = document.querySelector('.search-btn');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    fetchMovies();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    searchBtn.addEventListener('click', handleSearch);
    
    // Mobile menu toggle
    menuToggle.addEventListener('click', toggleMobileMenu);
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!navMenu.contains(e.target) && !menuToggle.contains(e.target)) {
            navMenu.classList.remove('active');
            menuToggle.classList.remove('active');
        }
    });
    
    // Dropdown functionality
    setupDropdowns();
}

// Setup dropdown menus
function setupDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        const menu = dropdown.querySelector('.dropdown-menu');
        
        if (toggle && menu) {
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                // Close other dropdowns
                dropdowns.forEach(otherDropdown => {
                    if (otherDropdown !== dropdown) {
                        otherDropdown.querySelector('.dropdown-menu').style.opacity = '0';
                        otherDropdown.querySelector('.dropdown-menu').style.visibility = 'hidden';
                    }
                });
                
                // Toggle current dropdown
                const isVisible = menu.style.opacity === '1';
                menu.style.opacity = isVisible ? '0' : '1';
                menu.style.visibility = isVisible ? 'hidden' : 'visible';
            });
        }
    });
}

// Toggle mobile menu
function toggleMobileMenu() {
    navMenu.classList.toggle('active');
    menuToggle.classList.toggle('active');
}

// Fetch movies from API
async function fetchMovies() {
    try {
        showLoading(true);
        const response = await fetch('/api/movies');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const movies = await response.json();
        allMovies = movies;
        filteredMovies = movies;
        
        displayMovies();
        setupPagination();
        
    } catch (error) {
        console.error('Error fetching movies:', error);
        showError('Failed to load movies. Please try again later.');
    } finally {
        showLoading(false);
    }
}

// Display movies in grid
function displayMovies() {
    if (filteredMovies.length === 0) {
        showNoResults(true);
        movieGrid.innerHTML = '';
        return;
    }
    
    showNoResults(false);
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * moviesPerPage;
    const endIndex = startIndex + moviesPerPage;
    const moviesToShow = filteredMovies.slice(startIndex, endIndex);
    
    // Generate movie cards HTML
    const moviesHTML = moviesToShow.map(movie => createMovieCard(movie)).join('');
    movieGrid.innerHTML = moviesHTML;
    
    // Add click event listeners to movie cards
    addMovieCardListeners();
}

// Create individual movie card HTML
function createMovieCard(movie) {
    const posterUrl = movie.posterUrl || 'https://via.placeholder.com/300x450/cccccc/666666?text=No+Image';
    const title = movie.title || 'Untitled';
    const description = movie.description || 'No description available.';
    const year = movie.year ? `(${movie.year})` : '';
    const rating = movie.rating ? movie.rating.toFixed(1) : null;
    const genre = movie.genre || '';
    
    return `
        <div class="movie-card" data-movie-id="${movie.id}">
            <img src="${posterUrl}" alt="${title}" class="movie-poster" loading="lazy" onerror="this.src='https://via.placeholder.com/300x450/cccccc/666666?text=No+Image'">
            <div class="movie-info">
                <h3 class="movie-title">${title} ${year}</h3>
                <p class="movie-description">${truncateText(description, 150)}</p>
                <div class="movie-meta">
                    ${rating ? `<span class="movie-rating">★ ${rating}</span>` : ''}
                    ${genre ? `<span>${genre}</span>` : ''}
                    ${movie.uploadDate ? `<span>Added: ${formatDate(movie.uploadDate)}</span>` : ''}
                </div>
            </div>
        </div>
    `;
}

// Add click event listeners to movie cards
function addMovieCardListeners() {
    const movieCards = document.querySelectorAll('.movie-card');
    movieCards.forEach(card => {
        card.addEventListener('click', function() {
            const movieId = this.dataset.movieId;
            const movie = allMovies.find(m => m.id == movieId);
            if (movie) {
                showMovieDetails(movie);
            }
        });
    });
}

// Show movie details (placeholder for future implementation)
function showMovieDetails(movie) {
    alert(`Movie: ${movie.title}\n\nDescription: ${movie.description || 'No description available.'}\n\nThis feature will be enhanced in future updates.`);
}

// Handle search functionality
function handleSearch() {
    const query = searchInput.value.toLowerCase().trim();
    
    if (query === '') {
        filteredMovies = allMovies;
    } else {
        filteredMovies = allMovies.filter(movie => 
            movie.title.toLowerCase().includes(query) ||
            (movie.description && movie.description.toLowerCase().includes(query)) ||
            (movie.genre && movie.genre.toLowerCase().includes(query))
        );
    }
    
    currentPage = 1;
    displayMovies();
    setupPagination();
}

// Setup pagination
function setupPagination() {
    const totalPages = Math.ceil(filteredMovies.length / moviesPerPage);
    const paginationContainer = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    paginationContainer.style.display = 'flex';
    
    // Update pagination buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const paginationNumbers = document.getElementById('paginationNumbers');
    
    // Previous button
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            displayMovies();
            setupPagination();
            scrollToTop();
        }
    };
    
    // Next button
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            displayMovies();
            setupPagination();
            scrollToTop();
        }
    };
    
    // Page numbers
    paginationNumbers.innerHTML = generatePaginationNumbers(currentPage, totalPages);
    
    // Add click listeners to page numbers
    const pageNumbers = paginationNumbers.querySelectorAll('.page-number');
    pageNumbers.forEach(pageNum => {
        pageNum.addEventListener('click', function() {
            const page = parseInt(this.textContent);
            if (page && page !== currentPage) {
                currentPage = page;
                displayMovies();
                setupPagination();
                scrollToTop();
            }
        });
    });
}

// Generate pagination numbers HTML
function generatePaginationNumbers(current, total) {
    let html = '';
    
    if (total <= 7) {
        // Show all pages if total is 7 or less
        for (let i = 1; i <= total; i++) {
            html += `<span class="page-number ${i === current ? 'active' : ''}">${i}</span>`;
        }
    } else {
        // Show first page
        html += `<span class="page-number ${1 === current ? 'active' : ''}">1</span>`;
        
        if (current > 3) {
            html += '<span class="page-dots">...</span>';
        }
        
        // Show pages around current
        const start = Math.max(2, current - 1);
        const end = Math.min(total - 1, current + 1);
        
        for (let i = start; i <= end; i++) {
            html += `<span class="page-number ${i === current ? 'active' : ''}">${i}</span>`;
        }
        
        if (current < total - 2) {
            html += '<span class="page-dots">...</span>';
        }
        
        // Show last page
        html += `<span class="page-number ${total === current ? 'active' : ''}">${total}</span>`;
    }
    
    return html;
}

// Utility functions
function showLoading(show) {
    loading.style.display = show ? 'block' : 'none';
}

function showNoResults(show) {
    noResults.style.display = show ? 'block' : 'none';
}

function showError(message) {
    movieGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 50px; color: #e74c3c;">
            <h3>Error</h3>
            <p>${message}</p>
            <button onclick="fetchMovies()" style="margin-top: 20px; padding: 10px 20px; background: #f39c12; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Try Again
            </button>
        </div>
    `;
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

// Add some sample movies if none exist (for demo purposes)
function addSampleMovies() {
    const sampleMovies = [
        {
            id: 1,
            title: "Happy Gilmore 2",
            posterUrl: "https://uhdmovies.cat/wp-content/uploads/Download-Happy-Gilmore-2-270x405.jpg",
            description: "Download Happy Gilmore 2 (2025) Dual Audio {Hindi-English} 2160p || 4K HDR || 4K SDR || 1080p || x264 WEB-DL Esubs",
            year: 2025,
            genre: "Comedy",
            rating: 7.2
        },
        {
            id: 2,
            title: "Lamborghini: The Man Behind the Legend",
            posterUrl: "https://uhdmovies.cat/wp-content/uploads/Download-Lamborghini-The-Man-Behind-the-Legend-270x405.jpg",
            description: "Download Lamborghini: The Man Behind the Legend (2022) Dual Audio {Hindi-English} 1080p || 1080p 10bit || x264 || REMUX Blu-ray Esubs",
            year: 2022,
            genre: "Biography, Drama",
            rating: 6.8
        }
    ];
    
    // This would typically be handled by the backend
    console.log('Sample movies for demo:', sampleMovies);
}

// Initialize sample data if needed
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Development mode - you can uncomment this to add sample data
    // addSampleMovies();
}
