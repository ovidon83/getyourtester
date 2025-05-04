# GetYourTester

GetYourTester is a platform that connects product owners with testers. This MVP provides the basic functionality needed to start matching testers with products that need testing.

## Features

- User registration and authentication
- Product listing and management
- Tester profiles and matching
- Feedback collection and reporting

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/getyourtester.git
   cd getyourtester
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on the `.env.example` template:
   ```
   cp .env.example .env
   ```

4. Edit the `.env` file and add your configuration values.

### Running the Application

Start the development server:
```
npm run dev
```

For production:
```
npm start
```

## Project Structure

- `app.js` - Express application setup
- `index.js` - Server entry point
- `routes/` - Application route handlers
- `views/` - EJS templates
- `public/` - Static assets
- `models/` - Data models (for future use)
- `controllers/` - Route controllers (for future use)
- `middlewares/` - Custom middleware functions (for future use)

## License

This project is licensed under the MIT License. 