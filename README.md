# GetYourTester

> Expert manual testing directly in your GitHub PRs.

GetYourTester is a GitHub app that allows developers to request manual testing on their pull requests. This MVP implementation provides a simplified interface to demonstrate the core functionality.

## Features

- 🚀 **Simple Integration**: Request testing with a single comment
- 📊 **Admin Dashboard**: Manage test requests, update statuses, and submit reports
- 🏷️ **Status Tracking**: Monitor the progress of test requests
- 💬 **Detailed Reports**: Provide comprehensive test feedback

## Tech Stack

- Node.js/Express
- EJS templates
- Bootstrap 5
- JSON file storage (no database required)

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/getyourtester.git
cd getyourtester
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:

```
# Server Settings
PORT=3000
NODE_ENV=development

# Session Secret
SESSION_SECRET=your-secret-session-key

# Admin Login Credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=password
```

4. Start the development server:

```bash
npm run dev
```

5. Visit http://localhost:3000 to see the application

### Project Structure

```
/
├── src/                  # Source code
│   ├── app.js            # Main application entry point
│   ├── data/             # JSON data storage
│   ├── public/           # Static assets
│   │   ├── css/          # CSS files
│   │   ├── js/           # JavaScript files
│   │   └── img/          # Image files
│   ├── routes/           # Express routes
│   ├── utils/            # Utility functions
│   └── views/            # EJS templates
│       ├── admin/        # Admin views
│       └── partials/     # Reusable template parts
├── package.json          # Project dependencies
└── README.md             # Project documentation
```

## Usage

### For Developers

1. Install the GetYourTester GitHub App on your repositories
2. Create a pull request
3. Comment `/test` on the PR to request testing
4. When testing is complete, you'll receive detailed feedback

### For Admins

1. Log in to the admin dashboard at `/admin/login` with your admin credentials
2. View all test requests in the dashboard
3. Click on a request to view details
4. Update the request status and submit test reports

## License

This project is licensed under the ISC License. 