require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;
const RAPIDSHYP_API_KEY = process.env.RAPIDSHYP_API_KEY;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Validate API Key on startup
if (!RAPIDSHYP_API_KEY) {
  console.error('ERROR: RAPIDSHYP_API_KEY is not set in environment variables');
  process.exit(1);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'RapidShyp API server is running' });
});

// Main pincode serviceability check endpoint
app.post('/api/rapidshyp/check', async (req, res) => {
  try {
    const { pincode, weight, pickup_pincode, order_value } = req.body;

    // Validate required fields
    if (!pincode) {
      return res.status(400).json({
        success: false,
        message: 'Pincode is required'
      });
    }

    if (!weight) {
      return res.status(400).json({
        success: false,
        message: 'Weight (in kg) is required'
      });
    }

    if (!pickup_pincode) {
      return res.status(400).json({
        success: false,
        message: 'Pickup pincode is required'
      });
    }

    // Prepare RapidShyp API request
    const payload = {
      to_pincode: parseInt(pincode),
      from_pincode: parseInt(pickup_pincode),
      weight: parseFloat(weight),
      cod: order_value || 0
    };

    console.log('[RapidShyp API] Sending request with payload:', payload);

    // Call RapidShyp API
    const response = await axios.post(
      'https://apiv2.rapidshyp.com/v1/serviceability/check',
      payload,
      {
        headers: {
          'Authorization': `Token ${RAPIDSHYP_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('[RapidShyp API] Response received:', response.status);

    // Return successful response
    return res.json({
      success: true,
      data: response.data,
      message: 'Serviceability check completed'
    });

  } catch (error) {
    console.error('[RapidShyp API] Error:', error.response?.data || error.message);

    // Handle specific error cases
    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid RapidShyp API key'
      });
    }

    if (error.response?.status === 400) {
      return res.status(400).json({
        success: false,
        message: 'Bad request to RapidShyp API',
        details: error.response.data
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 RapidShyp Pincode Checker API running on http://localhost:${PORT}`);
  console.log(`📍 Endpoint: POST http://localhost:${PORT}/api/rapidshyp/check`);
  console.log(`🏥 Health check: GET http://localhost:${PORT}/health`);
});
