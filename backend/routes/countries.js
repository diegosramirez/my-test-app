const express = require('express');
const router = express.Router();
const countries = require('../data/countries');

// Input validation helper
function validateCountryId(id) {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: 'ID is required and must be a string' };
  }

  // Check for malformed IDs (special characters, extremely long strings)
  if (id.length > 50) {
    return { valid: false, error: 'Country ID is too long' };
  }

  if (!/^[a-zA-Z0-9-_]+$/.test(id)) {
    return { valid: false, error: 'Country ID contains invalid characters' };
  }

  return { valid: true };
}

// GET /api/countries - Returns all countries
router.get('/', (req, res) => {
  const startTime = Date.now();

  try {
    const responseTime = Date.now() - startTime;

    // Log analytics event (as specified in tracking requirements)
    console.log(`api_countries_list_requested: response_time=${responseTime}ms, status_code=200`);

    res.json({
      countries: countries,
      count: countries.length,
      response_time: responseTime
    });
  } catch (error) {
    console.error('Error fetching countries list:', error);
    res.status(500).json({
      error: 'Failed to retrieve countries',
      code: 500
    });
  }
});

// GET /api/countries/:id - Returns single country by ID
router.get('/:id', (req, res) => {
  const startTime = Date.now();
  const countryId = req.params.id;

  try {
    // Validate country ID
    const validation = validateCountryId(countryId);
    if (!validation.valid) {
      const responseTime = Date.now() - startTime;
      console.log(`api_country_detail_requested: country_id=${countryId}, response_time=${responseTime}ms, status_code=400`);
      console.log(`api_error_occurred: endpoint=/api/countries/${countryId}, error_type=validation, status_code=400`);

      return res.status(400).json({
        error: validation.error,
        code: 400
      });
    }

    // Find country by ID (case-insensitive)
    const country = countries.find(c => c.id.toLowerCase() === countryId.toLowerCase());

    const responseTime = Date.now() - startTime;

    if (!country) {
      console.log(`api_country_detail_requested: country_id=${countryId}, response_time=${responseTime}ms, status_code=404`);
      console.log(`api_error_occurred: endpoint=/api/countries/${countryId}, error_type=not_found, status_code=404`);

      return res.status(404).json({
        error: 'Country not found',
        code: 404
      });
    }

    // Log successful request
    console.log(`api_country_detail_requested: country_id=${countryId}, response_time=${responseTime}ms, status_code=200`);

    res.json({
      country: country,
      response_time: responseTime
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Error fetching country detail:', error);
    console.log(`api_error_occurred: endpoint=/api/countries/${countryId}, error_type=server_error, status_code=500`);

    res.status(500).json({
      error: 'Internal Server Error',
      code: 500
    });
  }
});

module.exports = router;