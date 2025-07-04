// Script to create test appointments for testing the sync functionality
const { google } = require('googleapis');

async function createTestAppointments() {
  const tenantId = '6ba7e225-acc9-4e3c-8c99-840c2812c0df';
  const calendarId = 'c_c39acbc1dd48e5c056d4cd18e8b4b558ffb6a4eedd5ffa4181cdfca68bca16a0@group.calendar.google.com';
  
  // You'll need to get the access token from the database
  console.log('This script needs to be run with proper OAuth credentials');
  console.log('Creating test appointments for tenant:', tenantId);
  console.log('Calendar ID:', calendarId);
}

module.exports = { createTestAppointments };