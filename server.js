const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const nodemailer = require('nodemailer');
const config = require('./config/config');

const app = express();
const PORT = config.server.port;

// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Initialize SQLite database with enhanced schema
let db = new sqlite3.Database(config.database.filename, (err) => {
  if (err) {
    console.error("Database connection error:", err);
  } else {
    console.log("Connected to SQLite database.");
    
    // Create movies table
    db.run(`CREATE TABLE IF NOT EXISTS movies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      original_title TEXT,
      poster_url TEXT,
      backdrop_url TEXT,
      description TEXT,
      overview TEXT,
      release_date TEXT,
      year INTEGER,
      runtime INTEGER,
      genres TEXT,
      rating REAL,
      vote_count INTEGER,
      popularity REAL,
      tagline TEXT,
      imdb_id TEXT,
      tmdb_id INTEGER,
      download_links TEXT,
      trailer_url TEXT,
      type TEXT DEFAULT 'movie',
      status TEXT DEFAULT 'published',
      upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) console.error("Movies table creation error:", err);
    });

    // Create web_series table
    db.run(`CREATE TABLE IF NOT EXISTS web_series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      original_title TEXT,
      poster_url TEXT,
      backdrop_url TEXT,
      description TEXT,
      overview TEXT,
      first_air_date TEXT,
      year INTEGER,
      last_air_date TEXT,
      number_of_seasons INTEGER,
      number_of_episodes INTEGER,
      genres TEXT,
      rating REAL,
      vote_count INTEGER,
      popularity REAL,
      tagline TEXT,
      imdb_id TEXT,
      tmdb_id INTEGER,
      status TEXT DEFAULT 'published',
      upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) console.error("Web series table creation error:", err);
    });

    // Create episodes table
    db.run(`CREATE TABLE IF NOT EXISTS episodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      series_id INTEGER,
      season_number INTEGER,
      episode_number INTEGER,
      title TEXT,
      description TEXT,
      air_date TEXT,
      runtime INTEGER,
      poster_url TEXT,
      download_links TEXT,
      FOREIGN KEY (series_id) REFERENCES web_series(id)
    )`, (err) => {
      if (err) console.error("Episodes table creation error:", err);
    });

    // Create settings table
    db.run(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      description TEXT
    )`, (err) => {
      if (err) console.error("Settings table creation error:", err);
    });

    // Insert default settings
    const defaultSettings = [
      ['site_name', config.siteName, 'Website name'],
      ['site_tagline', config.siteTagline, 'Website tagline'],
      ['tmdb_api_key', '', 'TMDB API key'],
      ['email_notifications', 'true', 'Enable email notifications'],
      ['theme_primary', config.themes.primary, 'Primary theme color'],
      ['theme_secondary', config.themes.secondary, 'Secondary theme color']
    ];

    defaultSettings.forEach(([key, value, desc]) => {
      db.run(`INSERT OR IGNORE INTO settings (key, value, description) VALUES (?, ?, ?)`, 
        [key, value, desc]);
    });
  }
});

// Routes

// Homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Movies page
app.get('/movies', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/movies.html'));
});

// Web series page
app.get('/web-series', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/web-series.html'));
});

// Movie detail page
app.get('/movie/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/movie-detail.html'));
});

// Web series detail page
app.get('/web-series/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/web-series-detail.html'));
});

// API Routes

// Get all movies
app.get('/api/movies', (req, res) => {
  const { page = 1, limit = 20, search = '', genre = '', year = '', sort = 'upload_date' } = req.query;
  const offset = (page - 1) * limit;
  
  let query = `SELECT * FROM movies WHERE type = 'movie'`;
  let params = [];
  
  if (search) {
    query += ` AND (title LIKE ? OR description LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }
  
  if (genre) {
    query += ` AND genres LIKE ?`;
    params.push(`%${genre}%`);
  }
  
  if (year) {
    query += ` AND year = ?`;
    params.push(year);
  }
  
  query += ` ORDER BY ${sort} DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error("Error fetching movies:", err);
      return res.status(500).json({ error: "Error fetching movies" });
    }
    
    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM movies WHERE type = 'movie'`;
    let countParams = [];
    
    if (search) {
      countQuery += ` AND (title LIKE ? OR description LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`);
    }
    
    if (genre) {
      countQuery += ` AND genres LIKE ?`;
      countParams.push(`%${genre}%`);
    }
    
    if (year) {
      countQuery += ` AND year = ?`;
      countParams.push(year);
    }
    
    db.get(countQuery, countParams, (err, countResult) => {
      if (err) {
        console.error("Error counting movies:", err);
        return res.status(500).json({ error: "Error counting movies" });
      }
      
      res.json({
        movies: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.total,
          pages: Math.ceil(countResult.total / limit)
        }
      });
    });
  });
});

// Get single movie
app.get('/api/movies/:id', (req, res) => {
  const { id } = req.params;
  
  db.get("SELECT * FROM movies WHERE id = ? AND type = 'movie'", [id], (err, row) => {
    if (err) {
      console.error("Error fetching movie:", err);
      return res.status(500).json({ error: "Error fetching movie" });
    }
    
    if (!row) {
      return res.status(404).json({ error: "Movie not found" });
    }
    
    // Parse download links
    if (row.download_links) {
      try {
        row.download_links = JSON.parse(row.download_links);
      } catch (e) {
        row.download_links = [];
      }
    }
    
    res.json(row);
  });
});

// Get all web series
app.get('/api/web-series', (req, res) => {
  const { page = 1, limit = 20, search = '', genre = '', sort = 'upload_date' } = req.query;
  const offset = (page - 1) * limit;
  
  let query = `SELECT * FROM web_series WHERE 1=1`;
  let params = [];
  
  if (search) {
    query += ` AND (title LIKE ? OR description LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }
  
  if (genre) {
    query += ` AND genres LIKE ?`;
    params.push(`%${genre}%`);
  }
  
  query += ` ORDER BY ${sort} DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error("Error fetching web series:", err);
      return res.status(500).json({ error: "Error fetching web series" });
    }
    
    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM web_series WHERE 1=1`;
    let countParams = [];
    
    if (search) {
      countQuery += ` AND (title LIKE ? OR description LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`);
    }
    
    if (genre) {
      countQuery += ` AND genres LIKE ?`;
      countParams.push(`%${genre}%`);
    }
    
    db.get(countQuery, countParams, (err, countResult) => {
      if (err) {
        console.error("Error counting web series:", err);
        return res.status(500).json({ error: "Error counting web series" });
      }
      
      res.json({
        series: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.total,
          pages: Math.ceil(countResult.total / limit)
        }
      });
    });
  });
});

// Get single web series
app.get('/api/web-series/:id', (req, res) => {
  const { id } = req.params;
  
  db.get("SELECT * FROM web_series WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error("Error fetching web series:", err);
      return res.status(500).json({ error: "Error fetching web series" });
    }
    
    if (!row) {
      return res.status(404).json({ error: "Web series not found" });
    }
    
    // Get episodes
    db.all("SELECT * FROM episodes WHERE series_id = ? ORDER BY season_number, episode_number", 
      [id], (err, episodes) => {
      if (err) {
        console.error("Error fetching episodes:", err);
        return res.status(500).json({ error: "Error fetching episodes" });
      }
      
      row.episodes = episodes;
      res.json(row);
    });
  });
});

// Get episodes for a series
app.get('/api/web-series/:id/episodes', (req, res) => {
  const { id } = req.params;
  const { season } = req.query;
  
  let query = "SELECT * FROM episodes WHERE series_id = ?";
  let params = [id];
  
  if (season) {
    query += " AND season_number = ?";
    params.push(parseInt(season));
  }
  
  query += " ORDER BY season_number, episode_number";
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error("Error fetching episodes:", err);
      return res.status(500).json({ error: "Error fetching episodes" });
    }
    
    res.json(rows);
  });
});

// Get settings
app.get('/api/settings', (req, res) => {
  db.all("SELECT key, value, description FROM settings", [], (err, rows) => {
    if (err) {
      console.error("Error fetching settings:", err);
      return res.status(500).json({ error: "Error fetching settings" });
    }
    
    const settings = {};
    rows.forEach(row => {
      settings[row.key] = {
        value: row.value,
        description: row.description
      };
    });
    
    res.json(settings);
  });
});

// Update settings
app.post('/api/settings', (req, res) => {
  if (!req.session || !req.session.loggedIn) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  const { key, value } = req.body;
  
  db.run("UPDATE settings SET value = ? WHERE key = ?", [value, key], function(err) {
    if (err) {
      console.error("Error updating settings:", err);
      return res.status(500).json({ error: "Error updating settings" });
    }
    
    res.json({ success: true, message: "Setting updated successfully" });
  });
});

// Admin authentication
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === config.admin.email && password === config.admin.password) {
    req.session.loggedIn = true;
    res.json({ success: true, message: "Login successful" });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

// Upload movie with TMDB integration
app.post('/api/upload', async (req, res) => {
  if (!req.session || !req.session.loggedIn) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  const { 
    title, 
    type = 'movie', 
    download_links = [], 
    trailer_url = '',
    poster_url = '',
    backdrop_url = ''
  } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }
  
  try {
    let movieData = {
      title,
      original_title: title,
      poster_url: poster_url || '',
      backdrop_url: backdrop_url || '',
      description: '',
      overview: '',
      release_date: '',
      year: null,
      runtime: null,
      genres: '',
      rating: null,
      vote_count: null,
      popularity: null,
      tagline: '',
      imdb_id: '',
      tmdb_id: null,
      download_links: JSON.stringify(download_links),
      trailer_url,
      type,
      status: 'published'
    };
    
    // Fetch TMDB data if API key is configured
    if (config.tmdb.apiKey && config.tmdb.apiKey !== "YOUR_TMDB_API_KEY") {
      try {
        const endpoint = type === 'movie' ? 'movie' : 'tv';
        const searchResponse = await axios.get(`${config.tmdb.baseUrl}/search/${endpoint}`, {
          params: {
            api_key: config.tmdb.apiKey,
            query: title
          }
        });
        
        if (searchResponse.data.results && searchResponse.data.results.length > 0) {
          const result = searchResponse.data.results[0];
          const detailResponse = await axios.get(`${config.tmdb.baseUrl}/${endpoint}/${result.id}`, {
            params: {
              api_key: config.tmdb.apiKey
            }
          });
          
          const data = detailResponse.data;
          
          movieData = {
            ...movieData,
            original_title: data.title || data.name || title,
            poster_url: data.poster_path ? `${config.tmdb.imageBaseUrl}${data.poster_path}` : poster_url || '',
            backdrop_url: data.backdrop_path ? `${config.tmdb.imageBaseUrl}${data.backdrop_path}` : backdrop_url || '',
            description: data.overview || '',
            overview: data.overview || '',
            release_date: data.release_date || data.first_air_date || '',
            year: data.release_date ? new Date(data.release_date).getFullYear() : 
                  data.first_air_date ? new Date(data.first_air_date).getFullYear() : null,
            runtime: data.runtime || data.episode_run_time?.[0] || null,
            genres: data.genres?.map(g => g.name).join(', ') || '',
            rating: data.vote_average || null,
            vote_count: data.vote_count || null,
            popularity: data.popularity || null,
            tagline: data.tagline || '',
            imdb_id: data.imdb_id || '',
            tmdb_id: data.id || null
          };
        }
      } catch (tmdbError) {
        console.error("TMDB API error:", tmdbError.message);
      }
    }
    
    // Insert into appropriate table
    const table = type === 'movie' ? 'movies' : 'web_series';
    const fields = Object.keys(movieData).join(', ');
    const placeholders = Object.keys(movieData).map(() => '?').join(', ');
    
    db.run(
      `INSERT INTO ${table} (${fields}) VALUES (${placeholders})`,
      Object.values(movieData),
      function(err) {
        if (err) {
          console.error("Database insertion error:", err);
          return res.status(500).json({ error: "Database insertion failed" });
        }
        
        // Send notification email
        sendUploadNotification(movieData.title, type);
        
        res.json({ 
          success: true,
          id: this.lastID, 
          message: `${type === 'movie' ? 'Movie' : 'Web series'} uploaded successfully`,
          data: movieData 
        });
      }
    );
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Delete movie/web series
app.delete('/api/:type/:id', (req, res) => {
  if (!req.session || !req.session.loggedIn) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  const { type, id } = req.params;
  const table = type === 'movies' ? 'movies' : 'web_series';
  
  db.run(`DELETE FROM ${table} WHERE id = ?`, [id], function(err) {
    if (err) {
      console.error("Delete error:", err);
      return res.status(500).json({ error: "Delete failed" });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: "Item not found" });
    }
    
    res.json({ success: true, message: "Item deleted successfully" });
  });
});

// Get genres
app.get('/api/genres', (req, res) => {
  const { type = 'movie' } = req.query;
  
  let query = type === 'movie' 
    ? "SELECT DISTINCT genres FROM movies WHERE genres IS NOT NULL AND genres != ''"
    : "SELECT DISTINCT genres FROM web_series WHERE genres IS NOT NULL AND genres != ''";
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error("Error fetching genres:", err);
      return res.status(500).json({ error: "Error fetching genres" });
    }
    
    const genres = new Set();
    rows.forEach(row => {
      if (row.genres) {
        row.genres.split(', ').forEach(genre => genres.add(genre));
      }
    });
    
    res.json(Array.from(genres).sort());
  });
});

// Get years
app.get('/api/years', (req, res) => {
  const { type = 'movie' } = req.query;
  
  let query = type === 'movie' 
    ? "SELECT DISTINCT year FROM movies WHERE year IS NOT NULL ORDER BY year DESC"
    : "SELECT DISTINCT year FROM web_series WHERE year IS NOT NULL ORDER BY year DESC";
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error("Error fetching years:", err);
      return res.status(500).json({ error: "Error fetching years" });
    }
    
    res.json(rows.map(row => row.year));
  });
});

// Check auth status
app.get('/api/auth-status', (req, res) => {
  res.json({ loggedIn: !!(req.session && req.session.loggedIn) });
});

// Logout
app.get('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Session destroy error:", err);
    }
    res.redirect('/admin/login');
  });
});

// Send notification email
function sendUploadNotification(title, type) {
  if (!config.features.enableEmailNotifications) return;
  
  if (!config.email.auth.pass || config.email.auth.pass === "YOUR_GMAIL_APP_PASSWORD") {
    console.log("Email not configured, skipping notification");
    return;
  }

  try {
    let transporter = nodemailer.createTransporter({
      service: config.email.service,
      auth: config.email.auth
    });

    let mailOptions = {
      from: config.email.auth.user,
      to: config.admin.email,
      subject: `New ${type === 'movie' ? 'Movie' : 'Web Series'} Uploaded - ${config.siteName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${config.themes.primary};">${config.siteName} - New Upload</h2>
          <p><strong>Title:</strong> ${title}</p>
          <p><strong>Type:</strong> ${type === 'movie' ? 'Movie' : 'Web Series'}</p>
          <p><strong>Upload Time:</strong> ${new Date().toLocaleString()}</p>
          <p>Visit your <a href="http://localhost:${PORT}/admin" style="color: ${config.themes.primary};">admin panel</a> to manage content.</p>
        </div>
      `
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Email notification error:", error);
      } else {
        console.log("Notification email sent:", info.response);
      }
    });
  } catch (error) {
    console.error("Email setup error:", error);
  }
}

// Error handling
app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, 'public/404.html'));
});

app.use((err, req, res, next) => {
  console.error("Global error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ShadowPlex server running on http://localhost:${PORT}`);
  console.log(`📱 Admin panel: http://localhost:${PORT}/admin`);
  console.log(`🎬 Public site: http://localhost:${PORT}`);
  console.log(`🎥 Movies: http://localhost:${PORT}/movies`);
  console.log(`📺 Web Series: http://localhost:${PORT}/web-series`);
});
