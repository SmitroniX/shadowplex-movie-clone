# ShadowPlex - Movie Website Clone

A complete movie download website clone with admin panel, auto metadata fetching, and email notifications. This is a rebranded version of UHDMovies with enhanced features.

## Features

### Public Website
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Movie Grid**: Clean 2-column layout with movie posters and details
- **Search Functionality**: Real-time search across movie titles and descriptions
- **Modern UI**: Clean, professional design with smooth animations
- **Pagination**: Efficient navigation through movie collections

### Admin Panel
- **Secure Login**: Admin-only access with session management
- **Dashboard**: Real-time statistics and recent activity
- **Movie Management**: Add, view, and delete movies
- **Auto Metadata**: Automatic movie data fetching from TMDB API
- **Email Notifications**: Instant email alerts on new uploads
- **Responsive Admin**: Works on all device sizes

## Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: SQLite (lightweight, no setup required)
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **API Integration**: TMDB API for movie metadata
- **Email Service**: Nodemailer with Gmail SMTP
- **Styling**: Modern CSS with Flexbox and Grid

## Quick Start

### 1. Installation
```bash
npm install
```

### 2. Configuration
Edit `config/config.js`:
- **TMDB API Key**: Get your free API key from https://www.themoviedb.org/settings/api
- **Gmail App Password**: Set up Gmail app-specific password for email notifications

### 3. Start the Server
```bash
npm start
```

### 4. Access the Website
- **Public Site**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin
- **Admin Login**: http://localhost:8000/admin/login

## Admin Credentials
- **Email**: 1234@gmail.com
- **Password**: 12345678

## API Endpoints

### Public Endpoints
- `GET /` - Main website
- `GET /api/movies` - Get all movies (JSON)

### Admin Endpoints
- `GET /admin` - Admin dashboard (requires login)
- `GET /admin/login` - Admin login page
- `POST /api/login` - Admin authentication
- `POST /api/upload` - Upload new movie with auto metadata
- `DELETE /api/movies/:id` - Delete movie
- `GET /api/auth-status` - Check login status
- `GET /api/logout` - Logout admin

## File Structure

```
ShadowPlex/
├── package.json              # Dependencies and scripts
├── server.js                 # Main Express server
├── config/
│   └── config.js            # Configuration settings
├── data/
│   └── database.sqlite      # SQLite database (auto-created)
├── public/                  # Public website files
│   ├── index.html          # Main website
│   ├── styles.css          # Public site styling
│   └── script.js           # Public site JavaScript
├── admin/                   # Admin panel files
│   ├── index.html          # Admin dashboard
│   ├── login.html          # Admin login
│   ├── admin.css           # Admin styling
│   └── admin.js            # Admin JavaScript
└── README.md               # This file
```

## Features in Detail

### Auto Metadata Fetching
When uploading a movie, the system automatically:
- Fetches movie details from TMDB API
- Retrieves poster images, descriptions, ratings
- Populates genre, release year, and other metadata
- Uses TMDB poster if no custom URL provided

### Email Notifications
- Instant email alerts to admin on new uploads
- Includes movie title, description, and upload time
- Configurable email settings

### Responsive Design
- Mobile-first approach
- Touch-friendly navigation
- Optimized for all screen sizes
- Smooth animations and transitions

### Security Features
- Session-based authentication
- Admin-only access to sensitive endpoints
- Input validation and sanitization
- Secure password handling

## Customization

### Changing Site Name
Edit `config/config.js` and update the `siteName` property.

### Adding New Categories
Modify the navigation in `public/index.html` and update the CSS accordingly.

### Styling Changes
- Public site: Edit `public/styles.css`
- Admin panel: Edit `admin/admin.css`

### Database Schema
The SQLite database includes:
- `movies` table with comprehensive movie information
- Auto-incrementing IDs
- Timestamps for tracking uploads

## Troubleshooting

### Common Issues

1. **Server won't start**
   - Check if port 8000 is available
   - Verify all dependencies are installed: `npm install`

2. **Admin login fails**
   - Ensure credentials match exactly: 123456@gmail.com / 12345678
   - Check server logs for errors

3. **No movies showing**
   - Upload movies via admin panel
   - Check database connection

4. **Email notifications not working**
   - Configure Gmail app password in `config/config.js`
   - Ensure Gmail SMTP settings are correct

5. **TMDB metadata not fetching**
   - Add valid TMDB API key in `config/config.js`
   - Check internet connectivity

## Development

### Adding Features
- New endpoints can be added in `server.js`
- Frontend modifications in respective HTML/CSS/JS files
- Database schema changes in server initialization

### Testing
- Use curl or Postman for API testing
- Browser dev tools for frontend debugging
- Check server console for error logs

## Production Deployment

### Environment Variables
Set these environment variables for production:
- `NODE_ENV=production`
- `PORT=your_port_number`

### Security Recommendations
- Use HTTPS in production
- Implement rate limiting
- Add CSRF protection
- Use environment variables for sensitive data
- Regular security updates

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review server logs
3. Verify configuration settings
4. Ensure all dependencies are up to date

## License

MIT License - Feel free to use and modify as needed.
