const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const PRODUCTS_FILE = path.join(__dirname, 'products.json');

// Middleware
app.use(express.json());

// Helper function to read products from file
const readProductsFromFile = () => {
  try {
    if (!fs.existsSync(PRODUCTS_FILE)) {
      // Create empty products file if it doesn't exist
      fs.writeFileSync(PRODUCTS_FILE, JSON.stringify([]));
      return [];
    }
    const data = fs.readFileSync(PRODUCTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading products file:', error.message);
    return [];
  }
};

// Helper function to write products to file
const writeProductsToFile = (products) => {
  try {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing to products file:', error.message);
    return false;
  }
};

// Helper function to get next available ID
const getNextId = (products) => {
  if (products.length === 0) return 1;
  return Math.max(...products.map(p => p.id)) + 1;
};

// Helper function to validate product data
const validateProduct = (product) => {
  const errors = [];
  
  if (!product.name || typeof product.name !== 'string' || product.name.trim() === '') {
    errors.push('Name is required and must be a non-empty string');
  }
  
  if (product.price === undefined || product.price === null || typeof product.price !== 'number' || product.price < 0) {
    errors.push('Price is required and must be a non-negative number');
  }
  
  if (product.inStock !== undefined && typeof product.inStock !== 'boolean') {
    errors.push('inStock must be a boolean value');
  }
  
  return errors;
};

// GET /products - Return all products
app.get('/products', (req, res) => {
  try {
    const products = readProductsFromFile();
    res.json(products);
  } catch (error) {
    res.status(500).json({ 
      error: 'Internal server error', 
      message: 'Failed to retrieve products' 
    });
  }
});

// GET /products/instock - Return only products in stock (Bonus)
app.get('/products/instock', (req, res) => {
  try {
    const products = readProductsFromFile();
    const inStockProducts = products.filter(product => product.inStock === true);
    res.json(inStockProducts);
  } catch (error) {
    res.status(500).json({ 
      error: 'Internal server error', 
      message: 'Failed to retrieve in-stock products' 
    });
  }
});

// POST /products - Create a new product
app.post('/products', (req, res) => {
  try {
    const products = readProductsFromFile();
    
    // Validate input
    const validationErrors = validateProduct(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid product data', 
        details: validationErrors 
      });
    }
    
    // Create new product
    const newProduct = {
      id: getNextId(products),
      name: req.body.name.trim(),
      price: req.body.price,
      inStock: req.body.inStock !== undefined ? req.body.inStock : true
    };
    
    products.push(newProduct);
    
    // Save to file
    const saved = writeProductsToFile(products);
    if (!saved) {
      return res.status(500).json({ 
        error: 'Internal server error', 
        message: 'Failed to save product' 
      });
    }
    
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ 
      error: 'Internal server error', 
      message: 'Failed to create product' 
    });
  }
});

// PUT /products/:id - Update an existing product
app.put('/products/:id', (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    
    if (isNaN(productId)) {
      return res.status(400).json({ 
        error: 'Invalid ID', 
        message: 'Product ID must be a valid number' 
      });
    }
    
    const products = readProductsFromFile();
    const productIndex = products.findIndex(p => p.id === productId);
    
    if (productIndex === -1) {
      return res.status(404).json({ 
        error: 'Product not found', 
        message: `Product with ID ${productId} does not exist` 
      });
    }
    
    // Validate input (allow partial updates)
    const updateData = {};
    
    if (req.body.name !== undefined) {
      if (typeof req.body.name !== 'string' || req.body.name.trim() === '') {
        return res.status(400).json({ 
          error: 'Invalid data', 
          message: 'Name must be a non-empty string' 
        });
      }
      updateData.name = req.body.name.trim();
    }
    
    if (req.body.price !== undefined) {
      if (typeof req.body.price !== 'number' || req.body.price < 0) {
        return res.status(400).json({ 
          error: 'Invalid data', 
          message: 'Price must be a non-negative number' 
        });
      }
      updateData.price = req.body.price;
    }
    
    if (req.body.inStock !== undefined) {
      if (typeof req.body.inStock !== 'boolean') {
        return res.status(400).json({ 
          error: 'Invalid data', 
          message: 'inStock must be a boolean value' 
        });
      }
      updateData.inStock = req.body.inStock;
    }
    
    // Update product
    products[productIndex] = { ...products[productIndex], ...updateData };
    
    // Save to file
    const saved = writeProductsToFile(products);
    if (!saved) {
      return res.status(500).json({ 
        error: 'Internal server error', 
        message: 'Failed to update product' 
      });
    }
    
    res.json(products[productIndex]);
  } catch (error) {
    res.status(500).json({ 
      error: 'Internal server error', 
      message: 'Failed to update product' 
    });
  }
});

// DELETE /products/:id - Delete a product
app.delete('/products/:id', (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    
    if (isNaN(productId)) {
      return res.status(400).json({ 
        error: 'Invalid ID', 
        message: 'Product ID must be a valid number' 
      });
    }
    
    const products = readProductsFromFile();
    const productIndex = products.findIndex(p => p.id === productId);
    
    if (productIndex === -1) {
      return res.status(404).json({ 
        error: 'Product not found', 
        message: `Product with ID ${productId} does not exist` 
      });
    }
    
    // Remove product
    const deletedProduct = products.splice(productIndex, 1)[0];
    
    // Save to file
    const saved = writeProductsToFile(products);
    if (!saved) {
      return res.status(500).json({ 
        error: 'Internal server error', 
        message: 'Failed to delete product' 
      });
    }
    
    res.json({ 
      success: true, 
      message: `Product '${deletedProduct.name}' with ID ${productId} has been deleted successfully`,
      deletedProduct: deletedProduct
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Internal server error', 
      message: 'Failed to delete product' 
    });
  }
});

// Error handling middleware for invalid JSON
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ 
      error: 'Invalid JSON', 
      message: 'Request body contains invalid JSON' 
    });
  }
  next();
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found', 
    message: `The route ${req.method} ${req.originalUrl} does not exist` 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Product Inventory API server is running on port ${PORT}`);
  console.log(`Available endpoints:`);
  console.log(`  GET    http://localhost:${PORT}/products`);
  console.log(`  GET    http://localhost:${PORT}/products/instock`);
  console.log(`  POST   http://localhost:${PORT}/products`);
  console.log(`  PUT    http://localhost:${PORT}/products/:id`);
  console.log(`  DELETE http://localhost:${PORT}/products/:id`);
});

module.exports = app;