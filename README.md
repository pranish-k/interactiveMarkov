# Interactive Markov Market Analysis Web Application

## Overview
An interactive Flask-based web application for demonstrating Markov chain analysis of S&P 500 market behavior (2015-2024). Created for conference presentations to provide an experiential learning platform for understanding market dynamics through Markov models.

**Key Finding**: Markets exhibit the Markov property (one-week memory) but fail time homogeneity (unstable transition rules), making them unpredictable despite being memoryless.

## Features

### 1. Live Parameter Explorer
- Adjust bull/bear market thresholds dynamically
- Real-time transition matrix updates
- Chi-square test results visualization
- Stationary distribution calculations

### 2. Market Prediction Game
- 20-round prediction challenge
- Compare your predictions against Markov model
- Score tracking (Player vs Model vs Random)
- Educational insights on prediction challenges

### 3. Time Period Comparison
- Visual comparison of 4 distinct market periods
- Transition probability analysis across time
- Evidence of time homogeneity failure
- Major market events correlation

### 4. Admin Panel
- Conference presenter dashboard
- Real-time session statistics
- Active user monitoring

## Installation

### Prerequisites
- Python 3.7 or higher
- pip package manager

### Setup Instructions

1. **Clone the repository**
```bash
git clone https://github.com/pranish-k/interactiveMarkov.git
cd interactiveMarkov
```

2. **Create a virtual environment (recommended)**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Run the application**
```bash
python app.py
```

5. **Access the application**
- Local: http://localhost:5001
- Network: http://[your-ip]:5001
- Admin Panel: http://localhost:5001/admin (password: markov2024)

## Usage

### For Individual Use
1. Start the application using `python app.py`
2. Open your browser and navigate to http://localhost:5001
3. Explore the three main features from the landing page

### For Conference Presentation
1. Start the application on your laptop
2. Ensure all devices are on the same WiFi network
3. Share the network URL (displayed on startup) with participants
4. Use the admin panel to monitor activity

### Network Sharing
- The application displays your local IP on startup
- Participants can access via: `http://[your-ip]:5001`
- Supports multiple simultaneous users

## Project Structure
```
interactiveMarkov/
├── app.py                    # Main Flask application
├── markov_analysis.py        # Markov analysis implementation
├── requirements.txt          # Python dependencies
├── README.md                 # Documentation
├── github.txt               # GitHub repository info
├── static/
│   ├── css/
│   │   └── styles.css       # Application styling
│   ├── js/
│   │   ├── explorer.js      # Parameter explorer logic
│   │   ├── game.js          # Prediction game logic
│   │   └── periods.js       # Period comparison logic
│   └── images/
├── templates/
│   ├── base.html            # Base template
│   ├── index.html           # Landing page
│   ├── explorer.html        # Parameter explorer
│   ├── game.html            # Prediction game
│   ├── periods.html         # Time period comparison
│   ├── admin.html           # Admin panel
│   ├── 404.html             # 404 error page
│   └── 500.html             # 500 error page
└── data/
    └── (cached S&P 500 data)
```

## API Endpoints

### Analysis Endpoints
- `GET /` - Landing page
- `GET /explorer` - Parameter explorer interface
- `GET /game` - Prediction game interface
- `GET /periods` - Time period comparison

### Data Endpoints
- `POST /api/analyze` - Analyze with custom thresholds
  - Body: `{bull_threshold: float, bear_threshold: float}`
- `GET /api/game/scenario` - Get random game scenario
- `POST /api/game/predict` - Submit prediction
  - Body: `{scenario_id: int, prediction: string}`
- `GET /api/periods` - Get period comparison data
- `GET /api/base_analysis` - Get base analysis results
- `GET /api/stats` - Get current statistics

## Configuration

### Changing Port
Edit line 335 in `app.py`:
```python
app.run(debug=True, host='0.0.0.0', port=5001)  # Change port number here
```

### Admin Password
Default: `markov2024`
To change, edit line 75 in `app.py`

### Data Range
Default: 2015-01-01 to 2024-10-19
To change, edit line 28 in `app.py`

## Troubleshooting

### Port Already in Use
- On macOS: Disable AirPlay Receiver in System Settings
- Or change the port in app.py (default is 5001)

### Data Not Loading
- Check internet connection (requires yfinance API access)
- Verify date range is valid
- Check if Yahoo Finance is accessible

### Browser Compatibility
- Chrome (recommended)
- Firefox
- Safari
- Edge

## Testing Checklist
- [x] All routes return 200 status
- [x] Parameter changes update correctly
- [x] Game tracks scores accurately
- [x] Charts render properly
- [x] Works on Chrome, Firefox, Safari
- [x] Responsive on tablet (768px width)
- [x] Multiple users can connect simultaneously
- [x] No crashes after 100 game rounds

## Academic Context

### Research Details
- **Author**: Pranish Khanal
- **Faculty Sponsor**: Prof. Kenneth McMurdy
- **Institution**: Ramapo College
- **Analysis Period**: S&P 500 (2015-2024)
- **Key Methods**: Markov chains, Chi-square tests, Time homogeneity analysis

### Educational Goals
1. Demonstrate Markov property in financial markets
2. Show limitations of probabilistic predictions
3. Illustrate time-varying market dynamics
4. Provide hands-on learning experience

## Performance Notes
- Initial load: ~2-3 seconds (fetches market data)
- Parameter updates: < 1 second
- Game rounds: Instant response
- Supports 10+ simultaneous users

## Browser Requirements
- JavaScript enabled
- Modern browser (2020+)
- Screen resolution: 768px minimum width

## Development

### Technologies Used
- **Backend**: Flask (Python)
- **Frontend**: HTML5, CSS3, JavaScript
- **Visualization**: Chart.js
- **Data Source**: Yahoo Finance API (yfinance)
- **Analysis**: NumPy, Pandas, SciPy

### Future Enhancements
- [ ] Data export functionality
- [ ] Extended date range selection
- [ ] Additional market indices
- [ ] Monte Carlo simulations
- [ ] Dark mode theme

## License
Educational use - Created for academic conference presentation

## Contact
For questions or issues, please contact:
- Pranish Khanal (Research Author)
- Prof. Kenneth McMurdy (Faculty Sponsor)
- Ramapo College

## Acknowledgments
- Yahoo Finance for market data
- Conference attendees for feedback
- Ramapo College for research support

---

**Note**: This is a development/educational tool. Do not use for actual trading decisions.